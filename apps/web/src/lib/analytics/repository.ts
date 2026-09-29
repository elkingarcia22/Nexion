import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportType } from "./periods";
import type { AnalyticsAction, AnalyticsProduct, AnalyticsReport } from "./types";

/** Server-side (service-role) access to the analytics tables used by the report pipelines. */

export async function getAnalyticsProduct(db: SupabaseClient, id: string): Promise<AnalyticsProduct> {
  const { data, error } = await db.from("analytics_products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo leer el producto "${id}": ${error.message}`);
  if (!data) throw new Error(`No existe el producto "${id}" en Analítica.`);
  return data as AnalyticsProduct;
}

export async function findReport(db: SupabaseClient, productId: string, type: ReportType, periodKey: string): Promise<AnalyticsReport | null> {
  const { data, error } = await db
    .from("analytics_reports")
    .select("*")
    .eq("product_id", productId)
    .eq("report_type", type)
    .eq("period_key", periodKey)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer el reporte: ${error.message}`);
  return (data as AnalyticsReport | null) ?? null;
}

export async function getReportById(db: SupabaseClient, id: string): Promise<AnalyticsReport> {
  const { data, error } = await db.from("analytics_reports").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo leer el reporte: ${error.message}`);
  if (!data) throw new Error("El reporte no existe.");
  return data as AnalyticsReport;
}

/** Earlier reports of the same level, newest first (history for comparisons). */
export async function listPreviousReports(
  db: SupabaseClient,
  productId: string,
  type: ReportType,
  beforeStart: string,
  limit: number
): Promise<AnalyticsReport[]> {
  const { data, error } = await db
    .from("analytics_reports")
    .select("*")
    .eq("product_id", productId)
    .eq("report_type", type)
    .lt("period_start", beforeStart)
    .neq("status", "failed")
    .order("period_start", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`No se pudo leer el historial: ${error.message}`);
  return (data ?? []) as AnalyticsReport[];
}

export type ReportDraft = Omit<AnalyticsReport, "id" | "created_at" | "child_report_ids" | "slack_ts"> & {
  child_report_ids?: string[];
  slack_ts?: string | null;
  usage?: unknown;
};

/** Insert or replace the report of a product/level/period and return it. */
export async function saveReport(db: SupabaseClient, draft: ReportDraft): Promise<AnalyticsReport> {
  const { data, error } = await db
    .from("analytics_reports")
    .upsert({ ...draft, updated_at: new Date().toISOString() }, { onConflict: "product_id,report_type,period_key" })
    .select("*")
    .single();
  if (error) throw new Error(`No se pudo guardar el reporte: ${error.message}`);
  return data as AnalyticsReport;
}

export async function updateReport(db: SupabaseClient, id: string, changes: Partial<AnalyticsReport>): Promise<void> {
  const { error } = await db.from("analytics_reports").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`No se pudo actualizar el reporte: ${error.message}`);
}

export async function listProductActions(db: SupabaseClient, productId: string): Promise<AnalyticsAction[]> {
  const { data, error } = await db.from("analytics_actions").select("*").eq("product_id", productId).order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron leer las acciones: ${error.message}`);
  return (data ?? []) as AnalyticsAction[];
}

export interface NewAction {
  action_key: string;
  title: string;
  detail: string | null;
  owner: string | null;
}

/**
 * Records the actions a report proposed. New signals are inserted as open; actions the report
 * continues only get their review mark, so their status and result stay as people left them.
 */
export async function recordReportActions(
  db: SupabaseClient,
  productId: string,
  report: Pick<AnalyticsReport, "id" | "period_key">,
  created: NewAction[],
  continuedKeys: string[]
): Promise<void> {
  const now = new Date().toISOString();
  if (created.length) {
    const rows = created.map((action) => ({
      ...action,
      product_id: productId,
      origin_report_id: report.id,
      origin_period_key: report.period_key,
      last_reviewed_report_id: report.id,
      status: "open",
    }));
    const { error } = await db.from("analytics_actions").upsert(rows, { onConflict: "product_id,action_key", ignoreDuplicates: true });
    if (error) throw new Error(`No se pudieron guardar las acciones: ${error.message}`);
  }
  if (continuedKeys.length) {
    const { error } = await db
      .from("analytics_actions")
      .update({ last_reviewed_report_id: report.id, updated_at: now })
      .eq("product_id", productId)
      .in("action_key", continuedKeys);
    if (error) throw new Error(`No se pudo actualizar el seguimiento de acciones: ${error.message}`);
  }
}
