import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePosthogKey, resolveSlackToken } from "@/lib/secrets";
import { fetchPulseCases, type PulseCases } from "../pulse/slack-lists";
import { runHogQL } from "../posthog";
import { PULSE_CONFIGS } from "../pulse/config";
import { fetchTalentTickets, resolveJiraConfig, ticketsForProduct, type TaggedTicket } from "../pulse/jira";
import { buildPulseData, type PulseData } from "../pulse/metrics";
import * as pulseSql from "../pulse/sql";
import type { RadarConfig } from "../radar/config";
import * as hogql from "../radar/hogql";
import type { Health } from "../radar/math";
import { buildFeatures, buildFriction, buildFunnel, buildSummary, type FeatureUsage, type Friction, type Funnel, type Summary } from "../radar/metrics";
import { RADAR_CONFIGS } from "../radar/products";
import { settleSources } from "../report-engine";
import { listProductActions, listReportsByKeys } from "../repository";
import type { AnalyticsReport, SourceCoverage } from "../types";
import { UbitsMcpClient } from "../ubits-mcp";
import { resolveUbitsMcpToken } from "../ubits-mcp-connection";
import { expectedChildren, FRESH_POSTHOG_LEVELS, type RollupLevel, type RollupWindow } from "./periods";
import { persistentFriction, reviewActions, toSeriesPoint, type ActionReview, type PersistentScreen, type SeriesPoint } from "./series";
import type { AnalyticsProduct } from "../types";

/** Behaviour over the whole period, deduplicated (never a sum of weeks). */
export interface PeriodBehaviour {
  summary: Summary;
  features: FeatureUsage[];
  funnel: Funnel;
  friction: Friction;
}

export interface RollupData {
  level: RollupLevel;
  window: RollupWindow;
  children: { expected: number; found: AnalyticsReport[]; missing: string[] };
  series: SeriesPoint[];
  behaviour: PeriodBehaviour | null;
  business: PulseData | null;
  persistentScreens: PersistentScreen[];
  actions: ActionReview;
  health: Health;
}

async function freshBehaviour(config: RadarConfig, window: RollupWindow, key: string): Promise<PeriodBehaviour | null> {
  const run = (name: string, sql: string) => runHogQL(key, config.posthogProjectId, sql, `nexion_${config.productId}_${name}_${window.period.key}`).then((r) => r.rows);
  const range = window.posthogRange;
  const [summaryRows, featureRows, funnelRows, frictionRows] = await Promise.all([
    run("period_summary", hogql.summaryQuery(config, range)),
    run("period_features", hogql.featureUsageQuery(config, range)),
    run("period_funnel", hogql.funnelQuery(config, range)),
    run("period_friction", hogql.frictionQuery(config, range)),
  ]);
  const summary = buildSummary(summaryRows);
  if (summary.current.sessions === 0) return null;
  return {
    summary,
    features: buildFeatures(featureRows, config, summary).features,
    funnel: buildFunnel(funnelRows, config),
    friction: buildFriction(frictionRows, config),
  };
}

async function freshBusiness(db: SupabaseClient, productId: string, window: RollupWindow): Promise<PulseData | null> {
  const config = PULSE_CONFIGS[productId];
  const mcp = new UbitsMcpClient(await resolveUbitsMcpToken(db));
  await mcp.initialize();
  const w = window.businessWindow;
  const jiraConfig = await resolveJiraConfig(db).catch(() => null);
  const [summary, companies, newArr, profitability, tickets, cases] = await Promise.all([
    mcp.runQuery(pulseSql.monthlySummarySql(config, w)),
    mcp.runQuery(pulseSql.companyChangesSql(config, w)),
    mcp.runQuery(pulseSql.newArrSql(config, w)),
    mcp.runQuery(pulseSql.profitabilitySql(config, w)),
    jiraConfig ? fetchTalentTickets(jiraConfig).catch((): TaggedTicket[] | null => null) : Promise.resolve(null),
    config.slackList ? resolveSlackToken(db).then((token) => fetchPulseCases(config, token, w)).catch((): PulseCases | null => null) : Promise.resolve(null),
  ]);
  return buildPulseData(config, window.period, w, {
    summary,
    companies,
    newArr,
    profitability,
    tickets: tickets ? ticketsForProduct(tickets, config, w) : null,
    cases,
  });
}

export async function gatherRollup(
  db: SupabaseClient,
  product: AnalyticsProduct,
  level: RollupLevel,
  window: RollupWindow
): Promise<{ data: RollupData; coverage: SourceCoverage }> {
  const expected = expectedChildren(window.period, level, product.enabled_reports);
  const radar = RADAR_CONFIGS[product.id];
  const withBehaviour = radar && FRESH_POSTHOG_LEVELS.includes(level);

  const children: Promise<AnalyticsReport[]> = Promise.all(
    expected.map(({ type, periods }) => listReportsByKeys(db, product.id, type, periods.map((p) => p.key)))
  ).then((lists) => lists.flat());
  const behaviourSource: Promise<PeriodBehaviour | null> = withBehaviour
    ? resolvePosthogKey(db).then((key) => freshBehaviour(radar, window, key))
    : Promise.resolve(null);
  const businessSource: Promise<PulseData | null> = PULSE_CONFIGS[product.id] ? freshBusiness(db, product.id, window) : Promise.resolve(null);
  const { values, coverage } = await settleSources({
    reportes_hijos: children,
    posthog_periodo: behaviourSource,
    bigquery_cierre: businessSource,
    acciones: listProductActions(db, product.id),
  });
  if (!withBehaviour) delete coverage.posthog_periodo;
  if (!PULSE_CONFIGS[product.id]) delete coverage.bigquery_cierre;

  const found = (values.reportes_hijos ?? []).sort((a, b) => a.period_start.localeCompare(b.period_start));
  const foundKeys = new Set(found.map((r) => `${r.report_type}:${r.period_key}`));
  const missing = expected.flatMap(({ type, periods }) => periods.filter((p) => !foundKeys.has(`${type}:${p.key}`)).map((p) => p.label));
  const expectedCount = expected.reduce((total, { periods }) => total + periods.length, 0);
  coverage.reportes_hijos = { ok: missing.length === 0, detail: `${found.length} de ${expectedCount} reportes${missing.length ? `; faltan: ${missing.slice(0, 6).join(", ")}` : ""}` };

  const behaviour = values.posthog_periodo ?? null;
  const business = values.bigquery_cierre ?? null;
  const healthParts: Health[] = [
    ...(behaviour ? [behaviour.summary.health, behaviour.funnel.health] : []),
    ...(business ? [business.health] : []),
  ];
  const health: Health = healthParts.includes("red") ? "red" : healthParts.includes("yellow") ? "yellow" : "green";

  return {
    coverage,
    data: {
      level,
      window,
      children: { expected: expectedCount, found, missing },
      series: found.map(toSeriesPoint),
      behaviour,
      business,
      persistentScreens: persistentFriction(found),
      actions: reviewActions(values.acciones ?? [], window.period.start, window.period.end),
      health,
    },
  };
}
