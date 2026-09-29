import type { ReportType } from "./periods";

export type ReportStatus = "published" | "preview" | "failed" | "partial";
export type Health = "green" | "yellow" | "red";
export type ActionStatus = "open" | "in_progress" | "done" | "dropped";

export interface AnalyticsProduct {
  id: string;
  name: string;
  slack_channel_name: string;
  slack_channel_id: string | null;
  posthog_config: Record<string, unknown>;
  business_config: Record<string, unknown>;
  enabled_reports: ReportType[];
  sort_order: number;
}

/** One KPI as shown in the report and compared across periods. */
export interface Kpi {
  key: string;
  label: string;
  value: number | null;
  unit?: "count" | "pct" | "usd" | "days" | "minutes";
  /** Change vs the previous period of the same level, in the KPI's unit (pct points for pct). */
  delta?: number | null;
  /** Whether up is good (for coloring the delta). */
  higherIsBetter?: boolean;
}

/** A named table-like dataset (funnel, feature usage, friction by screen, companies at risk…). */
export interface Dataset {
  key: string;
  title: string;
  columns: Array<{ key: string; label: string; unit?: Kpi["unit"] }>;
  rows: Array<Record<string, string | number | null>>;
  /** Plain-language reading computed from the data (never hardcoded copy). */
  reading?: string;
}

export interface ReportLink {
  label: string;
  url: string;
  kind?: "replay" | "ticket" | "doc" | "other";
}

/** Contract every pipeline writes to analytics_reports.data. */
export interface ReportData {
  kpis: Kpi[];
  datasets: Dataset[];
  links?: ReportLink[];
}

export interface ReportAnalysis {
  headline: string;
  summary: string;
  insights: Array<{ title: string; detail: string; evidence?: string[] }>;
  hypotheses?: Array<{ statement: string; how_to_validate?: string }>;
  watch_next?: Array<{ metric: string; reason: string }>;
}

export interface SourceCoverage {
  /** source key → ok, or the reason it is missing */
  [source: string]: { ok: boolean; detail?: string };
}

export interface AnalyticsReport {
  id: string;
  product_id: string;
  report_type: ReportType;
  period_key: string;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  health: Health | null;
  data: ReportData;
  coverage: SourceCoverage;
  analysis: ReportAnalysis | null;
  message: string | null;
  child_report_ids: string[];
  error: string | null;
  model: string | null;
  slack_ts: string | null;
  trigger: "cron" | "manual";
  created_at: string;
}

export interface AnalyticsAction {
  id: string;
  product_id: string;
  action_key: string;
  title: string;
  detail: string | null;
  origin_report_id: string | null;
  origin_period_key: string;
  status: ActionStatus;
  result: string | null;
  owner: string | null;
  created_at: string;
  closed_at: string | null;
}
