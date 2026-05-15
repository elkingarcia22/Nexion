import { NextResponse } from "next/server";

const SLACK_BOT_TOKEN = process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN;

async function checkUserInChannel(channelId: string, userId: string, botToken: string): Promise<boolean> {
  let cursor: string | undefined;
  let pagesChecked = 0;

  while (pagesChecked < 2) {
    const body: Record<string, any> = { channel: channelId, limit: 1000 };
    if (cursor) body.cursor = cursor;

    const res = await fetch("https://slack.com/api/conversations.members", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!data.ok) return false;
    if (data.members?.includes(userId)) return true;

    cursor = data.response_metadata?.next_cursor;
    pagesChecked++;
    if (!cursor) break;
  }
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (!SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: "Slack token no configurado" }, { status: 500 });
  }

  try {
    if (action === "my-channels") {
      const userEmail = searchParams.get("userEmail");

      const response = await fetch("https://slack.com/api/users.conversations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          types: "public_channel",
          limit: 200,
          exclude_archived: true,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        console.error(`[API slack/my-channels] Slack API error:`, data.error);
        return NextResponse.json(data);
      }

      let channels = data.channels || [];

      if (userEmail && channels.length > 0) {
        let userId: string | null = null;
        try {
          const lookupRes = await fetch("https://slack.com/api/users.lookupByEmail", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: userEmail }),
          });
          const lookupData = await lookupRes.json();
          if (lookupData.ok && lookupData.user?.id) {
            userId = lookupData.user.id;
          }
        } catch {}

        if (userId) {
          const CONCURRENCY = 5;
          const memberSet = new Set<string>();

          for (let i = 0; i < channels.length; i += CONCURRENCY) {
            const batch = channels.slice(i, i + CONCURRENCY);
            const results = await Promise.allSettled(
              batch.map(async (ch: any) => {
                const isMember = await checkUserInChannel(ch.id, userId, SLACK_BOT_TOKEN!);
                return { id: ch.id, isMember };
              })
            );
            results.forEach((r) => {
              if (r.status === "fulfilled" && r.value.isMember) {
                memberSet.add(r.value.id);
              }
            });
          }

          channels = channels.filter((ch: any) => memberSet.has(ch.id));
        }
      }

      return NextResponse.json({ ok: true, channels });
    }

    if (action === "private-channel-info") {
      const channelId = searchParams.get("channelId");
      if (!channelId) {
        return NextResponse.json({ error: "channelId requerido" }, { status: 400 });
      }

      const response = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      });
      const data = await response.json();

      return NextResponse.json(data);
    }

    if (action === "check-channel-membership") {
      const channelId = searchParams.get("channelId");
      const userEmail = searchParams.get("userEmail");

      if (!channelId || !userEmail) {
        return NextResponse.json({ ok: false, error: "channelId y userEmail requeridos" }, { status: 400 });
      }

      try {
        const lookupRes = await fetch("https://slack.com/api/users.lookupByEmail", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: userEmail }),
        });
        const lookupData = await lookupRes.json();

        if (!lookupData.ok) {
          // Email lookup failed (likely missing users:read.email scope) — can't verify, show channel
          return NextResponse.json({ ok: true, isMember: true, lookupFailed: true, slackError: lookupData.error });
        }

        const userId = lookupData.user?.id;
        if (!userId) {
          return NextResponse.json({ ok: true, isMember: true, lookupFailed: true });
        }

        const isMember = await checkUserInChannel(channelId, userId, SLACK_BOT_TOKEN!);
        return NextResponse.json({ ok: true, isMember });
      } catch (err) {
        return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error desconocido" }, { status: 500 });
      }
    }

    if (action === "channel-history") {
      const channelId = searchParams.get("channelId");
      const oldest = searchParams.get("oldest");
      const latest = searchParams.get("latest");

      if (!channelId) {
        return NextResponse.json({ error: "channelId requerido" }, { status: 400 });
      }

      let allMessages: any[] = [];
      let cursor: string | undefined = undefined;
      let pageNum = 0;

      console.log(`[API slack/channel-history] Fetching for channel=${channelId} oldest=${oldest} latest=${latest}`);

      do {
        pageNum++;
        const body: Record<string, any> = {
          channel: channelId,
          oldest: oldest || "0",
          latest: latest || Math.floor(Date.now() / 1000).toString(),
          limit: 200,
        };
        if (cursor) body.cursor = cursor;

        const response = await fetch("https://slack.com/api/conversations.history", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log(`[API slack/channel-history] ${channelId} page ${pageNum}: ok=${data.ok} messages=${data.messages?.length || 0} has_more=${data.has_more}`);

        if (!data.ok) {
          if (data.error === "ratelimited" && allMessages.length > 0) {
            console.warn("[API slack/channel-history] Rate limited, returning partial messages");
            break;
          }
          return NextResponse.json(data);
        }

        if (data.messages) {
          allMessages = allMessages.concat(data.messages);
        }

        cursor = data.response_metadata?.next_cursor;
      } while (cursor);

      console.log(`[API slack/channel-history] ${channelId}: ${allMessages.length} total messages in ${pageNum} pages`);
      return NextResponse.json({ ok: true, messages: allMessages });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (!SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: "Slack token no configurado" }, { status: 500 });
  }

  try {
    if (action === "join-channel") {
      const body = await request.json();
      const channelId = body.channelId;

      if (!channelId) {
        return NextResponse.json({ error: "channelId requerido" }, { status: 400 });
      }

      console.log(`[API slack/join-channel] Joining channel ${channelId}...`);

      const response = await fetch("https://slack.com/api/conversations.join", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel: channelId }),
      });

      const data = await response.json();
      console.log(`[API slack/join-channel] ok=${data.ok} error=${data.error || "none"}`);

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}