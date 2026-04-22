import { supabase } from "@/lib/supabase";

interface CreateSourceInput {
  title: string;
  url?: string;
  type: "document" | "meeting" | "email" | "feedback" | "manual";
  workspaceId: string;
  createdBy: string;
  origin?: "manual" | "google";
  sourceDate?: string;
}

interface Source {
  id: string;
  workspace_id: string;
  title: string;
  original_url: string | null;
  source_type: string;
  source_origin: string;
  ingest_mode: string;
  current_status: string;
  created_at: string;
}

export async function createSource(
  input: CreateSourceInput
): Promise<{ success: boolean; data?: Source; error?: string }> {
  try {
    const { data, error } = await supabase.from("sources").insert([
      {
        workspace_id: input.workspaceId,
        title: input.title,
        original_url: input.url || null,
        source_type: input.type,
        source_origin: input.origin || "manual",
        ingest_mode: "manual",
        current_status: "pending",
        created_by_profile_id: input.createdBy,
        source_date: input.sourceDate || new Date().toISOString(),
      },
    ]).select();

    if (error) {
      if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
        console.warn("Using mock createSource for Demo Mode");
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

export async function getSourcesByWorkspace(
  workspaceId: string
): Promise<{ success: boolean; data?: Source[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Source[] };
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
  if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
    console.log("DEMO_MODE: Returning mock sources");
    return {
      success: true,
      data: [
        {
          id: "64611954-2dbd-49dd-9f41-c79f9b10efaf",
          workspace_id: workspaceId,
          title: "Test Source",
          original_url: "https://example.com/test",
          source_type: "document",
          source_origin: "manual",
          current_status: "processed",
          created_at: new Date().toISOString()
        }
      ] as any
    };
  }
  try {
    // Build UTC range covering the full local day
    const y = localDate.getFullYear();
    const m = String(localDate.getMonth() + 1).padStart(2, "0");
    const d = String(localDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    // new Date("YYYY-MM-DDT00:00:00") without Z is interpreted as local time by JS,
    // so .toISOString() already converts correctly to UTC — no manual offset needed.
    const startUtc = new Date(`${dateStr}T00:00:00`).toISOString();
    const endUtc   = new Date(`${dateStr}T23:59:59`).toISOString();

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .or(`source_date.gte.${startUtc},and(source_date.is.null,created_at.gte.${startUtc})`)
      .or(`source_date.lte.${endUtc},and(source_date.is.null,created_at.lte.${endUtc})`)
      .order("created_at", { ascending: false });

    if (error) {
      if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
        // Return existing mock sources from the DB (the ones I found earlier) or just mock ones
        console.warn("Using mock sources for Demo Mode");
        return {
          success: true,
          data: [
            {
              id: "64611954-2dbd-49dd-9f41-c79f9b10efaf",
              workspace_id: workspaceId,
              title: "Test Source",
              original_url: "https://example.com/test",
              source_type: "document",
              source_origin: "manual",
              current_status: "processed",
              created_at: new Date().toISOString()
            }
          ] as any
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Source[] };
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
  try {
    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", sourceId);

    if (error) {
      if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
        return { success: true };
      }
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

export async function updateSource(
  sourceId: string,
  updates: Partial<Source>
): Promise<{ success: boolean; data?: Source; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("sources")
      .update(updates)
      .eq("id", sourceId)
      .select();

    if (error) {
      if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
        return { success: true, data: { id: sourceId, ...updates } as any };
      }
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
