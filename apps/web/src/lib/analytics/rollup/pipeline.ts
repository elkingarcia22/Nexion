import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAnthropicKey } from "@/lib/secrets";
import { lastCompletedPeriod, periodContaining } from "../periods";
import { planActions } from "../radar/actions";
import { parseAnalysis } from "../radar/analysis";
import { toReportAnalysis } from "../radar/report-data";
import type { OpenAction, RadarAnalysis } from "../radar/types";
import { ANALYSIS_MODEL, publishReport, reportUrl, runAnalysis } from "../report-engine";
import { findReport, getAnalyticsProduct, listPreviousReports, listProductActions, recordReportActions, saveReport, type ReportDraft } from "../repository";
import type { AnalyticsReport } from "../types";
import { buildRollupContext, buildRollupPrompt, type RollupHistoryEntry } from "./analysis";
import { gatherRollup } from "./gather";
import { buildRollupMessage } from "./message";
import { rollupWindow, type RollupLevel } from "./periods";
import { toRollupReportData } from "./report-data";

const HISTORY_REPORTS = 3;

export interface RollupRunOptions {
  trigger: "cron" | "manual";
  publish: boolean;
  /** Any date inside the period; defaults to the last completed period of the level. */
  date?: string;
  now?: Date;
  dryRun?: boolean;
}

export interface RollupRunOutcome {
  report: AnalyticsReport;
  skipped?: string;
  slackError?: string;
}

function historyEntry(report: AnalyticsReport): RollupHistoryEntry {
  const keys = ["active_users", "active_companies", "key_action_sessions_pct", "nsm_companies", "at_risk_companies", "product_arr"];
  return {
    period_key: report.period_key,
    headline: report.analysis?.headline ?? null,
    kpis: Object.fromEntries((report.data?.kpis ?? []).filter((k) => keys.includes(k.key)).map((k) => [k.key, k.value])),
  };
}

/** Builds a monthly, quarterly, semiannual or annual report from its child reports plus fresh period data. */
export async function runRollup(db: SupabaseClient, productId: string, level: RollupLevel, options: RollupRunOptions): Promise<RollupRunOutcome> {
  const product = await getAnalyticsProduct(db, productId);
  if (!product.enabled_reports.includes(level)) throw new Error(`${product.name} no tiene activo el nivel ${level}.`);
  const now = options.now ?? new Date();
  const period = options.date ? periodContaining(level, new Date(`${options.date}T00:00:00Z`)) : lastCompletedPeriod(level, now);

  const existing = await findReport(db, productId, level, period.key);
  if (existing?.status === "published" && !options.dryRun) {
    if (options.trigger === "cron") return { report: existing, skipped: `El reporte ${period.key} ya se publicó.` };
    throw new Error(`El reporte de ${period.label} ya se publicó en Slack; no se regenera para no duplicarlo.`);
  }

  const window = rollupWindow(period, now);
  const base = { product_id: productId, report_type: level, period_key: period.key, period_start: period.start, period_end: period.end, trigger: options.trigger, model: null };
  const { data, coverage } = await gatherRollup(db, product, level, window);

  if (!data.behaviour && !data.business && !data.children.found.length) {
    const error = "No hay datos del periodo: ni reportes de nivel inferior ni consultas de PostHog o BigQuery respondieron.";
    if (options.dryRun) throw new Error(`${error} ${JSON.stringify(coverage)}`);
    return { report: await saveReport(db, { ...base, status: "failed", health: null, data: { kpis: [], datasets: [] }, coverage, analysis: null, message: null, error }) };
  }

  const [anthropicKey, previous] = await Promise.all([resolveAnthropicKey(db), listPreviousReports(db, productId, level, period.start, HISTORY_REPORTS)]);
  const openActions: OpenAction[] = data.actions.openAtClose
    .filter((a): a is typeof a & { status: OpenAction["status"] } => a.status === "open" || a.status === "in_progress")
    .slice(0, 8);
  const context = buildRollupContext(data, productId, product.name, previous.map(historyEntry), openActions);
  const { analysis: rawAnalysis, usage, error: analysisError } = await runAnalysis(
    (feedback) => buildRollupPrompt(context, level, feedback),
    (text) => parseAnalysis(text, context),
    anthropicKey
  );
  coverage.analisis_ia = rawAnalysis ? { ok: true } : { ok: false, detail: analysisError };

  const allActions = rawAnalysis ? await listProductActions(db, productId) : [];
  const plan = rawAnalysis ? planActions(rawAnalysis.actions, allActions, period.key) : null;
  const analysis: RadarAnalysis | null = rawAnalysis && plan ? { ...rawAnalysis, actions: plan.actions } : null;
  const health = analysis?.status ?? data.health;

  const draft: ReportDraft = {
    ...base,
    model: analysis ? ANALYSIS_MODEL : null,
    status: "preview",
    health,
    data: toRollupReportData(data, productId),
    coverage,
    analysis: analysis ? toReportAnalysis(analysis) : null,
    message: buildRollupMessage(data, product.name, analysis, health, reportUrl(productId, level)),
    child_report_ids: data.children.found.map((child) => child.id),
    error: analysisError ?? null,
    usage,
  };
  if (options.dryRun) return { report: { ...draft, id: "dry-run", slack_ts: null, created_at: new Date().toISOString() } as AnalyticsReport };

  let report = await saveReport(db, draft);
  if (plan) await recordReportActions(db, productId, report, plan.created, plan.continuedKeys);
  if (!options.publish) return { report };
  const published = await publishReport(db, report, product.slack_channel_id);
  report = published.report;
  return { report, slackError: published.slackError };
}
