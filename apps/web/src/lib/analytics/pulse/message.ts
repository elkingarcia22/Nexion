import { SECTION_SEPARATOR } from "../report-engine";
import type { Health } from "../radar/math";
import { bar, deltaCount, deltaPct, fmt, fmtPct, fmtUsd, plural } from "../radar/format";
import type { RadarAnalysis } from "../radar/types";
import type { PulseConfig } from "./config";
import type { CompanyChange, PulseData } from "./metrics";

/** Slack mrkdwn for the biweekly pulse; every number comes from PulseData. */
const TOP_COMPANIES = 4;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const HEALTH_LINE: Record<Health, string> = {
  green: ":large_green_circle: Evolución favorable",
  yellow: ":large_yellow_circle: Seguimiento recomendado",
  red: ":red_circle: Atención prioritaria",
};
const OWNER_LABEL = { product: "Producto", design: "Diseño", engineering: "Ingeniería", data: "Datos" } as const;
const DIRECTION_LABEL = { increase: "aumentar", decrease: "disminuir", stable: "mantener", investigate: "investigar" } as const;

export function monthName(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${year}`;
}

function header(data: PulseData, config: PulseConfig, analysis: RadarAnalysis | null): string {
  const month = monthName(data.window.month);
  return [
    `:large_blue_diamond: *${config.productName.toUpperCase()} · PULSO QUINCENAL*`,
    `:date: ${data.period.label}`,
    `:hourglass_flowing_sand: Datos de negocio de ${month}${data.window.monthIsPartial ? " (mes en curso, cifras parciales al corte)" : ""}`,
    analysis
      ? ":sparkles: Lectura asistida por Claude sobre BigQuery, HubSpot y Jira."
      : ":information_source: Lectura calculada solo con los datos (el análisis con IA no estuvo disponible).",
  ].join("\n");
}

function executive(data: PulseData, config: PulseConfig, analysis: RadarAnalysis | null, health: Health): string {
  const c = data.current;
  return [
    ":compass: *LECTURA EJECUTIVA*",
    HEALTH_LINE[health],
    `*${analysis?.headline ?? `${fmt(c.nsm)} de ${fmt(c.contracted)} empresas con ${config.productName} cumplen el criterio NSM`}*`,
    analysis?.summary ?? `${fmt(c.withUsage)} empresas usaron el producto en el mes y ${plural(c.atRisk, "empresa está", "empresas están")} en riesgo de perder el criterio NSM.`,
  ].join("\n\n");
}

function adoption(data: PulseData, config: PulseConfig): string {
  const c = data.current;
  const p = data.previous;
  return [
    ":bar_chart: *ADOPCIÓN Y CRITERIO NSM*",
    [
      `:office: Empresas con ${config.productName} contratado: *${fmt(c.contracted)}* ${deltaCount(c.contracted, p?.contracted)}`,
      `:zap: ${config.usageLabel}: *${fmt(c.withUsage)}* (${fmtPct(c.usagePct)}) ${deltaCount(c.withUsage, p?.withUsage)}${data.window.monthIsPartial ? " · mes parcial" : ""}`,
      `:star: Empresas con criterio NSM: *${fmt(c.nsm)}* (${fmtPct(c.nsmPct)}) ${deltaCount(c.nsm, p?.nsm)}`,
      `:warning: En riesgo de perder el criterio NSM: *${fmt(c.atRisk)}* ${deltaCount(c.atRisk, p?.atRisk, false)}`,
    ].join("\n"),
    [
      `Contratadas ${bar(100)} ${fmt(c.contracted)}`,
      `Con uso ${bar(c.usagePct)} ${fmtPct(c.usagePct)}`,
      `Criterio NSM ${bar(c.nsmPct)} ${fmtPct(c.nsmPct)}`,
    ].join("\n"),
    `_Criterio NSM: ${config.nsmCriterion}._`,
  ].join("\n\n");
}

function activity(data: PulseData, config: PulseConfig): string {
  const p = data.previous;
  return [
    `:gear: *ACTIVIDAD DEL MES*${data.window.monthIsPartial ? " _(parcial al corte)_" : ""}`,
    config.activity
      .map((metric) => {
        const value = data.current.activity[metric.key] ?? 0;
        const before = p?.activity[metric.key];
        return `• ${metric.label}: *${fmt(value)}*${before !== undefined ? ` · mes anterior ${fmt(before)}` : ""}`;
      })
      .join("\n"),
  ].join("\n\n");
}

function revenue(data: PulseData): string {
  const c = data.current;
  const { current: arrNow, previous: arrBefore } = data.newArr;
  const profit = data.profitability;
  const lines = [
    `:moneybag: ARR del producto (empresas contratadas): *${fmtUsd(c.arr)}* · de empresas con criterio NSM: ${fmtUsd(c.arrNsm)}`,
    `:handshake: ARR reconocido en HubSpot en la quincena: *${fmtUsd(arrNow.arr)}* (${plural(arrNow.deals, "negocio", "negocios")}) · quincena anterior ${fmtUsd(arrBefore.arr)} ${deltaPct(arrNow.arr, arrBefore.arr)}`,
  ];
  if (profit) {
    lines.push(
      profit.spendAccumulated > 0
        ? `:chart_with_upwards_trend: Rentabilidad preliminar: ARR acumulado ${fmtUsd(profit.arrAccumulated)} frente a gasto acumulado ${fmtUsd(profit.spendAccumulated)} · recuperación ${fmtPct(profit.recoveryPct)} · balance ${fmtUsd(profit.balance)}`
        : `:chart_with_upwards_trend: Rentabilidad preliminar: ARR acumulado ${fmtUsd(profit.arrAccumulated)}; no hay gasto registrado para calcular recuperación.`
    );
  }
  return [":dollar: *INGRESOS Y RENTABILIDAD PRELIMINAR*", lines.join("\n"), "_El ARR de HubSpot puede incluir negocios que agrupan varios productos._"].join("\n\n");
}

function companyLine(company: CompanyChange): string {
  return `• *${company.name}* · ${fmtUsd(company.arr)}${company.risk && company.risk !== "No NSM" && company.risk !== "Sin riesgo" ? ` · ${company.risk.toLowerCase()}` : ""}${company.usedThisMonth ? "" : " · sin uso este mes"}`;
}

function companies(data: PulseData): string {
  const { lostNsm, gainedNsm, atRisk, newlyContracted } = data.companies;
  const block = (title: string, list: CompanyChange[]) => (list.length ? [`${title} (${fmt(list.length)})`, ...list.slice(0, TOP_COMPANIES).map(companyLine)].join("\n") : "");
  const parts = [
    block(":small_red_triangle_down: Perdieron el criterio NSM", lostNsm),
    block(":warning: En riesgo de perderlo", atRisk),
    block(":small_red_triangle: Lo alcanzaron", gainedNsm),
    newlyContracted ? `:new: ${plural(newlyContracted, "empresa nueva", "empresas nuevas")} con el producto contratado` : "",
  ].filter(Boolean);
  return [":office: *EMPRESAS A SEGUIR*", parts.length ? parts.join("\n\n") : "No hubo cambios de criterio NSM ni empresas en riesgo este mes."].join("\n\n");
}

function support(data: PulseData): string | null {
  const t = data.tickets;
  if (!t) return null;
  const link = (ticket: { key: string; url: string; summary: string }) => `• <${ticket.url}|${ticket.key}> ${ticket.summary}`;
  return [
    ":tools: *SOPORTE (JIRA)*",
    `${plural(t.createdInPeriod, "ticket nuevo", "tickets nuevos")} en la quincena (${fmt(t.createdPrevious)} en la anterior) · ${plural(t.active.length, "activo", "activos")} · ${plural(t.resolvedInPeriod.length, "resuelto", "resueltos")} en la quincena`,
    ...(t.active.length ? ["*Activos*", t.active.slice(0, 4).map(link).join("\n")] : []),
  ].join("\n\n");
}

const STALE_LIST_DAYS = 30;

/** Customer cases and feedback from the product's Slack List, with a warning when the list is not kept up to date. */
export function casesSection(cases: PulseData["cases"], periodEnd: string): string | null {
  if (!cases) return null;
  const stale = cases.latestDate && (Date.parse(periodEnd) - Date.parse(cases.latestDate)) / 86_400_000 > STALE_LIST_DAYS;
  return [
    ":speech_balloon: *CASOS Y FEEDBACK DE CLIENTES (LISTA DE SLACK)*",
    [
      `${plural(cases.createdInPeriod, "caso nuevo", "casos nuevos")} en el periodo · ${plural(cases.pending, "pendiente", "pendientes")} en total`,
      ...(stale ? [`:warning: La lista no se actualiza desde el ${cases.latestDate}: los pendientes pueden no reflejar el estado actual.`] : []),
    ].join("\n"),
    ...(cases.pendingTop.length
      ? [["*Pendientes prioritarios*", ...cases.pendingTop.slice(0, 4).map((c) => `• *${c.client}* · ${c.title}${c.type ? ` (${c.type.toLowerCase()})` : ""}`)].join("\n")]
      : []),
  ].join("\n\n");
}

/** OKR progress of the quarter and implementation feedback (Google Sheets). */
export function okrSection(data: Pick<PulseData, "okrs" | "feedback">): string | null {
  const { okrs, feedback } = data;
  if (!okrs && !feedback) return null;
  const parts: string[] = [];
  if (okrs) {
    parts.push(
      okrs.keyResults.length
        ? [
            `Avance ponderado (${okrs.tab}): *${fmtPct(okrs.weightedProgressPct)}* ${bar(okrs.weightedProgressPct)}`,
            ...(okrs.mostAdvanced ? [`:white_check_mark: Más avanzado: ${okrs.mostAdvanced.keyResult} (${fmtPct(okrs.mostAdvanced.progressPct)})`] : []),
            ...(okrs.biggestGap && okrs.biggestGap !== okrs.mostAdvanced ? [`:chart_with_downwards_trend: Mayor brecha: ${okrs.biggestGap.keyResult} (${fmtPct(okrs.biggestGap.progressPct)})`] : []),
            ...(okrs.withoutTarget ? [`:compass: ${plural(okrs.withoutTarget, "KR sin meta definida", "KRs sin meta definida")}`] : []),
          ].join("\n")
        : `No hay KRs de este producto en la pestaña ${okrs.tab}.`
    );
  }
  if (feedback) {
    parts.push(
      [
        `*Feedback de implementación:* ${plural(feedback.inPeriod, "necesidad nueva", "necesidades nuevas")} en el periodo (${fmt(feedback.openInPeriod)} abiertas) · ${plural(feedback.undatedOpen, "abierta sin fecha", "abiertas sin fecha")} en el backlog`,
        ...feedback.top.slice(0, 3).map((item) => `• *${item.client}* · ${item.need.slice(0, 140)}${item.pain ? ` (dolor ${item.pain.toLowerCase()})` : ""}`),
      ].join("\n")
    );
  }
  return [":trophy: *OKRs Y FEEDBACK DE IMPLEMENTACIÓN*", ...parts].join("\n\n");
}

function actions(analysis: RadarAnalysis): string {
  return [
    ":dart: *ACCIONES*",
    ...analysis.actions.map((a, index) =>
      [
        `${index + 1}. *${a.title}*`,
        `Evidencia: ${a.evidence}`,
        `Próximo paso: ${a.nextStep}`,
        `${a.continuesActionKey ? "↻ En seguimiento" : "+ Nueva"} · Responsable: ${OWNER_LABEL[a.owner]}`,
      ].join("\n")
    ),
  ].join("\n\n");
}

export function buildPulseMessage(data: PulseData, config: PulseConfig, analysis: RadarAnalysis | null, health: Health, url?: string): string {
  const sections = [
    header(data, config, analysis),
    executive(data, config, analysis, health),
    adoption(data, config),
    activity(data, config),
    revenue(data),
    companies(data),
    support(data),
    casesSection(data.cases, data.period.end),
    okrSection(data),
    analysis?.actions.length ? actions(analysis) : null,
    analysis?.watch_next.length
      ? [":eyes: *MONITOREAR EN EL PRÓXIMO PULSO*", analysis.watch_next.map((w) => `• ${w.metric} · objetivo: ${DIRECTION_LABEL[w.direction]}`).join("\n")].join("\n\n")
      : null,
    [
      ":white_check_mark: *CIERRE*",
      analysis?.closing || "Revisar las empresas que perdieron o están por perder el criterio NSM antes del próximo pulso.",
      ...(url ? [`<${url}|Ver el reporte completo en Nexión>`] : []),
    ].join("\n\n"),
  ];
  return sections.filter((section): section is string => Boolean(section)).join(SECTION_SEPARATOR);
}
