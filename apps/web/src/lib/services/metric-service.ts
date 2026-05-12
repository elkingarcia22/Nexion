import { supabase } from "@/lib/supabase";

export interface Metric {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  current_value?: number;
  target_value?: number;
  previous_value?: number;
  unit: string;
  source: string;
  source_date?: string;
  period?: string;
  metadata: any;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MetricDailyLog {
  id: string;
  workspace_id: string;
  metric_id: string;
  day_summary_id?: string;
  value?: number;
  delta?: number;
  context_text?: string;
  source: string;
  created_at: string;
}

export interface EntityLink {
  id: string;
  workspace_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relationship: string;
  metadata: any;
  created_at: string;
}

export async function getMetrics(
  workspaceId: string,
  category?: string,
  period?: string
): Promise<{ success: boolean; data?: Metric[]; error?: string }> {
  try {
    let query = supabase
      .from("metrics")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    if (period) {
      query = query.eq("period", period);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function getMetricDailyLogs(
  metricId: string,
  limitDays: number = 90
): Promise<{ success: boolean; data?: MetricDailyLog[]; error?: string }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limitDays);
    const startStr = startDate.toISOString();

    const { data, error } = await supabase
      .from("metric_daily_logs")
      .select("*")
      .eq("metric_id", metricId)
      .gte("created_at", startStr)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function getEntityLinks(
  entityType: string,
  entityId: string
): Promise<{ success: boolean; data?: EntityLink[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("entity_links")
      .select("*")
      .or(`source_type.eq.${entityType},source_id.eq.${entityId}`)
      .or(`target_type.eq.${entityType},target_id.eq.${entityId}`);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function createEntityLink(
  workspaceId: string,
  sourceType: string,
  sourceId: string,
  targetType: string,
  targetId: string,
  relationship: string = "related_to"
): Promise<{ success: boolean; data?: EntityLink; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("entity_links")
      .insert([{
        workspace_id: workspaceId,
        source_type: sourceType,
        source_id: sourceId,
        target_type: targetType,
        target_id: targetId,
        relationship,
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export interface MetricsConfig {
  selected_categories: string[];
}

export async function getMetricsConfig(workspaceId: string): Promise<{ success: boolean; data?: MetricsConfig; error?: string }> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("metrics_config")
    .eq("id", workspaceId)
    .single();
  if (error) return { success: false, error: error.message };
  const config = (data?.metrics_config || {}) as MetricsConfig;
  return {
    success: true,
    data: {
      selected_categories: config.selected_categories || [],
    },
  };
}

export async function updateMetricsConfig(workspaceId: string, config: MetricsConfig): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("workspaces")
    .update({ metrics_config: config, updated_at: new Date().toISOString() })
    .eq("id", workspaceId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function seedMetricsFromPdf(
  workspaceId: string
): Promise<{ success: boolean; data?: Metric[]; error?: string }> {
  const metrics: Omit<Metric, "id" | "created_at" | "updated_at">[] = [
    { workspace_id: workspaceId, name: "ARR Objetivos", category: "objetivos", current_value: 117100, unit: "USD", source: "pdf_seed", sort_order: 1, metadata: {} },
    { workspace_id: workspaceId, name: "ARR Usabilidad Objetivos", category: "objetivos", current_value: 67000, unit: "USD", source: "pdf_seed", sort_order: 2, metadata: {} },
    { workspace_id: workspaceId, name: "ARR NSM Objetivos", category: "objetivos", current_value: 39700, unit: "USD", source: "pdf_seed", sort_order: 3, metadata: {} },
    { workspace_id: workspaceId, name: "ARR Encuestas", category: "encuestas", current_value: 74300, unit: "USD", source: "pdf_seed", sort_order: 4, metadata: {} },
    { workspace_id: workspaceId, name: "ARR NSM Encuestas", category: "encuestas", current_value: 29300, unit: "USD", source: "pdf_seed", sort_order: 5, metadata: {} },
    { workspace_id: workspaceId, name: "ARR Matriz de Talento", category: "matrix", current_value: 43100, unit: "USD", source: "pdf_seed", sort_order: 6, metadata: {} },
    { workspace_id: workspaceId, name: "ARR NSM Matriz de Talento", category: "matrix", current_value: 3300, unit: "USD", source: "pdf_seed", sort_order: 7, metadata: {} },
    { workspace_id: workspaceId, name: "ARR 360", category: "360", current_value: 127600, unit: "USD", source: "pdf_seed", sort_order: 8, metadata: {} },
    { workspace_id: workspaceId, name: "ARR NSM 360", category: "360", current_value: 48300, unit: "USD", source: "pdf_seed", sort_order: 9, metadata: {} },
    { workspace_id: workspaceId, name: "ARR Contratación", category: "hiring", current_value: 8200, unit: "USD", source: "pdf_seed", sort_order: 10, metadata: {} },
    { workspace_id: workspaceId, name: "ARR NSM Contratación", category: "hiring", current_value: 1300, unit: "USD", source: "pdf_seed", sort_order: 11, metadata: {} },
    { workspace_id: workspaceId, name: "ARR ASX", category: "asx", current_value: 48000, unit: "USD", source: "pdf_seed", sort_order: 12, metadata: {} },
    { workspace_id: workspaceId, name: "ARR PYT", category: "pyt", current_value: 31000, unit: "USD", source: "pdf_seed", sort_order: 13, metadata: {} },
    { workspace_id: workspaceId, name: "ARR Learning Map", category: "learning_map", current_value: 28000, unit: "USD", source: "pdf_seed", sort_order: 14, metadata: {} },
    { workspace_id: workspaceId, name: "ARR NSM Learning Map", category: "learning_map", current_value: 5000, unit: "USD", source: "pdf_seed", sort_order: 15, metadata: {} },
    { workspace_id: workspaceId, name: "ARR Creator", category: "creator", current_value: 14000, unit: "USD", source: "pdf_seed", sort_order: 16, metadata: {} },
    { workspace_id: workspaceId, name: "ARR NSM Creator", category: "creator", current_value: 3000, unit: "USD", source: "pdf_seed", sort_order: 17, metadata: {} },
    { workspace_id: workspaceId, name: "ARR Core", category: "core", current_value: 92000, unit: "USD", source: "pdf_seed", sort_order: 18, metadata: {} },
    { workspace_id: workspaceId, name: "ARR NSM Core", category: "core", current_value: 15000, unit: "USD", source: "pdf_seed", sort_order: 19, metadata: {} },
    { workspace_id: workspaceId, name: "ARR Planes y Tareas", category: "planes_tareas", current_value: 18000, unit: "USD", source: "pdf_seed", sort_order: 20, metadata: {} },
    { workspace_id: workspaceId, name: "ARR Total Empresas", category: "general", current_value: 10200000, unit: "USD", source: "pdf_seed", sort_order: 0, metadata: {} },
    { workspace_id: workspaceId, name: "Empresas en NSM Objetivos", category: "objetivos", current_value: 39, unit: "number", source: "pdf_seed", sort_order: 14, metadata: {} },
    { workspace_id: workspaceId, name: "Empresas en NSM Encuestas", category: "encuestas", current_value: 967, unit: "number", source: "pdf_seed", sort_order: 15, metadata: {} },
  ];

  const { data, error } = await supabase
    .from("metrics")
    .upsert(
      metrics.map(m => ({
        ...m,
        period: 'Q2 2026',
        source_date: new Date().toISOString().split("T")[0],
      })),
      { onConflict: "workspace_id,name", ignoreDuplicates: true }
    )
    .select();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}
