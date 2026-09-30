import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAnthropicKey, resolvePosthogKey } from "@/lib/secrets";
import { lastCompletedPeriod, periodContaining, type Period } from "../periods";
import { runHogQL } from "../posthog";
import {
  findReport,
  getAnalyticsProduct,
  listPreviousReports,
  listProductActions,
  recordReportActions,
  saveReport,
  type ReportDraft,
} from "../repository";
import { ANALYSIS_MODEL, publishReport, reportUrl, runAnalysis } from "../report-engine";
import type { AnalyticsReport, SourceCoverage } from "../types";
import { planActions } from "./actions";
import { buildAnalysisContext, buildAnalysisPrompt, parseAnalysis } from "./analysis";
import type { RadarConfig } from "./config";
import * as queries from "./hogql";
import { worstHealth, type Health } from "./math";
import { buildRadarMessage } from "./message";
import { buildCompanies, buildFeatures, buildFriction, buildFunnel, buildRecurrence, buildSummary } from "./metrics";
import { RADAR_CONFIGS } from "./products";
import { selectReplays } from "./replays";
import { toReportAnalysis, toReportData } from "./report-data";
import type { OpenAction, RadarAnalysis, RadarHistoryEntry, RadarWeek } from "./types";

export { RADAR_CONFIGS };

export { publishReport };
const HISTORY_WEEKS = 4;
const HISTORY_KPIS = ["active_users", "active_companies", "sessions", "key_action_sessions_pct", "user_retention_pct", "funnel_starts", "funnel_complete_pct", "dead_click_sessions_pct"];

export interface RadarRunOptions {
  trigger: "cron" | "manual";
  publish: boolean;
  /** Monday (YYYY-MM-DD) of the week to report; defaults to the last completed week. */
  weekStart?: string;
  now?: Date;
  /** Development only: compute everything but write nothing and post nothing. */
  dryRun?: boolean;
  /** False for backfills of past periods: their proposed actions would be stale. */
  recordActions?: boolean;
}

export interface RadarRunOutcome {
  report: AnalyticsReport;
  skipped?: string;
  slackError?: string;
}

type Row = Record<string, unknown>;

async function gatherWeek(config: RadarConfig, period: Period, posthogKey: string): Promise<{ week: RadarWeek | null; coverage: SourceCoverage; error?: string }> {
  const run = (name: string, sql: string) => runHogQL(posthogKey, config.posthogProjectId, sql, `nexion_${config.productId}_${name}_${period.key}`).then((r) => r.rows);
  const sources = {
    resumen: run("summary", queries.summaryQuery(config, period.start)),
    funcionalidades: run("features", queries.featureUsageQuery(config, period.start)),
    funnel: run("funnel", queries.funnelQuery(config, period.start)),
    recurrencia: run("recurrence", queries.recurrenceQuery(config, period.start)),
    friccion: run("friction", queries.frictionQuery(config, period.start)),
    empresas: run("companies", queries.companyRiskQuery(config, period.start)),
    replays: run("replay_candidates", queries.replayCandidatesQuery(config, period.start)).then((rows) => selectReplays(rows, config, posthogKey)),
  };
  const names = Object.keys(sources) as Array<keyof typeof sources>;
  const settled = await Promise.allSettled(names.map((name) => sources[name]));
  const coverage: SourceCoverage = {};
  const value = <T,>(name: keyof typeof sources, fallback: T): T => {
    const result = settled[names.indexOf(name)];
    coverage[name] = result.status === "fulfilled" ? { ok: true } : { ok: false, detail: result.reason instanceof Error ? result.reason.message.slice(0, 200) : "error" };
    return result.status === "fulfilled" ? (result.value as T) : fallback;
  };

  const summaryRows = value<Row[]>("resumen", []);
  const featureRows = value<Row[]>("funcionalidades", []);
  const funnelRows = value<Row[]>("funnel", []);
  const recurrenceRows = value<Row[]>("recurrencia", []);
  const frictionRows = value<Row[]>("friccion", []);
  const companyRows = value<Row[]>("empresas", []);
  const replays = value("replays", [] as Awaited<ReturnType<typeof selectReplays>>);

  if (!coverage.resumen.ok) return { week: null, coverage, error: `PostHog no respondió el resumen semanal: ${coverage.resumen.detail}` };
  const summary = buildSummary(summaryRows);
  if (summary.current.sessions === 0) return { week: null, coverage, error: "PostHog no registró sesiones de producción en esta semana." };
  const features = buildFeatures(featureRows, config, summary);
  return {
    coverage,
    week: {
      period,
      summary,
      features: features.features,
      featuresHealth: features.health,
      funnel: buildFunnel(funnelRows, config),
      recurrence: buildRecurrence(recurrenceRows),
      friction: buildFriction(frictionRows, config),
      companies: buildCompanies(companyRows),
      replays,
    },
  };
}

function historyEntry(report: AnalyticsReport): RadarHistoryEntry {
  const kpis = Object.fromEntries((report.data?.kpis ?? []).filter((k) => HISTORY_KPIS.includes(k.key)).map((k) => [k.key, k.value]));
  const watch = (report.analysis?.watch_next ?? []).map((item) => item.metric);
  return { period_key: report.period_key, health: report.health, headline: report.analysis?.headline ?? null, kpis, watch_next: watch };
}

export async function runWeeklyRadar(db: SupabaseClient, productId: string, options: RadarRunOptions): Promise<RadarRunOutcome> {
  const config = RADAR_CONFIGS[productId];
  if (!config) throw new Error(`"${productId}" todavía no tiene Radar semanal configurado.`);
  const product = await getAnalyticsProduct(db, productId);
  const period = options.weekStart
    ? periodContaining("radar_semanal", new Date(`${options.weekStart}T00:00:00Z`))
    : lastCompletedPeriod("radar_semanal", options.now ?? new Date());

  const existing = await findReport(db, productId, "radar_semanal", period.key);
  if (existing?.status === "published" && !options.dryRun) {
    // Rebuilding it would turn it back into a preview and allow posting the same week twice.
    if (options.trigger === "cron") return { report: existing, skipped: `El radar de ${period.key} ya se publicó.` };
    throw new Error(`El radar de ${period.label} ya se publicó en Slack; no se regenera para no duplicarlo.`);
  }

  const [posthogKey, anthropicKey] = await Promise.all([resolvePosthogKey(db), resolveAnthropicKey(db)]);
  const { week, coverage, error } = await gatherWeek(config, period, posthogKey);
  const base = { product_id: productId, report_type: "radar_semanal" as const, period_key: period.key, period_start: period.start, period_end: period.end, trigger: options.trigger, model: null };

  if (!week) {
    if (options.dryRun) throw new Error(error ?? "Sin datos");
    const report = await saveReport(db, { ...base, status: "failed", health: null, data: { kpis: [], datasets: [] }, coverage, analysis: null, message: null, error: error ?? "Sin datos" });
    return { report };
  }

  const [previous, actions] = await Promise.all([
    listPreviousReports(db, productId, "radar_semanal", period.start, HISTORY_WEEKS),
    listProductActions(db, productId),
  ]);
  const openActions: OpenAction[] = actions
    .filter((a): a is typeof a & { status: OpenAction["status"] } => a.status === "open" || a.status === "in_progress")
    .slice(0, 8)
    .map((a) => ({ action_key: a.action_key, title: a.title, status: a.status, origin_period_key: a.origin_period_key }));

  const context = buildAnalysisContext(week, previous.map(historyEntry), openActions, config);
  const { analysis: rawAnalysis, usage, error: analysisError } = await runAnalysis(
    (feedback) => buildAnalysisPrompt(context, config, feedback),
    (text) => parseAnalysis(text, context),
    anthropicKey
  );
  coverage.analisis_ia = rawAnalysis ? { ok: true } : { ok: false, detail: analysisError };

  const plan = rawAnalysis ? planActions(rawAnalysis.actions, actions, period.key) : null;
  const analysis: RadarAnalysis | null = rawAnalysis && plan ? { ...rawAnalysis, actions: plan.actions } : null;
  const health: Health = analysis?.status ?? worstHealth([week.summary.health, week.funnel.health, week.recurrence.health]);
  const message = buildRadarMessage(week, config, analysis, health, reportUrl(productId, "radar_semanal"));

  const draft: ReportDraft = {
    ...base,
    model: analysis ? ANALYSIS_MODEL : null,
    status: "preview",
    health,
    data: toReportData(week, config),
    coverage,
    analysis: analysis ? toReportAnalysis(analysis) : null,
    message,
    error: analysisError ?? null,
    usage,
  };
  if (options.dryRun) {
    return { report: { ...draft, id: "dry-run", child_report_ids: [], slack_ts: null, created_at: new Date().toISOString() } as AnalyticsReport };
  }

  let report = await saveReport(db, draft);
  if (plan && options.recordActions !== false) await recordReportActions(db, productId, report, plan.created, plan.continuedKeys);
  if (!options.publish) return { report };

  const published = await publishReport(db, report, product.slack_channel_id);
  report = published.report;
  return { report, slackError: published.slackError };
}
