/** Shared arithmetic for the radar (same rules as the n8n normalizers). */
export type Health = "green" | "yellow" | "red";
export type Severity = "high" | "medium";

export function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** n / d as a percentage, or null when there is no denominator. */
export function pct(n: number, d: number): number | null {
  return d > 0 ? round2((n / d) * 100) : null;
}

/** Relative change in %; 0 → 0 is 0, anything → from 0 is unknown. */
export function variationPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round2(((current - previous) / previous) * 100);
}

/** Difference in percentage points. */
export function deltaPp(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : round2(current - previous);
}

export function worstHealth(values: Health[]): Health {
  if (values.includes("red")) return "red";
  if (values.includes("yellow")) return "yellow";
  return "green";
}

/** Splits HogQL rows that carry `periodo` = actual | anterior. */
export function byPeriod<T extends Record<string, unknown>>(rows: T[]): { current: T[]; previous: T[] } {
  return {
    current: rows.filter((row) => row.periodo === "actual"),
    previous: rows.filter((row) => row.periodo === "anterior"),
  };
}
