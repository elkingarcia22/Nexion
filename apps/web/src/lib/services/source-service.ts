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
  if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
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

    const { data, error } = await supabase
      .from("sources")
      .insert([insertPayload])
      .select();

    if (error) {
      console.error("[createSource] Supabase error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.[0] as any };
  } catch (err) {
    console.error("[createSource] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Returns sources for a workspace created on a specific local day.
 * Filters to show only manual sources and gemini notes.
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

    // Compute next day for range query (source_date is timestamptz, so .eq won't match partial dates)
    const nextDate = new Date(localDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const ny = nextDate.getFullYear();
    const nm = String(nextDate.getMonth() + 1).padStart(2, "0");
    const nd = String(nextDate.getDate()).padStart(2, "0");
    const nextDateStr = `${ny}-${nm}-${nd}`;

    // Fetch sources for the date
    const { data: allData, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("source_date", `${dateStr}T00:00:00.000Z`)
      .lt("source_date", `${nextDateStr}T00:00:00.000Z`)
      .order("created_at", { ascending: false });

    // Filter: include manual sources and Gemini analysis notes
    const filteredData = allData?.filter((s: any) => {
      const isManual = s.source_origin === "manual";
      const isGemini = s.title?.includes("Notas de Gemini") ?? false;
      return isManual || isGemini;
    }) || [];

    // Deduplicate by normalized URL
    const seenKeys = new Set<string>();
    const normalizeUrl = (u: string) => u ? u.split("?")[0].replace(/\/$/, "") : "";

    const dedupedData = filteredData.filter((s: any) => {
      const key = s.original_url ? normalizeUrl(s.original_url) : `title:${s.title}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    return { success: !error, data: dedupedData as Source[], error: error?.message };
  } catch (err) {
    console.error("[getSourcesByDate] Error:", err);
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
    // Fetch all sources for workspace
    const { data: allData, error: allError } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    // Filter: include manual sources and Gemini analysis notes (from any origin)
    const filteredData = allData?.filter((s: any) => {
      const isManual = s.source_origin === "manual";
      const isGemini = s.title?.includes("Notas de Gemini");
      return isManual || isGemini;
    }) || [];

    return { success: !allError, data: filteredData as Source[], error: allError?.message };
  } catch (err) {
    console.error("[getSourcesByWorkspace] Error:", err);
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

/**
 * Deletes all source records with the same URL in a workspace.
 * Used to eliminate duplicates created by n8n re-runs.
 */
export async function deleteSourcesByUrl(
  workspaceId: string,
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedUrl = url.split("?")[0].replace(/\/$/, "");
    // Delete any URL that starts with the normalized base (strips query params)
    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("workspace_id", workspaceId)
      .like("original_url", `${normalizedUrl}%`);

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
