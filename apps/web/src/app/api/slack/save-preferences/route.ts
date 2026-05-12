import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { workspaceId, channels } = await request.json();

    if (!workspaceId || !channels || !Array.isArray(channels)) {
      return NextResponse.json({ error: "workspaceId y channels requeridos" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: { channel_id: string; success: boolean; error?: string }[] = [];

    for (const ch of channels) {
      const { channel_id, channel_name, is_private, enabled } = ch;

      if (!channel_id) {
        results.push({ channel_id: channel_id || "unknown", success: false, error: "channel_id requerido" });
        continue;
      }

      const { error } = await supabase.from("app_slack_channels").upsert({
        workspace_id: workspaceId,
        channel_id,
        channel_name: channel_name || "unknown",
        is_private: is_private ?? false,
        enabled: enabled ?? true,
      }, { onConflict: "workspace_id,channel_id" });

      if (error) {
        results.push({ channel_id, success: false, error: error.message });
      } else {
        results.push({ channel_id, success: true });
      }
    }

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      return NextResponse.json({
        success: true,
        saved: results.filter(r => r.success).length,
        failed: failed,
        total: channels.length,
      });
    }

    return NextResponse.json({
      success: true,
      saved: channels.length,
      total: channels.length,
    });
  } catch (err) {
    console.error("[save-preferences] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
