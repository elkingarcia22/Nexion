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

    console.log("[getSourcesByDate] ===== INICIANDO CARGA DE FUENTES POR FECHA =====");
    console.log("[getSourcesByDate] workspace_id:", workspaceId);
    console.log("[getSourcesByDate] Fecha buscada:", dateStr);

    // Compute next day for range query (source_date is timestamptz, so .eq won't match partial dates)
    const nextDate = new Date(localDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const ny = nextDate.getFullYear();
    const nm = String(nextDate.getMonth() + 1).padStart(2, "0");
    const nd = String(nextDate.getDate()).padStart(2, "0");
    const nextDateStr = `${ny}-${nm}-${nd}`;

    // PRIMERO: Traer TODAS las fuentes SIN FILTRO para esa fecha
    const { data: allData, error } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("source_date", `${dateStr}T00:00:00.000Z`)
      .lt("source_date", `${nextDateStr}T00:00:00.000Z`)
      .order("created_at", { ascending: false });

    console.log("[getSourcesByDate] ===== TODAS LAS FUENTES DEL DÍA (SIN FILTRO) =====");
    console.log("[getSourcesByDate] Total sin filtro:", allData?.length || 0);
    console.log("[getSourcesByDate] Error (si hay):", error?.message);

    if (allData && allData.length > 0) {
      console.log("[getSourcesByDate] Detalles de CADA fuente del día:");
      allData.forEach((s: any, i: number) => {
        console.log(`[${i}] ID: ${s.id}`);
        console.log(`    Título: ${s.title}`);
        console.log(`    Fecha: ${s.source_date}`);
        console.log(`    source_origin: "${s.source_origin}" (tipo: ${typeof s.source_origin})`);
        console.log(`    source_type: "${s.source_type}" (tipo: ${typeof s.source_type})`);
        console.log(`    ingest_mode: ${s.ingest_mode}`);
        console.log(`    ---`);
      });
    }

    // SEGUNDO: Aplicar FILTRO - solo manual y notas de Gemini (de cualquier origen)
    console.log("[getSourcesByDate] ===== APLICANDO FILTRO =====");
    console.log("[getSourcesByDate] Criterios: 1) source_origin='manual' OR 2) title contiene 'Notas de Gemini'");

    const filteredData = allData?.filter((s: any) => {
      // Include manual sources and Gemini analysis notes (from any origin)
      const isManual = s.source_origin === "manual";
      const titleIncludes = s.title?.includes("Notas de Gemini") ?? false;
      const isGemini = titleIncludes;
      const include = isManual || isGemini;

      if (!include) {
        console.log(`[getSourcesByDate] ❌ EXCLUIDA: "${s.title}" -> origin:"${s.source_origin}", has_gemini_title:${titleIncludes}, isManual:${isManual}`);
      } else {
        console.log(`[getSourcesByDate] ✅ INCLUIDA: "${s.title}" -> origin:"${s.source_origin}", has_gemini_title:${titleIncludes}, isManual:${isManual}, reason:${isManual ? 'manual' : 'gemini'}`);
      }

      return include;
    }) || [];

    console.log("[getSourcesByDate] ===== RESUMEN DESPUÉS DEL FILTRO =====");
    console.log("[getSourcesByDate] Total incluidas:", filteredData.length, "de", allData?.length);

    console.log("[getSourcesByDate] Fuentes después del filtro:", filteredData.length);

    // TERCERO: Deduplicar por URL normalizada (n8n puede crear duplicados masivos del mismo archivo)
    const seenKeys = new Set<string>();
    const normalizeUrl = (u: string) => u ? u.split("?")[0].replace(/\/$/, "") : "";

    const dedupedData = filteredData.filter((s: any) => {
      const key = s.original_url ? normalizeUrl(s.original_url) : `title:${s.title}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    console.log("[getSourcesByDate] Después de dedup:", dedupedData.length, "(de", filteredData.length, "filtrado)");

    return { success: !error, data: dedupedData as Source[], error: error?.message };
  } catch (err) {
    console.error("[getSourcesByDate] ERROR CRÍTICO:", err);
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
    console.log("[getSourcesByWorkspace] ===== INICIANDO CARGA DE FUENTES =====");
    console.log("[getSourcesByWorkspace] workspace_id:", workspaceId);

    // PRIMERO: Traer TODAS las fuentes SIN FILTRO para ver qué hay
    const { data: allData, error: allError } = await supabase
      .from("sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    console.log("[getSourcesByWorkspace] ===== TODAS LAS FUENTES (SIN FILTRO) =====");
    console.log("[getSourcesByWorkspace] Total sin filtro:", allData?.length || 0);
    console.log("[getSourcesByWorkspace] Error (si hay):", allError?.message);

    if (allData && allData.length > 0) {
      console.log("[getSourcesByWorkspace] Detalles completos de CADA fuente:");
      allData.forEach((s: any, i: number) => {
        console.log(`[${i}] ID: ${s.id}`);
        console.log(`    Título: ${s.title}`);
        console.log(`    source_origin: ${s.source_origin} (tipo: ${typeof s.source_origin})`);
        console.log(`    source_type: ${s.source_type} (tipo: ${typeof s.source_type})`);
        console.log(`    ingest_mode: ${s.ingest_mode}`);
        console.log(`    created_at: ${s.created_at}`);
        console.log(`    ---`);
      });
    }

    // SEGUNDO: Aplicar FILTRO - solo manual (exclude Google Drive and other automated syncs)
    console.log("[getSourcesByWorkspace] ===== APLICANDO FILTRO =====");
    console.log("[getSourcesByWorkspace] Buscando: source_origin='manual'");

    const filteredData = allData?.filter((s: any) => {
      // Include manual sources and Gemini analysis notes (from any origin)
      const isManual = s.source_origin === "manual";
      const isGemini = s.title?.includes("Notas de Gemini");
      const include = isManual || isGemini;

      console.log(`[getSourcesByWorkspace] "${s.title}" -> origin:${s.source_origin}, manual:${isManual}, gemini:${isGemini}, INCLUDE:${include}`);

      return include;
    }) || [];

    console.log("[getSourcesByWorkspace] ===== RESULTADO FINAL =====");
    console.log("[getSourcesByWorkspace] Fuentes después del filtro:", filteredData.length);
    filteredData.forEach((s: any, i: number) => {
      console.log(`[${i}] "${s.title}" (origin: ${s.source_origin}, type: ${s.source_type})`);
    });

    return { success: !allError, data: filteredData as Source[], error: allError?.message };
  } catch (err) {
    console.error("[getSourcesByWorkspace] ERROR CRÍTICO:", err);
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
