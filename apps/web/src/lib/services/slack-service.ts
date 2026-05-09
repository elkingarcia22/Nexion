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

export async function getSlackBotChannels(): Promise<{ success: boolean; data?: SlackChannel[]; error?: string }> {
  if (!API_BASE) {
    console.warn("[getSlackBotChannels] API_BASE is empty — running server-side?");
    return { success: false, error: "API no disponible" };
  }

  try {
    const url = `${API_BASE}?action=my-channels`;
    console.log(`[getSlackBotChannels] Fetching from: ${url}`);
    const response = await fetch(url);
    console.log(`[getSlackBotChannels] HTTP status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    console.log(`[getSlackBotChannels] Response: ok=${data.ok} channels=${data.channels?.length || 0} error=${data.error || "none"}`);

    if (data._debug) {
      console.log(`[getSlackBotChannels] DEBUG from server: totalRaw=${data._debug.totalRaw} tokenPrefix=${data._debug.tokenPrefix} tokenLength=${data._debug.tokenLength}`);
      console.log(`[getSlackBotChannels] DEBUG rawNames: ${data._debug.rawNames?.join(" | ") || "EMPTY"}`);
    }

    if (data.channels && data.channels.length > 0) {
      console.log(`[getSlackBotChannels] Channel list: ${data.channels.map((c: any) => `#${c.name}(${c.is_group ? "priv" : "pub"},member=${c.is_member})`).join(", ")}`);
    } else {
      console.warn("[getSlackBotChannels] No channels returned from API");
    }

    if (!data.ok) {
      console.warn("[getSlackBotChannels] API error:", data.error);
      return { success: false, error: data.error || "Error de Slack" };
    }

    const channels = data.channels as SlackChannel[];
    console.log(`[getSlackBotChannels] Returning ${channels.length} channels`);
    return { success: true, data: channels }
  } catch (err) {
    console.error("[getSlackBotChannels] Network/fetch error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}



export async function getSlackMessagesFromChannel(
  channelId: string,
  oldest: string,
  latest: string
): Promise<{ success: boolean; data?: SlackMessage[]; error?: string }> {
  if (!API_BASE) {
    console.warn("[getSlackMessagesFromChannel] API_BASE is empty");
    return { success: false, error: "API no disponible" };
  }

  try {
    const params = new URLSearchParams({
      action: "channel-history",
      channelId,
      oldest,
      latest,
    });

    const url = `${API_BASE}?${params}`;
    console.log(`[getSlackMessagesFromChannel] Fetching history for channel=${channelId} oldest=${oldest} latest=${latest}`);

    const response = await fetch(url);
    const data = await response.json();

    console.log(`[getSlackMessagesFromChannel] ${channelId}: ok=${data.ok} messages=${data.messages?.length || 0} error=${data.error || "none"}`);

    if (!data.ok) {
      console.warn(`[getSlackMessagesFromChannel] ${channelId} error:`, data.error);
      return { success: false, error: data.error || "Error de Slack" };
    }

    return { success: true, data: data.messages as SlackMessage[] };
  } catch (err) {
    console.error(`[getSlackMessagesFromChannel] ${channelId} network error:`, err);
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

// Channels that match these patterns are excluded (noisy public channels)
const CHANNEL_DENYLIST_PATTERNS = [
  /^general$/i,
  /-general$/i,
  /^random$/i,
  /^anuncios?$/i,
  /^announcements?$/i,
  /^help[-_ ]/i,
  /^support$/i,
  /^team[-_ ]/i,
  /^staff$/i,
];

function isChannelAllowed(name: string, isGroup: boolean): boolean {
  if (isGroup) return true;
  return !CHANNEL_DENYLIST_PATTERNS.some(p => p.test(name));
}

async function syncChannelSources(
  workspaceId: string,
  channel: { id: string; name: string },
  oldest: string,
  latest: string,
  dateStr: string,
): Promise<number> {
  console.log(`[syncChannelSources] Fetching messages for #${channel.name} (${channel.id}) oldest=${oldest} latest=${latest}`);
  const messagesResult = await getSlackMessagesFromChannel(channel.id, oldest, latest);

  if (!messagesResult.success) {
    console.warn(`[syncChannelSources] #${channel.name}: messages fetch failed: ${messagesResult.error}`);
    return 0;
  }

  const messages = messagesResult.data || [];
  console.log(`[syncChannelSources] #${channel.name}: ${messages.length} messages today`);

  if (messages.length === 0) {
    console.log(`[syncChannelSources] #${channel.name}: no messages today, skipping`);
    return 0;
  }

  const preview = messages.slice(0, 5).map(m => m.text).join("\n---\n");

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

  console.log(`[syncChannelSources] #${channel.name}: checking for existing source in DB...`);
  const { data: existing, error: lookupError } = await supabase
    .from("sources")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("source_origin", "slack")
    .eq("external_source_id", channel.id)
    .eq("source_date", dateStr)
    .single();

  if (lookupError && lookupError.code !== "PGRST116") {
    console.warn(`[syncChannelSources] #${channel.name}: DB lookup error:`, lookupError);
  }

  if (existing) {
    console.log(`[syncChannelSources] #${channel.name}: updating existing source ${existing.id}`);
    const { error: updateError } = await supabase
      .from("sources")
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updateError) {
      console.error(`[syncChannelSources] #${channel.name}: update error:`, updateError);
    }
    return 0;
  } else {
    console.log(`[syncChannelSources] #${channel.name}: inserting new source`);
    const { error: insertError } = await supabase.from("sources").insert([{
      workspace_id: workspaceId,
      title: `#${channel.name}`,
      source_type: "meeting",
      source_origin: "slack",
      ingest_mode: "slack",
      current_status: "pending",
      source_date: dateStr,
      external_source_id: channel.id,
      metadata,
    }]);
    if (insertError) {
      console.error(`[syncChannelSources] #${channel.name}: insert error:`, insertError);
      return 0;
    }
    console.log(`[syncChannelSources] #${channel.name}: inserted successfully`);
    return 1;
  }
}

export async function syncSlackSourcesForDay(
  workspaceId: string,
  date: Date,
  userToken?: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  const today = new Date(date);
  today.setHours(0, 0, 0, 0);
  const oldest = Math.floor(today.getTime() / 1000).toString();

  today.setHours(23, 59, 59, 999);
  const latest = Math.floor(today.getTime() / 1000).toString();

  console.log(`[syncSlackSourcesForDay] Starting sync for workspace=${workspaceId} date=${dateStr} oldest=${oldest} latest=${latest}`);

  const channelsResult = await getSlackBotChannels();
  if (!channelsResult.success) {
    console.warn("[syncSlackSourcesForDay] getSlackBotChannels failed:", channelsResult.error);
    return { success: false, error: channelsResult.error };
  }

  const channels = channelsResult.data || [];
  console.log(`[syncSlackSourcesForDay] Found ${channels.length} channels from API. dateStr=${dateStr}`);

  // Clean slate: remove old Slack sources for this date so stale entries don't persist
  const { error: deleteError } = await supabase
    .from("sources")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("source_origin", "slack")
    .eq("source_date", dateStr);
  if (deleteError) {
    console.warn(`[syncSlackSourcesForDay] Error cleaning old sources:`, deleteError);
  } else {
    console.log(`[syncSlackSourcesForDay] Cleaned old Slack sources for ${dateStr}`);
  }

  let addedCount = 0;

  console.log(`[syncSlackSourcesForDay] All channels from API: ${channels.map((c: any) => "#" + c.name + (c.is_group ? " (priv)" : "")).join(", ")}`);

  for (const channel of channels) {
    if (!isChannelAllowed(channel.name, channel.is_group === true)) {
      console.log(`[syncSlackSourcesForDay] ⏭️ Skipping denylisted channel #${channel.name}`);
      continue;
    }
    const count = await syncChannelSources(workspaceId, channel, oldest, latest, dateStr);
    console.log(`[syncSlackSourcesForDay] #${channel.name}: ${count} source(s) added`);
    addedCount += count;
  }

  console.log(`[syncSlackSourcesForDay] FINISHED: ${addedCount} new sources added, ${channels.length - addedCount} skipped (denylisted or no messages)`);
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
    const start = `${dateStr}T00:00:00.000Z`;
    const end = getNextDayUtc(dateStr);

    console.log(`[getSlackSourcesByWorkspace] Querying sources for workspace=${workspaceId} date=${dateStr} range=[${start}, ${end})`);

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("source_origin", "slack")
      .gte("source_date", start)
      .lt("source_date", end);

    if (error) {
      console.error(`[getSlackSourcesByWorkspace] DB error:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[getSlackSourcesByWorkspace] Found ${data?.length || 0} sources`);
    if (data && data.length > 0) {
      console.log(`[getSlackSourcesByWorkspace] Source titles: ${data.map((s: any) => s.title).join(", ")}`);
    }
    return { success: true, data: data || [] };
  } catch (err) {
    console.error(`[getSlackSourcesByWorkspace] Unexpected error:`, err);
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

function getNextDayUtc(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}