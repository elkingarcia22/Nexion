import type { Period } from "../periods";
import type { CompanyRisk, FeatureUsage, Friction, Funnel, Recurrence, Summary } from "./metrics";
import type { Replay } from "./replays";
import type { Health } from "./math";

/** Everything measured for one product-week, before any AI reading. */
export interface RadarWeek {
  period: Period;
  summary: Summary;
  features: FeatureUsage[];
  featuresHealth: Health;
  funnel: Funnel;
  recurrence: Recurrence;
  friction: Friction;
  companies: CompanyRisk[];
  replays: Replay[];
}

export interface RadarAction {
  /** Stable snake_case signal, so the same problem is followed up instead of re-created. */
  signalKey: string;
  title: string;
  evidence: string;
  nextStep: string;
  owner: "product" | "design" | "engineering" | "data";
  /** Set when this continues an action already open from a previous week. */
  continuesActionKey?: string;
}

export interface RadarAnalysis {
  status: Health;
  headline: string;
  summary: string;
  closing: string;
  insights: Array<{ title: string; fact: string; interpretation: string; confidence: "high" | "medium" | "low"; evidence: string[] }>;
  hypotheses: Array<{ statement: string; how_to_validate: string }>;
  actions: RadarAction[];
  watch_next: Array<{ metric: string; reason: string; direction: "increase" | "decrease" | "stable" | "investigate" }>;
}

/** Compact history the model can compare against (previous weekly reports of the same product). */
export interface RadarHistoryEntry {
  period_key: string;
  health: Health | null;
  headline: string | null;
  kpis: Record<string, number | null>;
  watch_next: string[];
}

export interface OpenAction {
  action_key: string;
  title: string;
  status: "open" | "in_progress";
  origin_period_key: string;
}
