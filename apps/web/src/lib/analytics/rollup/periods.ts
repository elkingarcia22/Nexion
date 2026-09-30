import { bogotaDate, childPeriods, periodContaining, type Period, type ReportType } from "../periods";
import type { QueryRange } from "../radar/hogql";
import type { PulseWindow } from "../pulse/sql";

/** Levels built from lower-level reports. */
export type RollupLevel = "mensual" | "trimestral" | "semestral" | "anual";
export const ROLLUP_LEVELS: RollupLevel[] = ["mensual", "trimestral", "semestral", "anual"];

export function isRollupLevel(type: string): type is RollupLevel {
  return (ROLLUP_LEVELS as string[]).includes(type);
}

/** Which lower levels feed each level: the month reads weeks and pulses; the rest read the level below. */
export const ROLLUP_CHILDREN: Record<RollupLevel, ReportType[]> = {
  mensual: ["radar_semanal", "pulso_quincenal"],
  trimestral: ["mensual"],
  semestral: ["trimestral"],
  anual: ["trimestral"],
};

/** Levels short enough for a fresh PostHog query over the whole period (dedup users and companies). */
export const FRESH_POSTHOG_LEVELS: RollupLevel[] = ["mensual", "trimestral"];

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function monthOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function previousPeriod(period: Period): Period {
  return periodContaining(period.type, new Date(`${shift(period.start, -1)}T00:00:00Z`));
}

export interface RollupWindow {
  period: Period;
  previous: Period;
  /** True when the period had not ended when the report was built. */
  partial: boolean;
  /** Month whose BigQuery figures close the period (its last month, or the current one if still open). */
  closeMonth: string;
  previousCloseMonth: string;
  /** PostHog comparison: this period against the previous one of the same level. */
  posthogRange: QueryRange;
  /** Business window reused from the pulse SQL (month close, and dated sources over the whole period). */
  businessWindow: PulseWindow;
}

export function rollupWindow(period: Period, now: Date): RollupWindow {
  const today = bogotaDate(now).toISOString().slice(0, 10);
  const previous = previousPeriod(period);
  const lastDay = period.end < today ? period.end : today;
  const closeMonth = monthOf(lastDay);
  const previousCloseMonth = monthOf(previous.end);
  return {
    period,
    previous,
    partial: period.end >= today,
    closeMonth,
    previousCloseMonth,
    posthogRange: { previousStart: previous.start, start: period.start, end: shift(period.end, 1) },
    businessWindow: {
      month: closeMonth,
      previousMonth: previousCloseMonth,
      monthIsPartial: period.end >= today,
      start: period.start,
      end: period.end,
      previousStart: previous.start,
      previousEnd: previous.end,
    },
  };
}

/** Keys of the child reports expected for a period, per child level. */
export function expectedChildren(period: Period, level: RollupLevel, enabled: ReportType[]): Array<{ type: ReportType; periods: Period[] }> {
  return ROLLUP_CHILDREN[level]
    .filter((type) => enabled.includes(type))
    .map((type) => ({ type, periods: childPeriods(period, type) }));
}
