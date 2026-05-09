import { NextResponse } from "next/server";

const SLACK_BOT_TOKEN = process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (!SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: "Slack token no configurado" }, { status: 500 });
  }

  try {
    if (action === "my-channels") {
      let allChannels: any[] = [];
      let cursor: string | undefined = undefined;
      let pageNum = 0;

      console.log("[API slack/my-channels] Starting users.conversations pagination...");

      do {
        pageNum++;
        const body: Record<string, any> = {
          types: "public_channel,private_channel",
          limit: 200,
          exclude_archived: true,
        };
        if (cursor) body.cursor = cursor;

        const response = await fetch("https://slack.com/api/users.conversations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log(`[API slack/my-channels] Page ${pageNum} ok=${data.ok} has_cursor=${!!data.response_metadata?.next_cursor} channels_in_page=${data.channels?.length}`);

        if (!data.ok) {
          console.error(`[API slack/my-channels] Slack API error on page ${pageNum}:`, data.error);
          return NextResponse.json(data);
        }

        if (data.channels) {
          for (const ch of data.channels) {
            console.log(`[API slack/my-channels] Page ${pageNum} channel: #${ch.name} id=${ch.id} is_member=${ch.is_member} is_group=${ch.is_group} is_channel=${ch.is_channel} num_members=${ch.num_members}`);
          }
          allChannels = allChannels.concat(data.channels);
        }

        cursor = data.response_metadata?.next_cursor;
      } while (cursor);

      console.log(`[API slack/my-channels] Total raw channels from API (all pages): ${allChannels.length}`);

      return NextResponse.json({
        ok: true,
        channels: allChannels,
      });
    }

    if (action === "channel-history") {
      const channelId = searchParams.get("channelId");
      const oldest = searchParams.get("oldest");
      const latest = searchParams.get("latest");

      if (!channelId) {
        return NextResponse.json({ error: "channelId requerido" }, { status: 400 });
      }

      console.log(`[API slack/channel-history] Fetching history for channel=${channelId} oldest=${oldest} latest=${latest}`);

      const response = await fetch("https://slack.com/api/conversations.history", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: channelId,
          oldest: oldest || "0",
          latest: latest || Math.floor(Date.now() / 1000).toString(),
          limit: 50,
        }),
      });

      const data = await response.json();
      console.log(`[API slack/channel-history] ${channelId} ok=${data.ok} has_more=${data.has_more} messages=${data.messages?.length || 0} error=${data.error || "none"}`);

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