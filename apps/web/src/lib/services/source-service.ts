import { supabase } from "@/lib/supabase";
export interface Source {
  id: string;
  workspace_id: string;
  title: string;
  original_url?: string | null;
  source_type: string;
  source_origin?: string | null;
  current_status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface CreateSourceInput {
  workspaceId: string;
  title: string;
  url?: string;
  type: string;
  sourceDate?: string;
  createdBy?: string;
  externalSourceId?: string;
  metadata?: Record<string, any>;
  origin?: string;
}

/**
 * Creates a new source record in Supabase.
 * Mimics the structure of an actual Supabase insert.
 */
export async function createSource(
  input: CreateSourceInput
): Promise<{ success: boolean; data?: Source; error?: string }> {
  console.log("[createSource] Input received:", input);

  if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
    console.log("[createSource] DEMO MODE - returning mock data");
    return {
      success: true,
      data: {
        id: Math.random().toString(36).substring(7),
        workspace_id: input.workspaceId,
        title: input.title,
        original_url: input.url || null,
        source_type: input.type,
        source_origin: "google",
        current_status: "processed",
        created_at: new Date().toISOString()
      } as any
    };
  }

  try {
    const now = new Date();
    const sourceDate = input.sourceDate
      ? new Date(input.sourceDate).toISOString().split('T')[0]
      : now.toISOString().split('T')[0];

    console.log("[createSource] Date calculation:", {
      inputSourceDate: input.sourceDate,
      now: now.toISOString(),
      calculatedSourceDate: sourceDate,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    const insertPayload = {
      workspace_id: input.workspaceId,
      title: input.title,
      original_url: input.url || null,
      source_type: input.type,
      source_origin: "manual",
      ingest_mode: "manual",
      current_status: "pending",
      created_by_profile_id: input.createdBy,
      source_date: sourceDate,
      external_source_id: input.externalSourceId || null,
      metadata: input.metadata || {}
    };

    console.log("[createSource] Inserting into Supabase:", insertPayload);

    const { data, error } = await supabase
      .from("sources")
      .insert([insertPayload])
      .select();

    console.log("[createSource] Supabase response - data:", data, "error:", error);

    if (error) {
      console.error("[createSource] Supabase error:", error);
      return { success: false, error: error.message };
    }

    console.log("[createSource] Successfully created source:", data?.[0]);
    return { success: true, data: data?.[0] as any };
  } catch (err) {
    console.error("[createSource] Catch error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Returns sources for a workspace created on a specific local day.
 * Converts the local date to UTC boundaries to handle timezone offsets correctly.
 */
export async function getSourcesByDate(
  workspaceId: string,
  localDate: Date
): Promise<{ success: boolean; data?: Source[]; error?: string }> {
  try {
    // Filter by date - source_date is stored as date string (YYYY-MM-DD) in timestamptz column
    const y = localDate.getFullYear();
    const m = String(localDate.getMonth() + 1).padStart(2, "0");
    const d = String(localDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    console.log("[getSourcesByDate] Fetching sources for date:", dateStr);

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("source_date", dateStr)
      .order("created_at", { ascending: false });

    console.log("[getSourcesByDate] Query result - count:", data?.length || 0, "error:", error?.message);
    if (data && data.length > 0) {
      console.log("[getSourcesByDate] All", data.length, "sources returned for date:", dateStr);
      data.forEach((s: any, i: number) => {
        console.log(`  [${i}] title: "${s.title}" | source_date: "${s.source_date}" | origin: "${s.source_origin}" | source_type: "${s.source_type}"`);
      });
    } else {
      console.log("[getSourcesByDate] No sources returned for date:", dateStr);
    }

    return { success: !error, data: (data || []) as Source[], error: error?.message };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getSourcesByWorkspace(
  workspaceId: string,
): Promise<{ success: boolean; data?: Source[]; error?: string }> {
  if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
    return {
      success: true,
      data: []
    };
  }

  try {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    return { success: !error, data: (data || []) as Source[], error: error?.message };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function updateSource(
  input: { id: string; title?: string; url?: string; type?: string; metadata?: any }
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
    return { success: true, data: {} as any };
  }

  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.url !== undefined) updateData.original_url = input.url;
    if (input.type !== undefined) updateData.source_type = input.type;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const { error } = await supabase
      .from("sources")
      .update(updateData)
      .eq("id", input.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: updateData as any };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function deleteSource(
  sourceId: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", sourceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
