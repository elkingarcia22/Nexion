import { periodContaining, type ReportType } from "../periods";
import type { AnalyticsAction, AnalyticsReport, Kpi } from "../types";

/** What a roll-up keeps from each child report: its label, reading and key KPIs. */
export interface SeriesPoint {
  type: ReportType;
  periodKey: string;
  label: string;
  health: string | null;
  headline: string | null;
  kpis: Record<string, number | null>;
}

const SERIES_KPIS = [
  "active_users",
  "active_companies",
  "sessions",
  "key_action_sessions_pct",
  "user_retention_pct",
  "funnel_starts",
  "funnel_complete_pct",
  "dead_click_sessions_pct",
  "contracted_companies",
  "companies_with_usage",
  "nsm_companies",
  "at_risk_companies",
  "product_arr",
  "new_arr_hubspot",
];

export function toSeriesPoint(report: AnalyticsReport): SeriesPoint {
  const kpis = Object.fromEntries((report.data?.kpis ?? []).filter((k: Kpi) => SERIES_KPIS.includes(k.key)).map((k: Kpi) => [k.key, k.value]));
  return {
    type: report.report_type,
    periodKey: report.period_key,
    label: periodContaining(report.report_type, new Date(`${report.period_start}T00:00:00Z`)).label,
    health: report.health,
    headline: report.analysis?.headline ?? null,
    kpis,
  };
}

export interface PersistentScreen {
  label: string;
  /** Child periods (weeks or months) in which the screen was among the three with most friction. */
  appearances: number;
  averageFrictionPct: number | null;
}

const TOP_SCREENS_PER_WEEK = 3;

/** Screens that kept showing up among each child period's top friction: the persistent problems. */
export function persistentFriction(children: AnalyticsReport[]): PersistentScreen[] {
  const byScreen = new Map<string, { appearances: number; values: number[] }>();
  for (const report of children) {
    const friction = report.data?.datasets?.find((dataset) => dataset.key === "friction");
    for (const row of (friction?.rows ?? []).slice(0, TOP_SCREENS_PER_WEEK)) {
      const label = String(row.label ?? "");
      if (!label) continue;
      const entry = byScreen.get(label) ?? { appearances: 0, values: [] };
      byScreen.set(label, { appearances: entry.appearances + 1, values: typeof row.friction === "number" ? [...entry.values, row.friction] : entry.values });
    }
  }
  return Array.from(byScreen.entries())
    .filter(([, entry]) => entry.appearances >= 2)
    .map(([label, { appearances, values }]) => ({
      label,
      appearances,
      averageFrictionPct: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null,
    }))
    .sort((a, b) => b.appearances - a.appearances || (b.averageFrictionPct ?? 0) - (a.averageFrictionPct ?? 0));
}

export interface ActionReview {
  createdInPeriod: number;
  closedInPeriod: Array<{ title: string; status: string; result: string | null }>;
  openAtClose: Array<{ action_key: string; title: string; status: string; origin_period_key: string }>;
  closedWithoutResult: number;
}

/** What happened with the proposed actions during the period (the only honest "did it work" input). */
export function reviewActions(actions: AnalyticsAction[], start: string, end: string): ActionReview {
  const within = (iso: string | null) => Boolean(iso) && iso!.slice(0, 10) >= start && iso!.slice(0, 10) <= end;
  const closed = actions.filter((a) => (a.status === "done" || a.status === "dropped") && within(a.closed_at));
  return {
    createdInPeriod: actions.filter((a) => within(a.created_at)).length,
    closedInPeriod: closed.map((a) => ({ title: a.title, status: a.status, result: a.result })),
    openAtClose: actions
      .filter((a) => (a.status === "open" || a.status === "in_progress") && a.created_at.slice(0, 10) <= end)
      .slice(0, 10)
      .map((a) => ({ action_key: a.action_key, title: a.title, status: a.status, origin_period_key: a.origin_period_key })),
    closedWithoutResult: closed.filter((a) => a.status === "done" && !a.result).length,
  };
}
