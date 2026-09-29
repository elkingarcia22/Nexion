/**
 * Period math for the nested product reports. All dates are calendar dates (YYYY-MM-DD) in
 * Bogotá; weeks are ISO weeks (Monday–Sunday), so a week belongs to the year of its Thursday.
 */
export type ReportType = "radar_semanal" | "pulso_quincenal" | "mensual" | "trimestral" | "semestral" | "anual";

export interface Period {
  type: ReportType;
  /** 2026-W40 · 2026-W39-W40 · 2026-09 · 2026-Q3 · 2026-H2 · 2026 */
  key: string;
  start: string;
  end: string;
  /** Human label in Spanish, e.g. "Semana 40 · 28 sep – 4 oct 2026". */
  label: string;
}

export const REPORT_TYPES: ReportType[] = ["radar_semanal", "pulso_quincenal", "mensual", "trimestral", "semestral", "anual"];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  radar_semanal: "Radar semanal",
  pulso_quincenal: "Pulso quincenal",
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const DAY_MS = 86_400_000;
const BOGOTA_OFFSET_MS = 5 * 3_600_000;
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** A UTC-midnight Date for a calendar date. */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function iso(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseIso(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return utcDate(y, m - 1, d);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function shortDate(date: Date, withYear = false): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${withYear ? ` ${date.getUTCFullYear()}` : ""}`;
}

/** Calendar date in Bogotá for an instant. */
export function bogotaDate(now: Date): Date {
  const shifted = new Date(now.getTime() - BOGOTA_OFFSET_MS);
  return utcDate(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

/** ISO week number and week-year of a calendar date. */
export function isoWeek(date: Date): { year: number; week: number } {
  const dayOfWeek = (date.getUTCDay() + 6) % 7; // Monday = 0
  const thursday = addDays(date, 3 - dayOfWeek);
  const year = thursday.getUTCFullYear();
  const firstThursday = addDays(utcDate(year, 0, 4), 3 - ((utcDate(year, 0, 4).getUTCDay() + 6) % 7));
  return { year, week: 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS)) };
}

function mondayOfIsoWeek(year: number, week: number): Date {
  const jan4 = utcDate(year, 0, 4);
  const week1Monday = addDays(jan4, -((jan4.getUTCDay() + 6) % 7));
  return addDays(week1Monday, (week - 1) * 7);
}

function weekPeriod(year: number, week: number): Period {
  const start = mondayOfIsoWeek(year, week);
  const end = addDays(start, 6);
  return {
    type: "radar_semanal",
    key: `${year}-W${pad(week)}`,
    start: iso(start),
    end: iso(end),
    label: `Semana ${week} · ${shortDate(start)} – ${shortDate(end, true)}`,
  };
}

/** Biweekly pulses pair ISO weeks (1–2, 3–4, …); week 53 closes alone. */
function biweekPeriod(year: number, week: number): Period {
  const first = week % 2 === 1 ? week : week - 1;
  const second = first + 1;
  const start = mondayOfIsoWeek(year, first);
  const hasSecond = isoWeek(mondayOfIsoWeek(year, second)).year === year;
  const end = addDays(start, hasSecond ? 13 : 6);
  return {
    type: "pulso_quincenal",
    key: hasSecond ? `${year}-W${pad(first)}-W${pad(second)}` : `${year}-W${pad(first)}`,
    start: iso(start),
    end: iso(end),
    label: `Quincena ${shortDate(start)} – ${shortDate(end, true)}`,
  };
}

function monthPeriod(year: number, month: number): Period {
  return {
    type: "mensual",
    key: `${year}-${pad(month + 1)}`,
    start: iso(utcDate(year, month, 1)),
    end: iso(utcDate(year, month + 1, 0)),
    label: `${MONTH_NAMES[month]} ${year}`,
  };
}

function quarterPeriod(year: number, quarter: number): Period {
  return {
    type: "trimestral",
    key: `${year}-Q${quarter}`,
    start: iso(utcDate(year, (quarter - 1) * 3, 1)),
    end: iso(utcDate(year, quarter * 3, 0)),
    label: `Q${quarter} ${year}`,
  };
}

function semesterPeriod(year: number, half: number): Period {
  return {
    type: "semestral",
    key: `${year}-H${half}`,
    start: iso(utcDate(year, (half - 1) * 6, 1)),
    end: iso(utcDate(year, half * 6, 0)),
    label: `${half === 1 ? "Primer" : "Segundo"} semestre ${year}`,
  };
}

function yearPeriod(year: number): Period {
  return { type: "anual", key: `${year}`, start: `${year}-01-01`, end: `${year}-12-31`, label: `Año ${year}` };
}

/** The period of a given type that contains a calendar date. */
export function periodContaining(type: ReportType, date: Date): Period {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  switch (type) {
    case "radar_semanal": {
      const { year: weekYear, week } = isoWeek(date);
      return weekPeriod(weekYear, week);
    }
    case "pulso_quincenal": {
      const { year: weekYear, week } = isoWeek(date);
      return biweekPeriod(weekYear, week);
    }
    case "mensual":
      return monthPeriod(year, month);
    case "trimestral":
      return quarterPeriod(year, Math.floor(month / 3) + 1);
    case "semestral":
      return semesterPeriod(year, month < 6 ? 1 : 2);
    case "anual":
      return yearPeriod(year);
  }
}

/** The last fully finished period of a type before `now` (what a scheduled run reports on). */
export function lastCompletedPeriod(type: ReportType, now: Date): Period {
  const today = bogotaDate(now);
  const current = periodContaining(type, today);
  // A period that ends today is complete at the end of the day; runs report on the one that already closed.
  return periodContaining(type, addDays(parseIso(current.start), -1));
}

/** Which lower-level report type a level is built from. */
export const CHILD_TYPE: Partial<Record<ReportType, ReportType>> = {
  mensual: "radar_semanal",
  trimestral: "mensual",
  semestral: "trimestral",
  anual: "trimestral",
};

/**
 * Child periods that make up a period. A week (or pulse) belongs to the month that contains its
 * Thursday / last day respectively, so every week is counted in exactly one month.
 */
export function childPeriods(period: Period, childType: ReportType): Period[] {
  const start = parseIso(period.start);
  const end = parseIso(period.end);
  const children = new Map<string, Period>();
  for (let day = start; day.getTime() <= end.getTime(); day = addDays(day, 1)) {
    const child = periodContaining(childType, day);
    const anchor = childType === "radar_semanal" ? addDays(parseIso(child.start), 3) : parseIso(child.end);
    if (anchor.getTime() >= start.getTime() && anchor.getTime() <= end.getTime()) children.set(child.key, child);
  }
  return Array.from(children.values());
}
