import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAnthropicKey } from "@/lib/secrets";
import { lastCompletedPeriod, periodContaining } from "../periods";
import { planActions } from "../radar/actions";
import { parseAnalysis } from "../radar/analysis";
import type { OpenAction, RadarAnalysis } from "../radar/types";
import { toReportAnalysis } from "../radar/report-data";
import { ANALYSIS_MODEL, publishReport, reportUrl, runAnalysis, settleSources } from "../report-engine";
import {
  findReport,
  getAnalyticsProduct,
  listPreviousReports,
  listProductActions,
  recordReportActions,
  saveReport,
  type ReportDraft,
} from "../repository";
import type { AnalyticsReport } from "../types";
import { UbitsMcpClient } from "../ubits-mcp";
import { resolveUbitsMcpToken } from "../ubits-mcp-connection";
import { buildPulseContext, buildPulsePrompt, type PulseHistoryEntry } from "./analysis";
import { PULSE_CONFIGS } from "./config";
import { fetchTalentTickets, resolveJiraConfig, ticketsForProduct, type TaggedTicket } from "./jira";
import { buildPulseMessage } from "./message";
import { buildPulseData } from "./metrics";
import { toPulseReportData } from "./report-data";
import * as sql from "./sql";

const HISTORY_PULSES = 4;
const HISTORY_KPIS = ["contracted_companies", "companies_with_usage", "nsm_companies", "at_risk_companies", "product_arr", "new_arr_hubspot"];

export interface PulseRunOptions {
  trigger: "cron" | "manual";
  publish: boolean;
  /** Any date inside the pulse to report; defaults to the last completed pulse. */
  date?: string;
  now?: Date;
  dryRun?: boolean;
  /** False for backfills of past periods: their proposed actions would be stale. */
  recordActions?: boolean;
}

export interface PulseRunOutcome {
  report: AnalyticsReport;
  skipped?: string;
  slackError?: string;
}

function historyEntry(report: AnalyticsReport): PulseHistoryEntry {
  const kpis = Object.fromEntries((report.data?.kpis ?? []).filter((k) => HISTORY_KPIS.includes(k.key)).map((k) => [k.key, k.value]));
  const month = (report.coverage as Record<string, { detail?: string }> | null)?.mes_de_referencia?.detail ?? null;
  return { period_key: report.period_key, month, headline: report.analysis?.headline ?? null, kpis };
}

export async function runBiweeklyPulse(db: SupabaseClient, productId: string, options: PulseRunOptions): Promise<PulseRunOutcome> {
  const config = PULSE_CONFIGS[productId];
  if (!config) throw new Error(`"${productId}" todavía no tiene Pulso quincenal configurado.`);
  const product = await getAnalyticsProduct(db, productId);
  const period = options.date
    ? periodContaining("pulso_quincenal", new Date(`${options.date}T00:00:00Z`))
    : lastCompletedPeriod("pulso_quincenal", options.now ?? new Date());

  const existing = await findReport(db, productId, "pulso_quincenal", period.key);
  if (existing?.status === "published" && !options.dryRun) {
    if (options.trigger === "cron") return { report: existing, skipped: `El pulso ${period.key} ya se publicó.` };
    throw new Error(`El pulso de ${period.label} ya se publicó en Slack; no se regenera para no duplicarlo.`);
  }

  const window = sql.pulseWindow(period);
  const base = { product_id: productId, report_type: "pulso_quincenal" as const, period_key: period.key, period_start: period.start, period_end: period.end, trigger: options.trigger, model: null };

  let mcpToken: string;
  try {
    mcpToken = await resolveUbitsMcpToken(db);
  } catch (error) {
    // Most often the Ubits sign-in expired: leave a visible failed report instead of failing silently.
    const message = error instanceof Error ? error.message : "El MCP de Ubits no está conectado.";
    if (options.dryRun) throw error;
    const coverage = { bigquery_adopcion: { ok: false, detail: message } };
    return { report: await saveReport(db, { ...base, status: "failed", health: null, data: { kpis: [], datasets: [] }, coverage, analysis: null, message: null, error: message }) };
  }
  const [anthropicKey, jiraConfig] = await Promise.all([resolveAnthropicKey(db), resolveJiraConfig(db).catch(() => null)]);
  const mcp = new UbitsMcpClient(mcpToken);
  await mcp.initialize();
  const { values, coverage } = await settleSources({
    bigquery_adopcion: mcp.runQuery(sql.monthlySummarySql(config, window)),
    bigquery_empresas: mcp.runQuery(sql.companyChangesSql(config, window)),
    hubspot_arr: mcp.runQuery(sql.newArrSql(config, window)),
    rentabilidad: mcp.runQuery(sql.profitabilitySql(config, window)),
    jira: jiraConfig ? fetchTalentTickets(jiraConfig) : Promise.reject<TaggedTicket[]>(new Error("Jira no está conectado en Configuración → Jira.")),
  });
  coverage.mes_de_referencia = { ok: true, detail: window.month };

  const data = buildPulseData(config, period, window, {
    summary: values.bigquery_adopcion ?? [],
    companies: values.bigquery_empresas ?? [],
    newArr: values.hubspot_arr ?? [],
    profitability: values.rentabilidad ?? [],
    tickets: values.jira ? ticketsForProduct(values.jira, config, window) : null,
  });

  if (!data) {
    const error = coverage.bigquery_adopcion.ok
      ? `BigQuery no tiene datos de ${config.productName} para ${window.month}.`
      : `No se pudo leer BigQuery: ${coverage.bigquery_adopcion.detail}`;
    if (options.dryRun) throw new Error(error);
    return { report: await saveReport(db, { ...base, status: "failed", health: null, data: { kpis: [], datasets: [] }, coverage, analysis: null, message: null, error }) };
  }

  const [previous, actions] = await Promise.all([
    listPreviousReports(db, productId, "pulso_quincenal", period.start, HISTORY_PULSES),
    listProductActions(db, productId),
  ]);
  const openActions: OpenAction[] = actions
    .filter((a): a is typeof a & { status: OpenAction["status"] } => a.status === "open" || a.status === "in_progress")
    .slice(0, 8)
    .map((a) => ({ action_key: a.action_key, title: a.title, status: a.status, origin_period_key: a.origin_period_key }));

  const context = buildPulseContext(data, config, previous.map(historyEntry), openActions);
  const { analysis: rawAnalysis, usage, error: analysisError } = await runAnalysis(
    (feedback) => buildPulsePrompt(context, config, feedback),
    (text) => parseAnalysis(text, context),
    anthropicKey
  );
  coverage.analisis_ia = rawAnalysis ? { ok: true } : { ok: false, detail: analysisError };

  const plan = rawAnalysis ? planActions(rawAnalysis.actions, actions, period.key) : null;
  const analysis: RadarAnalysis | null = rawAnalysis && plan ? { ...rawAnalysis, actions: plan.actions } : null;
  const health = analysis?.status ?? data.health;

  const draft: ReportDraft = {
    ...base,
    model: analysis ? ANALYSIS_MODEL : null,
    status: "preview",
    health,
    data: toPulseReportData(data, config),
    coverage,
    analysis: analysis ? toReportAnalysis(analysis) : null,
    message: buildPulseMessage(data, config, analysis, health, reportUrl(productId, "pulso_quincenal")),
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
