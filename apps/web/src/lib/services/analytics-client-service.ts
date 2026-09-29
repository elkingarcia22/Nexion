import { supabase } from "@/lib/supabase";
import type { ReportType } from "@/lib/analytics/periods";
import type { ActionStatus, AnalyticsAction, AnalyticsProduct, AnalyticsReport } from "@/lib/analytics/types";

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

const REPORTS_PAGE_SIZE = 60;
const ACTIONS_LIMIT = 50;

export async function listAnalyticsProducts(): Promise<ServiceResult<AnalyticsProduct[]>> {
  const { data, error } = await supabase.from("analytics_products").select("*").order("sort_order");
  return error ? { success: false, error: error.message } : { success: true, data: (data ?? []) as AnalyticsProduct[] };
}

/** Reports of one product and level, newest first, optionally only those starting on or before `until`. */
export async function listAnalyticsReports(
  productId: string,
  type: ReportType,
  until?: string
): Promise<ServiceResult<AnalyticsReport[]>> {
  let query = supabase
    .from("analytics_reports")
    .select("*")
    .eq("product_id", productId)
    .eq("report_type", type)
    .order("period_start", { ascending: false })
    .limit(REPORTS_PAGE_SIZE);
  if (until) query = query.lte("period_start", until);

  const { data, error } = await query;
  return error ? { success: false, error: error.message } : { success: true, data: (data ?? []) as AnalyticsReport[] };
}

export async function getAnalyticsReportsByIds(ids: string[]): Promise<ServiceResult<AnalyticsReport[]>> {
  if (!ids.length) return { success: true, data: [] };
  const { data, error } = await supabase.from("analytics_reports").select("*").in("id", ids).order("period_start");
  return error ? { success: false, error: error.message } : { success: true, data: (data ?? []) as AnalyticsReport[] };
}

export async function listAnalyticsActions(productId: string): Promise<ServiceResult<AnalyticsAction[]>> {
  const { data, error } = await supabase
    .from("analytics_actions")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(ACTIONS_LIMIT);
  return error ? { success: false, error: error.message } : { success: true, data: (data ?? []) as AnalyticsAction[] };
}

export async function updateAnalyticsAction(
  id: string,
  changes: { status?: ActionStatus; result?: string | null; owner?: string | null }
): Promise<ServiceResult<null>> {
  const now = new Date().toISOString();
  const closing = changes.status === "done" || changes.status === "dropped";
  const { error } = await supabase
    .from("analytics_actions")
    .update({ ...changes, updated_at: now, ...(changes.status ? { closed_at: closing ? now : null } : {}) })
    .eq("id", id);
  return error ? { success: false, error: error.message } : { success: true, data: null };
}
