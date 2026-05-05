import { supabase } from "@/lib/supabase";

const API_BASE = typeof window !== "undefined" 
  ? `${window.location.origin}/api/slack`
  : "";

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_mpim: boolean;
  num_members: number;
}

interface SlackMessage {
  type: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
}

export async function getSlackChannelsWithActivity(): Promise<{ success: boolean; data?: SlackChannel[]; error?: string }> {
  if (!API_BASE) {
    return { success: false, error: "API no disponible" };
  }

  try {
    const response = await fetch(`${API_BASE}?action=list-channels`);
    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.error || "Error de Slack" };
    }

    const channels = data.channels as SlackChannel[];
    // Include all channels, not just where bot is member
    const allChannels = channels;
    
    return { success: true, data: allChannels }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function getSlackDMsWithActivity(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  if (!API_BASE) {
    return { success: false, error: "API no disponible" };
  }

  try {
    const response = await fetch(`${API_BASE}?action=list-channels&types=im`);
    const data = await response.json();
    
    if (!data.ok) {
      return { success: false, error: data.error || "Error de Slack" };
    }

    const dms = data.channels || [];
    console.log("[getSlackDMsWithActivity] Total DMs:", dms.length);
    return { success: true, data: dms };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function getSlackMessagesFromChannel(
  channelId: string,
  oldest: string,
  latest: string
): Promise<{ success: boolean; data?: SlackMessage[]; error?: string }> {
  if (!API_BASE) {
    return { success: false, error: "API no disponible" };
  }

  try {
    const params = new URLSearchParams({
      action: "channel-history",
      channelId,
      oldest,
      latest,
    });

    const response = await fetch(`${API_BASE}?${params}`);
    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.error || "Error de Slack" };
    }

    return { success: true, data: data.messages as SlackMessage[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function syncSlackSourcesForDay(
  workspaceId: string,
  date: Date
): Promise<{ success: boolean; count?: number; error?: string }> {
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);
  const oldest = Math.floor(today.getTime() / 1000).toString();

  today.setHours(23, 59, 59, 999);
  const latest = Math.floor(today.getTime() / 1000).toString();

  const channelsResult = await getSlackChannelsWithActivity();
  if (!channelsResult.success || !channelsResult.data) {
    return { success: false, error: channelsResult.error };
  }

  let addedCount = 0;

  for (const channel of channelsResult.data) {
    const messagesResult = await getSlackMessagesFromChannel(channel.id, oldest, latest);
    
    const messages = messagesResult.data || [];
    const preview = messages.length > 0 
      ? messages.slice(0, 5).map(m => m.text).join("\n---\n")
      : "Sin mensajes en este canal para la fecha";

    const metadata = {
      channelId: channel.id,
      channelName: channel.name,
      messageCount: messages.length,
      messages: messages.map(m => ({
        user: m.user,
        text: m.text,
        ts: m.ts,
      })),
      preview: preview.substring(0, 2000),
    };

    const { data: existing } = await supabase
      .from("sources")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("source_origin", "slack")
      .eq("external_source_id", channel.id)
      .eq("source_date", date.toISOString().split("T")[0])
      .single();

    const dateStr = date.toISOString().split("T")[0];

    if (existing) {
      await supabase
        .from("sources")
        .update({
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("sources").insert([
        {
          workspace_id: workspaceId,
          title: `#${channel.name}`,
          source_type: "meeting",
          source_origin: "slack",
          ingest_mode: "slack",
          current_status: "pending",
          source_date: dateStr,
          external_source_id: channel.id,
          metadata,
        },
      ]);
      addedCount++;
    }
  }

  return { success: true, count: addedCount };
}

export async function getSlackSourcesByWorkspace(
  workspaceId: string,
  localDate: Date
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const y = localDate.getFullYear();
    const m = String(localDate.getMonth() + 1).padStart(2, "0");
    const d = String(localDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const startUtc = new Date(`${dateStr}T00:00:00`).toISOString();
    const endUtc = new Date(`${dateStr}T23:59:59`).toISOString();

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("source_origin", "slack")
      .gte("source_date", startUtc)
      .lte("source_date", endUtc);

    if (error) return { success: false, error: error.message };

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}