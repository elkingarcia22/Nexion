import { supabase } from "@/lib/supabase";
import type { Source, CreateSourceInput } from "@/types/source";

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
        source_origin: input.origin || "google",
        current_status: "processed",
        created_at: new Date().toISOString()
      } as any
    };
  }

  try {
    const { data, error } = await supabase
      .from("sources")
      .insert([{
        workspace_id: input.workspaceId,
        title: input.title,
        original_url: input.url || null,
        source_type: input.type,
        source_origin: input.origin || "manual",
        ingest_mode: "manual",
        current_status: "pending",
        created_by_profile_id: input.createdBy,
        source_date: input.sourceDate || new Date().toISOString(),
        external_source_id: input.externalSourceId || null,
        metadata: input.metadata || {}
      }])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.[0] as any };
  } catch (err) {
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
    // Build simple date string for the local day
    const y = localDate.getFullYear();
    const m = String(localDate.getMonth() + 1).padStart(2, "0");
    const d = String(localDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("source_date", dateStr)
      .order("created_at", { ascending: false });

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
