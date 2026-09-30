import type { RadarConfig } from "./config";
import type { Health } from "./math";
import type { FeatureStatus } from "./metrics";
import type { RadarAnalysis, RadarWeek } from "./types";
import { bar, deltaPct, deltaPp, fmt, fmtPct, listJoin, plural } from "./format";
import { SECTION_SEPARATOR } from "../report-engine";

/** Slack mrkdwn for the weekly radar. Sections are joined by SECTION_SEPARATOR (one Slack block each). */
export { SECTION_SEPARATOR };
const TOP_FEATURES = 5;
const TOP_SCREENS = 3;
const TOP_COMPANIES = 3;

const HEALTH_LINE: Record<Health, string> = {
  green: ":large_green_circle: Evolución favorable",
  yellow: ":large_yellow_circle: Seguimiento recomendado",
  red: ":red_circle: Atención prioritaria",
};

const FEATURE_STATUS: Record<FeatureStatus, string> = {
  growing: "↑ mayor alcance",
  stable: "→ estable",
  declining: "↓ menor alcance",
  concentrated_usage: "⚠ uso concentrado en menos usuarios",
  low_adoption: "· adopción baja",
  no_current_usage: "✕ sin uso esta semana",
};

const PRIORITY_ICON = { Crítica: ":red_circle:", Alta: ":large_orange_circle:", "Media-alta": ":large_yellow_circle:", Media: ":large_blue_circle:" } as const;
const OWNER_LABEL = { product: "Producto", design: "Diseño", engineering: "Ingeniería", data: "Datos" } as const;
const DIRECTION_LABEL = { increase: "aumentar", decrease: "disminuir", stable: "mantener", investigate: "investigar" } as const;

function header(week: RadarWeek, config: RadarConfig, analysis: RadarAnalysis | null): string {
  return [
    `:bar_chart: *${config.productName.toUpperCase()} · RADAR SEMANAL DE PRODUCTO*`,
    `:date: ${week.period.label}`,
    ":mag_right: Experiencia, adopción, recurrencia, funnel y fricción",
    analysis
      ? ":sparkles: Interpretación asistida por Claude y contrastada con métricas de PostHog."
      : ":information_source: Lectura calculada solo con métricas de PostHog (el análisis con IA no estuvo disponible).",
  ].join("\n");
}

function executive(week: RadarWeek, analysis: RadarAnalysis | null, health: Health): string {
  const topAlert = week.summary.alerts.find((a) => a.severity === "high") ?? week.summary.alerts[0];
  const topScreen = week.friction.screens[0];
  const alert = topAlert?.message ?? (topScreen ? `La mayor fricción está en ${topScreen.label} (${fmtPct(topScreen.frictionPct)} de sus sesiones).` : null);
  const s = week.summary.current;
  return [
    ":compass: *LECTURA EJECUTIVA*",
    HEALTH_LINE[health],
    `*${analysis?.headline ?? `${fmt(s.users)} usuarios de ${fmt(s.companies)} empresas usaron el producto esta semana`}*`,
    analysis?.summary ?? `Hubo ${plural(s.sessions, "sesión", "sesiones")} y ${fmtPct(s.keyActionSessionsPct)} de ellas incluyó una acción clave.`,
    ...(alert ? [`:warning: Principal alerta: ${alert}`] : []),
  ].join("\n\n");
}

function pulse(week: RadarWeek): string {
  const { current: c, previous: p } = week.summary;
  return [
    ":heartbeat: *PULSO DE LA SEMANA*",
    `:bust_in_silhouette: Usuarios: ${fmt(c.users)} · ${deltaPct(c.users, p.users)} · vs. ${fmt(p.users)}`,
    `:office: Empresas: ${fmt(c.companies)} · ${deltaPct(c.companies, p.companies)} · vs. ${fmt(p.companies)}`,
    `:desktop_computer: Sesiones: ${fmt(c.sessions)} · ${deltaPct(c.sessions, p.sessions)} · vs. ${fmt(p.sessions)}`,
    `:zap: Acciones clave: ${fmt(c.keyActions)} · ${deltaPct(c.keyActions, p.keyActions)} · vs. ${fmt(p.keyActions)}`,
    "",
    "Sesiones con una acción clave",
    `Antes ${bar(p.keyActionSessionsPct)} ${fmtPct(p.keyActionSessionsPct)}`,
    `Ahora ${bar(c.keyActionSessionsPct)} ${fmtPct(c.keyActionSessionsPct)} · ${deltaPp((c.keyActionSessionsPct ?? 0) - (p.keyActionSessionsPct ?? 0))}`,
  ].join("\n");
}

function features(week: RadarWeek): string {
  const shown = week.features.filter((f) => f.users > 0 || f.previousUsers > 0).slice(0, TOP_FEATURES);
  const growing = week.features.filter((f) => f.status === "growing").map((f) => f.label);
  const falling = week.features.filter((f) => f.status === "declining" || f.status === "no_current_usage").map((f) => f.label);
  const reading = [
    growing.length ? `${listJoin(growing)} ${growing.length === 1 ? "ganó" : "ganaron"} alcance.` : "",
    falling.length ? `${listJoin(falling)} ${falling.length === 1 ? "perdió" : "perdieron"} usuarios frente a la semana anterior.` : "",
  ].filter(Boolean).join(" ") || "El alcance de las funcionalidades se mantuvo sin cambios fuertes.";
  return [
    ":jigsaw: *USO DE FUNCIONALIDADES*",
    ...shown.map((f) =>
      [
        `${bar(f.reachPct)} *${f.label}*`,
        `${plural(f.users, "usuario", "usuarios")} · ${plural(f.companies, "empresa", "empresas")} · alcance ${fmtPct(f.reachPct)} ${deltaPp(f.reachDeltaPp)}`,
        `↳ ${FEATURE_STATUS[f.status]} · ${fmt(f.previousEventsPerUser, 1)} → ${fmt(f.eventsPerUser, 1)} eventos por usuario`,
      ].join("\n")
    ),
    `:mag_right: Lectura: ${reading}`,
  ].join("\n\n");
}

function funnel(week: RadarWeek, config: RadarConfig): string {
  const { current: c, previous: p, mainDropoff } = week.funnel;
  if (c.starts === 0) {
    return `:twisted_rightwards_arrows: *FUNNEL DE ${config.funnel.label.toUpperCase()}*\nNinguna sesión inició el flujo esta semana (${fmt(p.starts)} la semana anterior).`;
  }
  const completeDelta = c.completePct !== null && p.completePct !== null ? c.completePct - p.completePct : null;
  const entry = c.starts === p.starts ? "La entrada al flujo se mantuvo" : c.starts > p.starts ? "Entraron más sesiones al flujo" : "Entraron menos sesiones al flujo";
  const conversion = completeDelta === null || Math.abs(completeDelta) < 1 ? "la conversión final se mantuvo" : completeDelta > 0 ? "la conversión final mejoró" : "la conversión final bajó";
  return [
    `:twisted_rightwards_arrows: *FUNNEL DE ${config.funnel.label.toUpperCase()}*`,
    c.steps.map((step) => `${bar(step.fromStartPct)} ${step.label} · ${plural(step.sessions, "sesión", "sesiones")} · ${fmtPct(step.fromStartPct)} desde el inicio`).join("\n"),
    [
      ...(mainDropoff ? [`:warning: Mayor pérdida: antes de ${mainDropoff.beforeStep} · ${plural(mainDropoff.lostSessions, "sesión", "sesiones")} · ${fmtPct(mainDropoff.dropoffPct)}`] : []),
      `:inbox_tray: Entrada al funnel: ${fmt(p.starts)} → ${fmt(c.starts)} · ${deltaPct(c.starts, p.starts)}`,
      `:chart_with_upwards_trend: Conversión a ${c.steps[c.steps.length - 1].label.toLowerCase()}: ${fmtPct(p.completePct)} → ${fmtPct(c.completePct)} · ${deltaPp(completeDelta)}`,
      ...(c.confirmedPct !== null ? [`:white_check_mark: ${config.funnel.confirmLabel ?? "Confirmación"}: ${fmtPct(c.confirmedPct)} · ${deltaPp(p.confirmedPct === null ? null : c.confirmedPct - p.confirmedPct)}`] : []),
      ...(c.avgMinutes !== null ? [`:stopwatch: Tiempo promedio para completarlo: ${fmt(c.avgMinutes, 1)} min`] : []),
    ].join("\n"),
    `:mag_right: Lectura: ${entry} y ${conversion} frente a la semana anterior.`,
  ].join("\n\n");
}

function recurrence(week: RadarWeek): string {
  const r = week.recurrence;
  return [
    ":repeat: *RECURRENCIA Y CONTINUIDAD*",
    [
      `:bust_in_silhouette: Retención semanal de usuarios: ${fmtPct(r.userRetentionPct)} · ${deltaPp(r.userRetentionPct !== null && r.previousUserRetentionPct !== null ? r.userRetentionPct - r.previousUserRetentionPct : null)}`,
      `:office: Retención semanal de empresas: ${fmtPct(r.companyRetentionPct)} · ${deltaPp(r.companyRetentionPct !== null && r.previousCompanyRetentionPct !== null ? r.companyRetentionPct - r.previousCompanyRetentionPct : null)}`,
      `:date: Usuarios activos en varios días: ${fmtPct(r.multidayUsersPct)}`,
      `:recycle: ${plural(r.reactivatedUsers, "usuario reactivado", "usuarios reactivados")} · ${fmt(r.newUsers)} sin actividad previa visible · ${fmt(r.notReturnedUsers)} no regresaron`,
    ].join("\n"),
  ].join("\n\n");
}

function friction(week: RadarWeek): string {
  const screens = week.friction.screens.slice(0, TOP_SCREENS);
  if (!screens.length) return ":warning: *FRICCIÓN POR PANTALLA*\nNo hubo señales de fricción en las pantallas del producto.";
  return [
    ":warning: *FRICCIÓN POR PANTALLA*",
    ...screens.map((s, index) =>
      [
        `${index + 1}. ${bar(s.frictionPct)} *${s.label}* · ${fmtPct(s.frictionPct)} ${deltaPp(s.frictionDeltaPp)}`,
        [
          `${fmt(s.frictionSessions)} de ${plural(s.sessions, "sesión", "sesiones")} con fricción`,
          s.deadClickSessions ? `${fmt(s.deadClickSessions)} con dead clicks` : "",
          s.rageClickSessions ? `${fmt(s.rageClickSessions)} con rage clicks` : "",
          s.error404Sessions ? `${fmt(s.error404Sessions)} con 404` : "",
          s.errorNon404Sessions ? `${fmt(s.errorNon404Sessions)} con otros errores` : "",
        ].filter(Boolean).join(" · "),
      ].join("\n")
    ),
    "_Dead clicks, rage clicks y 404 son señales por validar, no causas demostradas._",
  ].join("\n\n");
}

function companies(week: RadarWeek): string {
  const top = week.companies.slice(0, TOP_COMPANIES);
  if (!top.length) return ":office: *EMPRESAS CON MAYOR SEÑAL DE RIESGO*\nNinguna empresa acumuló señales de fricción esta semana.";
  return [
    ":office: *EMPRESAS CON MAYOR SEÑAL DE RIESGO*",
    top
      .map((c) => {
        const parts = [
          `${fmt(c.frictionSessions)} de ${plural(c.sessions, "sesión", "sesiones")} con fricción`,
          c.errorsNon404 ? plural(c.errorsNon404, "error técnico", "errores técnicos") : "",
          c.rageClicks ? plural(c.rageClicks, "rage click", "rage clicks") : "",
          c.deadClicks ? plural(c.deadClicks, "dead click", "dead clicks") : "",
          c.errors404 ? plural(c.errors404, "error 404", "errores 404") : "",
        ].filter(Boolean);
        return `${PRIORITY_ICON[c.priority]} *${c.name}* · ${parts.slice(0, 4).join(" · ")}`;
      })
      .join("\n"),
  ].join("\n\n");
}

function replays(week: RadarWeek): string | null {
  if (!week.replays.length) return null;
  return [
    ":movie_camera: *SESIONES RECOMENDADAS PARA REVISIÓN*",
    ...week.replays.map((r) =>
      [
        `${PRIORITY_ICON[r.priority]} *${r.company}* · ${r.categoryLabel} · ${fmt(r.activeMinutes, 1)} min activos`,
        [
          r.errorsNon404 ? plural(r.errorsNon404, "error técnico", "errores técnicos") : "",
          r.rageClicks ? plural(r.rageClicks, "rage click", "rage clicks") : "",
          r.deadClicks ? plural(r.deadClicks, "dead click", "dead clicks") : "",
          r.errors404 ? plural(r.errors404, "error 404", "errores 404") : "",
        ]
          .filter(Boolean)
          .join(" · "),
        ...(r.routeSummary ? [`Recorrido: ${r.routeSummary}`] : []),
        `<${r.url}|Ver grabación en PostHog>${r.daysUntilExpiry !== null && r.daysUntilExpiry <= 7 ? ` · :hourglass: vence en ${plural(r.daysUntilExpiry, "día", "días")}` : ""}`,
      ].join("\n")
    ),
  ].join("\n\n");
}

function actions(analysis: RadarAnalysis): string {
  return [
    ":dart: *ACCIONES*",
    ...analysis.actions.map((a, index) =>
      [
        `${index + 1}. *${a.title}*`,
        `Evidencia: ${a.evidence}`,
        `Próximo paso: ${a.nextStep}`,
        `${a.continuesActionKey ? "↻ En seguimiento desde una semana anterior" : "+ Nueva"} · Responsable: ${OWNER_LABEL[a.owner]}`,
      ].join("\n")
    ),
  ].join("\n\n");
}

function watch(analysis: RadarAnalysis): string {
  return [":eyes: *MONITOREAR LA PRÓXIMA SEMANA*", analysis.watch_next.map((w) => `• ${w.metric} · objetivo: ${DIRECTION_LABEL[w.direction]}`).join("\n")].join("\n\n");
}

export function buildRadarMessage(week: RadarWeek, config: RadarConfig, analysis: RadarAnalysis | null, health: Health, reportUrl?: string): string {
  const sections = [
    header(week, config, analysis),
    executive(week, analysis, health),
    pulse(week),
    features(week),
    funnel(week, config),
    recurrence(week),
    friction(week),
    companies(week),
    replays(week),
    analysis?.actions.length ? actions(analysis) : null,
    analysis?.watch_next.length ? watch(analysis) : null,
    [
      ":white_check_mark: *CIERRE*",
      analysis?.closing || "Revisar las pantallas con más fricción y confirmar si las señales se sostienen la próxima semana.",
      ...(reportUrl ? [`<${reportUrl}|Ver el reporte completo en Nexión>`] : []),
      "_Reporte de experiencia de producto. No incluye NSM, ARR, OKRs ni métricas comerciales._",
    ].join("\n\n"),
  ];
  return sections.filter((section): section is string => Boolean(section)).join(SECTION_SEPARATOR);
}
