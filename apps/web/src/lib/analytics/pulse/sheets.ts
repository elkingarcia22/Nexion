import type { SupabaseClient } from "@supabase/supabase-js";
import { listSheetTabs, readSheetValues, resolveSheetsAccessToken } from "../google-sheets";
import type { PulseConfig } from "./config";
import type { PulseWindow } from "./sql";

/**
 * OKRs ("OKRs Tecnología 2026", one tab per quarter) and implementation feedback ("Roadmap Talent
 * Q4-H1" → "Info desde Implementación"), as the n8n pulses read them.
 */
export const OKR_SPREADSHEET = "1_2xmTZTSNKdjYO1oJ1H79UCQ6rlOQvwxXfOUdV6tbUI";
export const FEEDBACK_SPREADSHEET = "1D3J-V6LRHUiV7pEd3P1XZBeno2BtriPpLfdSoKP9Jcs";
export const FEEDBACK_TAB = "Info desde Implementación";
const MAX_LISTED = 6;
const DONE = ["si", "sí", "hecho", "resuelto", "cerrado", "listo", "done", "true", "x"];
const UNDEFINED_TARGET = /generar\s+(xx|\$x|x)\b|por definir|sin meta/i;
const PAIN_RANK: Record<string, number> = { alto: 0, alta: 0, medio: 1, media: 1, bajo: 2, baja: 2 };

export interface KeyResult {
  squad: string;
  objective: string;
  keyResult: string;
  weight: number | null;
  progressPct: number | null;
  hasTarget: boolean;
  result: string | null;
}

export interface PulseOkrs {
  tab: string;
  keyResults: KeyResult[];
  /** Σ(weight · progress) / Σweight over KRs with a defined target and weight. */
  weightedProgressPct: number | null;
  mostAdvanced: KeyResult | null;
  biggestGap: KeyResult | null;
  withoutTarget: number;
}

export interface FeedbackItem {
  client: string;
  need: string;
  category: string | null;
  pain: string | null;
  date: string | null;
  done: boolean;
}

export interface PulseFeedback {
  inPeriod: number;
  openInPeriod: number;
  resolvedInPeriod: number;
  /** Open needs without a date: the backlog the team still carries. */
  undatedOpen: number;
  top: FeedbackItem[];
}

const norm = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Rows as objects keyed by the header row (the first row that contains `marker`). */
export function toRecords(values: string[][], marker: string): Array<Record<string, string>> {
  const headerIndex = values.findIndex((row) => row.some((cell) => norm(cell) === norm(marker)));
  if (headerIndex < 0) return [];
  const header = values[headerIndex].map((cell) => norm(cell));
  return values.slice(headerIndex + 1).map((row) => Object.fromEntries(header.map((name, index) => [name, (row[index] ?? "").trim()])));
}

/** "45%", "0,45", "0.45" or "45" → 45. */
export function parsePercent(value: string): number | null {
  const cleaned = value.replace("%", "").replace(",", ".").trim();
  if (!cleaned) return null;
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return null;
  const pctValue = !value.includes("%") && number <= 1 ? number * 100 : number;
  return Math.round(Math.min(Math.max(pctValue, 0), 100) * 10) / 10;
}

function mentions(text: string, terms: string[]): boolean {
  const haystack = norm(text);
  return terms.some((term) => haystack.includes(norm(term)));
}

/** The quarter's tab (Q3 for July–September), else the last tab that looks like a quarter. */
export function pickQuarterTab(tabs: string[], periodEnd: string): string | null {
  const quarter = `Q${Math.floor((Number(periodEnd.slice(5, 7)) - 1) / 3) + 1}`;
  const exact = tabs.find((tab) => norm(tab) === norm(quarter)) ?? tabs.find((tab) => new RegExp(`\\b${quarter}\\b`, "i").test(tab));
  return exact ?? [...tabs].reverse().find((tab) => /\bQ[1-4]\b/i.test(tab)) ?? null;
}

export function parseOkrs(values: string[][], tab: string, terms: string[]): PulseOkrs {
  const records = toRecords(values, "Key Result");
  let squad = "";
  let objective = "";
  let why = "";
  const keyResults: KeyResult[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    // Merged cells: squad, objective and its "why" apply to the rows below until they change.
    squad = record["squad"] || squad;
    objective = record["objetivo"] || objective;
    why = record["¿porque el objetivo es esencial para la compania?"] || why;
    const keyResult = record["key result"];
    if (!keyResult || seen.has(keyResult)) continue;
    if (!mentions([squad, objective, why, keyResult, record["comentarios"] ?? "", record["impacto"] ?? ""].join(" "), terms)) continue;
    seen.add(keyResult);
    const weight = parsePercent(record["peso"] ?? "");
    keyResults.push({
      squad,
      objective,
      keyResult,
      weight,
      progressPct: parsePercent(record["avance"] ?? ""),
      hasTarget: !UNDEFINED_TARGET.test(keyResult),
      result: record["resultado"] || null,
    });
  }

  const weighted = keyResults.filter((kr) => kr.hasTarget && (kr.weight ?? 0) > 0 && kr.progressPct !== null);
  const totalWeight = weighted.reduce((sum, kr) => sum + (kr.weight ?? 0), 0);
  const measured = keyResults.filter((kr) => kr.hasTarget && kr.progressPct !== null);
  const byProgress = [...measured].sort((a, b) => (b.progressPct ?? 0) - (a.progressPct ?? 0));
  return {
    tab,
    keyResults,
    weightedProgressPct: totalWeight ? Math.round((weighted.reduce((sum, kr) => sum + (kr.weight ?? 0) * (kr.progressPct ?? 0), 0) / totalWeight) * 10) / 10 : null,
    mostAdvanced: byProgress[0] ?? null,
    biggestGap: byProgress[byProgress.length - 1] ?? null,
    withoutTarget: keyResults.filter((kr) => !kr.hasTarget).length,
  };
}

/** dd/mm/yyyy or yyyy-mm-dd → yyyy-mm-dd. */
export function parseSheetDate(value: string): string | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return dmy ? `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}` : null;
}

export function parseFeedback(values: string[][], terms: string[], w: PulseWindow): PulseFeedback {
  const records = toRecords(values, "Fecha").filter((record) => mentions(record["producto(s)"] ?? "", terms));
  const items = records
    .map(
      (record): FeedbackItem => ({
        client: record["cliente"] || "Sin cliente",
        need: record["explicacion de la necesidad"] ?? "",
        category: record["categoria"] || null,
        pain: record["dolor del cliente"] || null,
        date: parseSheetDate(record["fecha"] ?? ""),
        done: DONE.includes(norm(record["¿hecho?"] ?? "")),
      })
    )
    .filter((item) => item.need);
  const inPeriod = items.filter((item) => item.date && item.date >= w.start && item.date <= w.end);
  const open = items.filter((item) => !item.done);
  const rank = (item: FeedbackItem) => PAIN_RANK[norm(item.pain ?? "")] ?? 3;
  return {
    inPeriod: inPeriod.length,
    openInPeriod: inPeriod.filter((item) => !item.done).length,
    resolvedInPeriod: inPeriod.filter((item) => item.done).length,
    undatedOpen: open.filter((item) => !item.date).length,
    top: [...open].sort((a, b) => rank(a) - rank(b) || (b.date ?? "").localeCompare(a.date ?? "")).slice(0, MAX_LISTED),
  };
}

export async function fetchPulseSheets(db: SupabaseClient, config: PulseConfig, w: PulseWindow): Promise<{ okrs: PulseOkrs | null; feedback: PulseFeedback | null }> {
  const token = await resolveSheetsAccessToken(db);
  const tab = pickQuarterTab(await listSheetTabs(token, OKR_SPREADSHEET), w.end);
  const [okrValues, feedbackValues] = await Promise.all([
    tab ? readSheetValues(token, OKR_SPREADSHEET, tab) : Promise.resolve(null),
    readSheetValues(token, FEEDBACK_SPREADSHEET, FEEDBACK_TAB),
  ]);
  return {
    okrs: tab && okrValues ? parseOkrs(okrValues, tab, config.okrTerms) : null,
    feedback: parseFeedback(feedbackValues, config.feedbackTerms, w),
  };
}
