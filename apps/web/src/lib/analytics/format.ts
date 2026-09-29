import type { Kpi } from "./types";

const numberFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const usdFormat = new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatKpiValue(value: number | null | undefined, unit: Kpi["unit"] = "count"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  switch (unit) {
    case "pct":
      return `${numberFormat.format(value)} %`;
    case "usd":
      return usdFormat.format(value);
    case "days":
      return `${numberFormat.format(value)} d`;
    case "minutes":
      return `${numberFormat.format(value)} min`;
    default:
      return numberFormat.format(value);
  }
}

export type DeltaTone = "good" | "bad" | "neutral";

/** Signed change and whether it is good news, given the KPI's direction. */
export function formatDelta(kpi: Pick<Kpi, "delta" | "unit" | "higherIsBetter">): { text: string; tone: DeltaTone } | null {
  if (kpi.delta === null || kpi.delta === undefined || Number.isNaN(kpi.delta)) return null;
  if (kpi.delta === 0) return { text: "= sin cambio", tone: "neutral" };

  const sign = kpi.delta > 0 ? "+" : "−";
  const magnitude = Math.abs(kpi.delta);
  const body = kpi.unit === "pct" ? `${numberFormat.format(magnitude)} pp` : formatKpiValue(magnitude, kpi.unit);
  const improved = kpi.higherIsBetter === false ? kpi.delta < 0 : kpi.delta > 0;
  return { text: `${sign}${body}`, tone: kpi.higherIsBetter === undefined ? "neutral" : improved ? "good" : "bad" };
}
