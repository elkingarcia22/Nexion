import { supabase } from "@/lib/supabase";

interface CreateSourceInput {
  title: string;
  url?: string;
  type: "document" | "meeting" | "email" | "feedback" | "manual";
  workspaceId: string;
  createdBy: string;
}

interface Source {
  id: string;
  workspace_id: string;
  title: string;
  url: string | null;
  type: string;
  status: "pending" | "processing" | "processed" | "error";
  content: string | null;
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
        source_origin: "manual",
        current_status: "pending",
        created_by_profile_id: input.createdBy,
      },
    ]).select();

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
      .gte("created_at", startUtc)
      .lte("created_at", endUtc)
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


export async function deleteSource(
  sourceId: string
): Promise<{ success: boolean; error?: string }> {
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
