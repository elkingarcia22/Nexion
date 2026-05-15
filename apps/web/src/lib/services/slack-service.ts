import { supabase } from "@/lib/supabase";

const API_BASE = typeof window !== "undefined" 
  ? `${window.location.origin}/api/slack`
  : "";

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_mpim: boolean;
  is_private?: boolean;
  is_member?: boolean;
  num_members: number;
}

export interface SlackMessage {
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
    return { success: false, error: "API no disponible" };
  }

  try {
    const url = `${API_BASE}?action=my-channels`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.error || "Error de Slack" };
    }

    const channels = data.channels as SlackChannel[];
    return { success: true, data: channels }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function joinChannel(channelId: string): Promise<{ success: boolean; error?: string }> {
  if (!API_BASE) {
    return { success: false, error: "API no disponible" };
  }

  try {
    const response = await fetch(`${API_BASE}?action=join-channel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });
    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.error || "No se pudo unir al canal" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error" };
  }
}

export async function verifyPrivateChannel(channelId: string): Promise<{ success: boolean; data?: SlackChannel; error?: string }> {
  if (!API_BASE) {
    return { success: false, error: "API no disponible" };
  }

  try {
    const response = await fetch(`${API_BASE}?action=private-channel-info&channelId=${channelId}`);
    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.error || "No se pudo acceder al canal" };
    }

    return { success: true, data: data.channel };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error" };
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

    const url = `${API_BASE}?${params}`;
    console.log(`[getSlackMessagesFromChannel] Fetching history for channel=${channelId} oldest=${oldest} latest=${latest}`);

    const response = await fetch(url);
    const data = await response.json();

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

function isChannelAllowed(name: string, isPrivate?: boolean): boolean {
  if (isPrivate) return true;
  return !CHANNEL_DENYLIST_PATTERNS.some(p => p.test(name));
}

export async function getChannelPreferences(
  workspaceId: string
): Promise<{ success: boolean; data?: { channel_id: string; channel_name: string; is_private: boolean; enabled: boolean }[]; error?: string }> {
  const { data, error } = await supabase
    .from("app_slack_channels")
    .select("channel_id, channel_name, is_private, enabled")
    .eq("workspace_id", workspaceId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}

export async function setChannelEnabled(
  workspaceId: string,
  channelId: string,
  channelName: string,
  isPrivate: boolean,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("app_slack_channels").upsert({
    workspace_id: workspaceId,
    channel_id: channelId,
    channel_name: channelName,
    is_private: isPrivate,
    enabled,
    created_at: new Date().toISOString(),
  }, { onConflict: "workspace_id,channel_id" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeChannelPreference(
  workspaceId: string,
  channelId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("app_slack_channels")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("channel_id", channelId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

async function syncChannelSources(
  workspaceId: string,
  channel: { id: string; name: string; is_private?: boolean },
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
    isPrivate: channel.is_private || false,
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
    .maybeSingle();

  if (lookupError) {
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
): Promise<{ success: boolean; count?: number; error?: string }> {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  const today = new Date(date);
  today.setHours(0, 0, 0, 0);
  const oldest = Math.floor(today.getTime() / 1000).toString();

  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);
  const latest = Math.floor(nextDay.getTime() / 1000).toString();

  console.log(`[syncSlackSourcesForDay] Starting sync for workspace=${workspaceId} date=${dateStr}`);

  const channelsResult = await getSlackBotChannels();
  if (!channelsResult.success) {
    return { success: false, error: channelsResult.error };
  }

  let channels = channelsResult.data || [];
  console.log(`[syncSlackSourcesForDay] Found ${channels.length} channels from API`);

  // Load known private channels from DB (app_slack_channels table)
  const { data: dbPrivateChannels, error: dbError } = await supabase
    .from("app_slack_channels")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_private", true);

  if (!dbError && dbPrivateChannels) {
    for (const pc of dbPrivateChannels) {
      if (!channels.some(c => c.id === pc.channel_id)) {
        const result = await verifyPrivateChannel(pc.channel_id);
        if (result.success && result.data?.is_member) {
          channels.push({
            id: result.data.id,
            name: result.data.name,
            is_channel: true,
            is_group: false,
            is_mpim: false,
            is_private: true,
            is_member: true,
            num_members: result.data.num_members || 0,
          });
          console.log(`[syncSlackSourcesForDay] Added private channel #${result.data.name} from DB`);
        }
      }
    }
  }

  // Fallback: known private channels verified to work
  const KNOWN_PRIVATE: { id: string; name: string }[] = [
    { id: "C084AP7K4Q2", name: "triada-growth" },
    { id: "C083FSV36KY", name: "ux_team_ubits" },
    { id: "C0APCFJJ39V", name: "claude-masters" },
    { id: "C09JV33J9PB", name: "growth-interno" },
    { id: "C085E86CDEC", name: "talent-growth-implementation" },
    { id: "C08VBKFA9ST", name: "hiring-team" },
  ];

  for (const kp of KNOWN_PRIVATE) {
    if (!channels.some(c => c.id === kp.id)) {
      const result = await verifyPrivateChannel(kp.id);
      if (result.success && result.data?.is_member) {
        channels.push({
          id: result.data.id,
          name: result.data.name,
          is_channel: true,
          is_group: false,
          is_mpim: false,
          is_private: true,
          is_member: true,
          num_members: result.data.num_members || 0,
        });
        console.log(`[syncSlackSourcesForDay] Added private channel #${result.data.name} from fallback list`);
      }
    }
  }

  // Clean slate: remove old Slack sources for this date
  const { error: deleteError } = await supabase
    .from("sources")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("source_origin", "slack")
    .eq("source_date", dateStr);
  if (deleteError) {
    console.warn(`[syncSlackSourcesForDay] Error cleaning old sources:`, deleteError);
  }

  // Load channel preferences (which channels user has enabled/disabled)
  const prefsResult = await getChannelPreferences(workspaceId);
  const channelPrefs = prefsResult.success && prefsResult.data
    ? new Map(prefsResult.data.map(p => [p.channel_id, p]))
    : new Map();

  let addedCount = 0;

  for (const channel of channels) {
    if (!isChannelAllowed(channel.name, channel.is_private)) {
      console.log(`[syncSlackSourcesForDay] Skipping denylisted channel #${channel.name}`);
      continue;
    }
    // Check preference: if a preference exists and it's disabled, skip
    const pref = channelPrefs.get(channel.id);
    if (pref !== undefined && !pref.enabled) {
      console.log(`[syncSlackSourcesForDay] Skipping disabled channel #${channel.name}`);
      continue;
    }
    const count = await syncChannelSources(workspaceId, channel, oldest, latest, dateStr);
    addedCount += count;
  }

  console.log(`[syncSlackSourcesForDay] FINISHED: ${addedCount} new sources added`);
  return { success: true, count: addedCount };
}

export async function addPrivateChannelToSync(
  workspaceId: string,
  channelId: string,
): Promise<{ success: boolean; error?: string; channel?: SlackChannel }> {
  const result = await verifyPrivateChannel(channelId);
  if (!result.success) {
    return { success: false, error: result.error || "No se pudo verificar el canal" };
  }
  if (!result.data?.is_member) {
    return { success: false, error: "El bot no es miembro de este canal privado" };
  }

  const channel = result.data;

  const { error: upsertError } = await supabase.from("app_slack_channels").upsert({
    workspace_id: workspaceId,
    channel_id: channel.id,
    channel_name: channel.name,
    is_private: true,
    created_at: new Date().toISOString(),
  }, {
    onConflict: "workspace_id,channel_id",
  });

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  return { success: true, channel: { ...channel, is_private: true, is_member: true } };
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

    console.log(`[getSlackSourcesByWorkspace] Querying sources for workspace=${workspaceId} date=${dateStr}`);

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("source_origin", "slack")
      .gte("source_date", start)
      .lt("source_date", end);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

function getNextDayUtc(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}
