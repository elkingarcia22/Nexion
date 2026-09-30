import { num, pct, round2, variationPct, type Health } from "../radar/math";
import type { Period } from "../periods";
import type { PulseConfig } from "./config";
import type { PulseTickets } from "./jira";
import type { PulseCases } from "./slack-lists";
import type { PulseWindow } from "./sql";

type Row = Record<string, unknown>;

export interface PulseMonth {
  month: string;
  contracted: number;
  withUsage: number;
  usagePct: number | null;
  nsm: number;
  nsmPct: number | null;
  atRisk: number;
  arr: number;
  arrNsm: number;
  activity: Record<string, number>;
}

export interface NewArr {
  arr: number;
  deals: number;
  companies: number;
}

export interface Profitability {
  month: string;
  arrMonth: number;
  arrAccumulated: number;
  spendAccumulated: number;
  /** Accumulated ARR over accumulated spend, %; null without recorded spend. */
  recoveryPct: number | null;
  balance: number;
}

export interface CompanyChange {
  name: string;
  risk: string;
  arr: number;
  usedThisMonth: boolean;
  change: "gano_nsm" | "perdio_nsm" | "en_riesgo" | "nueva";
}

export interface PulseData {
  period: Period;
  window: PulseWindow;
  current: PulseMonth;
  previous: PulseMonth | null;
  newArr: { current: NewArr; previous: NewArr };
  profitability: Profitability | null;
  companies: { lostNsm: CompanyChange[]; gainedNsm: CompanyChange[]; atRisk: CompanyChange[]; newlyContracted: number };
  tickets: PulseTickets | null;
  /** Customer cases and feedback from the product's Slack List. */
  cases: PulseCases | null;
  health: Health;
}

export function toMonth(row: Row, config: PulseConfig): PulseMonth {
  const contracted = num(row.empresas_contratadas);
  return {
    month: String(row.mes ?? ""),
    contracted,
    withUsage: num(row.empresas_con_uso),
    usagePct: pct(num(row.empresas_con_uso), contracted),
    nsm: num(row.empresas_nsm),
    nsmPct: pct(num(row.empresas_nsm), contracted),
    atRisk: num(row.empresas_en_riesgo),
    arr: round2(num(row.arr_producto)),
    arrNsm: round2(num(row.arr_empresas_nsm)),
    activity: Object.fromEntries(config.activity.map((metric) => [metric.key, num(row[metric.key])])),
  };
}

export function toNewArr(rows: Row[]): { current: NewArr; previous: NewArr } {
  const pick = (period: string): NewArr => {
    const row = rows.find((r) => r.periodo === period);
    return { arr: round2(num(row?.nuevo_arr)), deals: num(row?.negocios), companies: num(row?.empresas) };
  };
  return { current: pick("actual"), previous: pick("anterior") };
}

export function toProfitability(rows: Row[]): Profitability | null {
  const row = rows[0];
  if (!row) return null;
  const arrAccumulated = round2(num(row.arr_acumulado));
  const spendAccumulated = round2(num(row.gasto_acumulado));
  return {
    month: String(row.mes ?? ""),
    arrMonth: round2(num(row.arr_mes)),
    arrAccumulated,
    spendAccumulated,
    recoveryPct: spendAccumulated > 0 ? pct(arrAccumulated, spendAccumulated) : null,
    balance: round2(arrAccumulated - spendAccumulated),
  };
}

export function toCompanyChanges(rows: Row[]): PulseData["companies"] {
  const all = rows.map(
    (row): CompanyChange => ({
      name: String(row.empresa ?? "Empresa sin nombre"),
      risk: String(row.riesgo ?? ""),
      arr: round2(num(row.arr)),
      usedThisMonth: num(row.con_uso) > 0,
      change: (["gano_nsm", "perdio_nsm", "en_riesgo", "nueva"].includes(String(row.cambio)) ? row.cambio : "en_riesgo") as CompanyChange["change"],
    })
  );
  const of = (change: CompanyChange["change"]) => all.filter((company) => company.change === change);
  return { lostNsm: of("perdio_nsm"), gainedNsm: of("gano_nsm"), atRisk: of("en_riesgo"), newlyContracted: of("nueva").length };
}

/** Deterministic reading: losing NSM companies or a growing risk list is what needs attention. */
export function pulseHealth(current: PulseMonth, previous: PulseMonth | null, tickets: PulseTickets | null): Health {
  const nsmChange = previous ? current.nsm - previous.nsm : 0;
  const nsmVariation = previous ? variationPct(current.nsm, previous.nsm) : null;
  const riskShare = pct(current.atRisk, Math.max(current.nsm, 1)) ?? 0;
  if (nsmChange <= -3 || (nsmVariation !== null && nsmVariation <= -10) || riskShare >= 20) return "red";
  const usageDrop = previous ? variationPct(current.withUsage, previous.withUsage) : null;
  if (nsmChange < 0 || (previous && current.atRisk > previous.atRisk) || (usageDrop !== null && usageDrop <= -10) || (tickets?.active.length ?? 0) >= 5) {
    return "yellow";
  }
  return "green";
}

export function buildPulseData(
  config: PulseConfig,
  period: Period,
  window: PulseWindow,
  sources: { summary: Row[]; companies: Row[]; newArr: Row[]; profitability: Row[]; tickets: PulseTickets | null; cases?: PulseCases | null }
): PulseData | null {
  const currentRow = sources.summary.find((row) => row.mes === window.month);
  if (!currentRow) return null;
  const previousRow = sources.summary.find((row) => row.mes === window.previousMonth);
  const current = toMonth(currentRow, config);
  const previous = previousRow ? toMonth(previousRow, config) : null;
  return {
    period,
    window,
    current,
    previous,
    newArr: toNewArr(sources.newArr),
    profitability: toProfitability(sources.profitability),
    companies: toCompanyChanges(sources.companies),
    tickets: sources.tickets,
    cases: sources.cases ?? null,
    health: pulseHealth(current, previous, sources.tickets),
  };
}
