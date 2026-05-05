import { NextResponse } from "next/server";

const SLACK_BOT_TOKEN = process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (!SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: "Slack token no configurado" }, { status: 500 });
  }

  try {
    if (action === "list-channels") {
      const response = await fetch("https://slack.com/api/conversations.list", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          types: "public_channel,private_channel",
          limit: 200,
          exclude_archived: true,
        }),
      });

      const data = await response.json();
      return NextResponse.json(data);
    }

    if (action === "channel-history") {
      const channelId = searchParams.get("channelId");
      const oldest = searchParams.get("oldest");
      const latest = searchParams.get("latest");

      if (!channelId) {
        return NextResponse.json({ error: "channelId requerido" }, { status: 400 });
      }

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