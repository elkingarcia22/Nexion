/** es-CO number formatting and small Slack visual helpers for the radar message. */
const BAR_CELLS = 10;

export function fmt(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/D";
  return value.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(value: number | null | undefined): string {
  return value === null || value === undefined ? "N/D" : `${fmt(value, 1)}%`;
}

/** ▲ +4,1% with a colored circle, for counts where up is good (or bad when inverted). */
export function deltaPct(current: number, previous: number, higherIsBetter = true): string {
  if (previous === 0) return current === 0 ? ":white_circle: → 0%" : ":white_circle: nuevo";
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.05) return ":white_circle: → 0%";
  const good = change > 0 === higherIsBetter;
  return `${good ? ":large_green_circle:" : ":red_circle:"} ${change > 0 ? "▲ +" : "▼ "}${fmt(change, 1)}%`;
}

export function deltaPp(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (Math.abs(value) < 0.05) return "→ 0 pp";
  return `${value > 0 ? "▲ +" : "▼ "}${fmt(value, 1)} pp`;
}

export function bar(pctValue: number | null | undefined): string {
  const filled = Math.max(0, Math.min(BAR_CELLS, Math.round(((pctValue ?? 0) / 100) * BAR_CELLS)));
  return "█".repeat(filled) + "░".repeat(BAR_CELLS - filled);
}

export function plural(count: number, one: string, many: string): string {
  return `${fmt(count)} ${count === 1 ? one : many}`;
}

export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
