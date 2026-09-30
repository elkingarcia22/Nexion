import { REPORT_TYPE_LABELS, type ReportType } from "../periods";
import { monthName } from "../pulse/message";
import { bar, deltaCount, deltaPct, deltaPp, fmt, fmtPct, fmtUsd, plural } from "../radar/format";
import type { Health } from "../radar/math";
import type { RadarAnalysis } from "../radar/types";
import { SECTION_SEPARATOR } from "../report-engine";
import type { RollupData } from "./gather";
import type { SeriesPoint } from "./series";

/** Slack mrkdwn for the monthly, quarterly, semiannual and annual reports. */
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const HEALTH_LINE: Record<Health, string> = {
  green: ":large_green_circle: Evolución favorable",
  yellow: ":large_yellow_circle: Seguimiento recomendado",
  red: ":red_circle: Atención prioritaria",
};
const OWNER_LABEL = { product: "Producto", design: "Diseño", engineering: "Ingeniería", data: "Datos" } as const;
const DIRECTION_LABEL = { increase: "aumentar", decrease: "disminuir", stable: "mantener", investigate: "investigar" } as const;
const TOP_FEATURES = 5;
const TOP_SCREENS = 3;
const TOP_COMPANIES = 4;

/** "S37", "S37-38", "sep", "T3" — compact labels for a series line. */
export function shortLabel(point: Pick<SeriesPoint, "type" | "periodKey">): string {
  const key = point.periodKey;
  if (point.type === "radar_semanal") return `S${key.slice(6)}`;
  if (point.type === "pulso_quincenal") return `S${key.slice(6, 8)}-${key.slice(10)}`;
  if (point.type === "mensual") return MONTHS[Number(key.slice(5, 7)) - 1];
  if (point.type === "trimestral") return `T${key.slice(6)}`;
  if (point.type === "semestral") return `S${key.slice(6)}`;
  return key;
}

/** "S37: 41 → S38: 45 → S39: 41" for one KPI across child reports of one type. */
export function seriesLine(series: SeriesPoint[], type: ReportType, kpi: string, format: (value: number | null) => string): string | null {
  const points = series.filter((point) => point.type === type && point.kpis[kpi] !== undefined);
  return points.length ? points.map((point) => `${shortLabel(point)}: ${format(point.kpis[kpi] ?? null)}`).join(" → ") : null;
}

function header(data: RollupData, productName: string, analysis: RadarAnalysis | null): string {
  const { window, children } = data;
  return [
    `:bar_chart: *${productName.toUpperCase()} · REPORTE ${REPORT_TYPE_LABELS[data.level].toUpperCase()}*`,
    `:date: ${window.period.label}${window.partial ? " · periodo en curso (parcial)" : ""} · comparado con ${window.previous.label}`,
    `:jigsaw: Construido con ${fmt(children.found.length)} de ${plural(children.expected, "reporte", "reportes")} de nivel inferior${children.missing.length ? ` (faltan ${children.missing.length})` : ""}`,
    analysis ? ":sparkles: Lectura asistida por Claude y contrastada con los datos del periodo." : ":information_source: Lectura calculada solo con los datos (el análisis con IA no estuvo disponible).",
  ].join("\n");
}

function executive(data: RollupData, productName: string, analysis: RadarAnalysis | null, health: Health): string {
  const b = data.business?.current;
  const u = data.behaviour?.summary.current;
  const fallbackHeadline = u ? `${fmt(u.users)} usuarios de ${fmt(u.companies)} empresas usaron ${productName} en el periodo` : b ? `${fmt(b.nsm)} empresas cumplen el criterio NSM al cierre del periodo` : `Resumen de ${productName}`;
  return [
    ":compass: *ESTADO GENERAL*",
    HEALTH_LINE[health],
    `*${analysis?.headline ?? fallbackHeadline}*`,
    analysis?.summary ?? "Revisar la evolución de los reportes del periodo y las empresas que cambiaron de criterio NSM.",
  ].join("\n\n");
}

function behaviourSection(data: RollupData): string | null {
  const b = data.behaviour;
  if (!b) return null;
  const { current: c, previous: p } = b.summary;
  const weekly = [
    seriesLine(data.series, "radar_semanal", "active_users", (v) => fmt(v)),
    seriesLine(data.series, "mensual", "active_users", (v) => fmt(v)),
  ].find(Boolean);
  return [
    ":office: *USO DEL PRODUCTO (POSTHOG, PERIODO COMPLETO)*",
    [
      `:bust_in_silhouette: Usuarios únicos: *${fmt(c.users)}* · ${deltaPct(c.users, p.users)} · vs. ${fmt(p.users)}`,
      `:office: Empresas únicas: *${fmt(c.companies)}* · ${deltaPct(c.companies, p.companies)} · vs. ${fmt(p.companies)}`,
      `:desktop_computer: Sesiones: *${fmt(c.sessions)}* · ${deltaPct(c.sessions, p.sessions)}`,
      `:zap: Sesiones con una acción clave: *${fmtPct(c.keyActionSessionsPct)}* · ${deltaPp(c.keyActionSessionsPct !== null && p.keyActionSessionsPct !== null ? c.keyActionSessionsPct - p.keyActionSessionsPct : null)}`,
    ].join("\n"),
    ...(weekly ? [`Evolución de usuarios activos: ${weekly}`] : []),
  ].join("\n\n");
}

function featuresAndFunnel(data: RollupData): string | null {
  const b = data.behaviour;
  if (!b) return null;
  const features = b.features.filter((f) => f.users > 0).slice(0, TOP_FEATURES);
  const f = b.funnel;
  const conversionLine = seriesLine(data.series, "radar_semanal", "funnel_complete_pct", fmtPct) ?? seriesLine(data.series, "mensual", "funnel_complete_pct", fmtPct);
  return [
    ":jigsaw: *FUNCIONALIDADES Y FUNNEL*",
    features.map((feature) => `${bar(feature.reachPct)} ${feature.label} · ${plural(feature.users, "usuario", "usuarios")} · alcance ${fmtPct(feature.reachPct)} ${deltaPp(feature.reachDeltaPp)}`).join("\n"),
    [
      `:inbox_tray: Inicios del funnel: *${fmt(f.current.starts)}* · ${deltaPct(f.current.starts, f.previous.starts)}`,
      `:chart_with_upwards_trend: Conversión completa: *${fmtPct(f.current.completePct)}* · ${deltaPp(f.current.completePct !== null && f.previous.completePct !== null ? f.current.completePct - f.previous.completePct : null)}`,
      ...(f.mainDropoff ? [`:warning: Mayor pérdida: antes de ${f.mainDropoff.beforeStep} (${fmtPct(f.mainDropoff.dropoffPct)})`] : []),
      ...(conversionLine ? [`Evolución de la conversión: ${conversionLine}`] : []),
    ].join("\n"),
  ].join("\n\n");
}

function frictionSection(data: RollupData): string | null {
  const screens = data.behaviour?.friction.screens.slice(0, TOP_SCREENS) ?? [];
  const persistent = data.persistentScreens.slice(0, TOP_SCREENS);
  if (!screens.length && !persistent.length) return null;
  const childNoun = data.level === "mensual" ? ["semana", "semanas"] : ["periodo", "periodos"];
  return [
    ":warning: *FRICCIÓN*",
    ...(persistent.length
      ? [["*Persistente*", ...persistent.map((s) => `• ${s.label} · entre las de más fricción en ${plural(s.appearances, childNoun[0], childNoun[1])}${s.averageFrictionPct !== null ? ` · promedio ${fmtPct(s.averageFrictionPct)}` : ""}`)].join("\n")]
      : []),
    ...(screens.length
      ? [["*En el periodo completo*", ...screens.map((s) => `${bar(s.frictionPct)} ${s.label} · ${fmtPct(s.frictionPct)} de ${plural(s.sessions, "sesión", "sesiones")}`)].join("\n")]
      : []),
    "_Dead clicks, rage clicks y 404 son señales por validar, no causas demostradas._",
  ].join("\n\n");
}

function businessSection(data: RollupData): string | null {
  const b = data.business;
  if (!b) return null;
  const c = b.current;
  const p = b.previous;
  const nsmSeries = seriesLine(data.series, "pulso_quincenal", "nsm_companies", (v) => fmt(v)) ?? seriesLine(data.series, "mensual", "nsm_companies", (v) => fmt(v)) ?? seriesLine(data.series, "trimestral", "nsm_companies", (v) => fmt(v));
  const profit = b.profitability;
  return [
    `:star: *NEGOCIO AL CIERRE (${monthName(data.window.closeMonth).toUpperCase()})*`,
    [
      `:office: Empresas con el producto: *${fmt(c.contracted)}* ${deltaCount(c.contracted, p?.contracted)}`,
      `:star: Con criterio NSM: *${fmt(c.nsm)}* (${fmtPct(c.nsmPct)}) ${deltaCount(c.nsm, p?.nsm)}`,
      `:warning: En riesgo de perderlo: *${fmt(c.atRisk)}* ${deltaCount(c.atRisk, p?.atRisk, false)}`,
      `:moneybag: ARR del producto: *${fmtUsd(c.arr)}* · de empresas con criterio NSM ${fmtUsd(c.arrNsm)}`,
      `:handshake: ARR reconocido en HubSpot en el periodo: *${fmtUsd(b.newArr.current.arr)}* · periodo anterior ${fmtUsd(b.newArr.previous.arr)}`,
      ...(profit
        ? [profit.spendAccumulated > 0 ? `:chart_with_upwards_trend: Recuperación del gasto acumulado: ${fmtPct(profit.recoveryPct)} · balance ${fmtUsd(profit.balance)}` : `:chart_with_upwards_trend: ARR acumulado ${fmtUsd(profit.arrAccumulated)}; sin gasto registrado.`]
        : []),
    ].join("\n"),
    ...(nsmSeries ? [`Evolución del criterio NSM: ${nsmSeries}`] : []),
  ].join("\n\n");
}

function companiesSection(data: RollupData): string | null {
  const b = data.business;
  if (!b) return null;
  const { lostNsm, atRisk, gainedNsm } = b.companies;
  const line = (list: typeof lostNsm) => list.slice(0, TOP_COMPANIES).map((c) => `• *${c.name}* · ${fmtUsd(c.arr)}`).join("\n");
  const parts = [
    lostNsm.length ? `:small_red_triangle_down: Perdieron el criterio NSM (${fmt(lostNsm.length)})\n${line(lostNsm)}` : "",
    atRisk.length ? `:warning: En riesgo (${fmt(atRisk.length)})\n${line(atRisk)}` : "",
    gainedNsm.length ? `:small_red_triangle: Lo alcanzaron (${fmt(gainedNsm.length)})\n${line(gainedNsm)}` : "",
  ].filter(Boolean);
  return parts.length ? [":office: *EMPRESAS A SEGUIR*", ...parts].join("\n\n") : null;
}

function actionReview(data: RollupData): string {
  const a = data.actions;
  const closed = a.closedInPeriod;
  return [
    ":clipboard: *REVISIÓN DE ACCIONES*",
    [
      `${plural(a.createdInPeriod, "acción propuesta", "acciones propuestas")} en el periodo · ${plural(closed.length, "cerrada", "cerradas")} · ${plural(a.openAtClose.length, "abierta", "abiertas")} al cierre`,
      ...(closed.length ? closed.slice(0, 4).map((c) => `• ${c.status === "done" ? "✓" : "✕"} ${c.title}${c.result ? ` — ${c.result}` : ""}`) : []),
      ...(a.closedWithoutResult ? [`_${plural(a.closedWithoutResult, "acción cerrada no tiene", "acciones cerradas no tienen")} resultado registrado: regístralo en Nexión para medir su impacto._`] : []),
    ].join("\n"),
  ].join("\n\n");
}

function priorities(analysis: RadarAnalysis): string {
  return [
    ":dart: *PRIORIDADES DEL SIGUIENTE PERIODO*",
    ...analysis.actions.map((a, index) =>
      [`${index + 1}. *${a.title}*`, `Evidencia: ${a.evidence}`, `Próximo paso: ${a.nextStep}`, `${a.continuesActionKey ? "↻ En seguimiento" : "+ Nueva"} · Responsable: ${OWNER_LABEL[a.owner]}`].join("\n")
    ),
  ].join("\n\n");
}

export function buildRollupMessage(data: RollupData, productName: string, analysis: RadarAnalysis | null, health: Health, url?: string): string {
  const sections = [
    header(data, productName, analysis),
    executive(data, productName, analysis, health),
    behaviourSection(data),
    featuresAndFunnel(data),
    frictionSection(data),
    businessSection(data),
    companiesSection(data),
    actionReview(data),
    analysis?.actions.length ? priorities(analysis) : null,
    analysis?.watch_next.length ? [":eyes: *MONITOREAR*", analysis.watch_next.map((w) => `• ${w.metric} · objetivo: ${DIRECTION_LABEL[w.direction]}`).join("\n")].join("\n\n") : null,
    [":white_check_mark: *CIERRE*", analysis?.closing || "Definir el foco del siguiente periodo a partir de las empresas en riesgo y las fricciones persistentes.", ...(url ? [`<${url}|Ver el reporte completo en Nexión>`] : [])].join("\n\n"),
  ];
  return sections.filter((section): section is string => Boolean(section)).join(SECTION_SEPARATOR);
}
