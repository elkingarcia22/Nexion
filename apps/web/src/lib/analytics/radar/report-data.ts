import type { Dataset, Kpi, ReportAnalysis, ReportData, ReportLink } from "../types";
import type { RadarConfig } from "./config";
import { deltaPp, variationPct } from "./math";
import type { RadarAnalysis, RadarWeek } from "./types";

/**
 * The stored shape of a weekly radar (analytics_reports.data). KPI keys are stable: the monthly
 * report sums or re-weights them, and the history the next week reads comes from here.
 */
function countKpi(key: string, label: string, current: number, previous: number): Kpi {
  // For counts the delta is the absolute change; the dashboard colors it with higherIsBetter.
  return { key, label, value: current, unit: "count", delta: current - previous, higherIsBetter: true };
}

function pctKpi(key: string, label: string, current: number | null, previous: number | null, higherIsBetter: boolean): Kpi {
  return { key, label, value: current, unit: "pct", delta: deltaPp(current, previous), higherIsBetter };
}

export function radarKpis(week: RadarWeek): Kpi[] {
  const { current: c, previous: p } = week.summary;
  const f = week.funnel;
  const r = week.recurrence;
  const topScreen = week.friction.screens[0];
  return [
    countKpi("active_users", "Usuarios activos", c.users, p.users),
    countKpi("active_companies", "Empresas activas", c.companies, p.companies),
    countKpi("sessions", "Sesiones", c.sessions, p.sessions),
    countKpi("key_actions", "Acciones clave", c.keyActions, p.keyActions),
    pctKpi("key_action_sessions_pct", "Sesiones con acción clave", c.keyActionSessionsPct, p.keyActionSessionsPct, true),
    pctKpi("user_retention_pct", "Retención semanal de usuarios", r.userRetentionPct, r.previousUserRetentionPct, true),
    pctKpi("company_retention_pct", "Retención semanal de empresas", r.companyRetentionPct, r.previousCompanyRetentionPct, true),
    pctKpi("multiday_users_pct", "Usuarios activos varios días", r.multidayUsersPct, r.previousMultidayUsersPct, true),
    countKpi("funnel_starts", "Inicios del funnel", f.current.starts, f.previous.starts),
    pctKpi("funnel_complete_pct", "Conversión del funnel", f.current.completePct, f.previous.completePct, true),
    ...(f.current.confirmedPct !== null ? [pctKpi("funnel_confirmed_pct", "Confirmación del funnel", f.current.confirmedPct, f.previous.confirmedPct, true)] : []),
    pctKpi("dead_click_sessions_pct", "Sesiones con dead clicks", c.deadClickPct, p.deadClickPct, false),
    pctKpi("error_non404_sessions_pct", "Sesiones con errores técnicos", c.errorNon404Pct, p.errorNon404Pct, false),
    ...(topScreen ? [pctKpi("top_screen_friction_pct", `Fricción en ${topScreen.label}`, topScreen.frictionPct, topScreen.frictionDeltaPp === null || topScreen.frictionPct === null ? null : topScreen.frictionPct - topScreen.frictionDeltaPp, false)] : []),
    pctKpi("users_without_identity_pct", "Usuarios sin identidad", c.usersWithoutIdentityPct, p.usersWithoutIdentityPct, false),
  ];
}

export function radarDatasets(week: RadarWeek, config: RadarConfig): Dataset[] {
  const f = week.funnel.current;
  return [
    {
      key: "features",
      title: "Uso de funcionalidades",
      columns: [
        { key: "label", label: "Funcionalidad" },
        { key: "users", label: "Usuarios", unit: "count" },
        { key: "companies", label: "Empresas", unit: "count" },
        { key: "reach", label: "Alcance", unit: "pct" },
        { key: "users_change", label: "Var. usuarios", unit: "pct" },
        { key: "events_per_user", label: "Eventos/usuario" },
      ],
      rows: week.features.map((feature) => ({
        label: feature.label,
        users: feature.users,
        companies: feature.companies,
        reach: feature.reachPct,
        users_change: variationPct(feature.users, feature.previousUsers),
        events_per_user: feature.eventsPerUser,
      })),
    },
    {
      key: "funnel",
      title: `Funnel de ${config.funnel.label.toLowerCase()}`,
      columns: [
        { key: "label", label: "Paso" },
        { key: "sessions", label: "Sesiones", unit: "count" },
        { key: "from_start", label: "Desde el inicio", unit: "pct" },
        { key: "from_previous", label: "Desde el paso anterior", unit: "pct" },
      ],
      rows: f.steps.map((step) => ({ label: step.label, sessions: step.sessions, from_start: step.fromStartPct, from_previous: step.fromPreviousPct })),
      reading: week.funnel.mainDropoff
        ? `La mayor pérdida ocurre antes de ${week.funnel.mainDropoff.beforeStep}: ${week.funnel.mainDropoff.lostSessions} sesiones.`
        : undefined,
    },
    {
      key: "friction",
      title: "Fricción por pantalla",
      columns: [
        { key: "label", label: "Pantalla" },
        { key: "sessions", label: "Sesiones", unit: "count" },
        { key: "friction", label: "Con fricción", unit: "pct" },
        { key: "dead", label: "Dead clicks", unit: "count" },
        { key: "rage", label: "Rage clicks", unit: "count" },
        { key: "e404", label: "Con 404", unit: "count" },
        { key: "errors", label: "Otros errores", unit: "count" },
      ],
      rows: week.friction.screens.slice(0, 10).map((s) => ({
        label: s.label,
        sessions: s.sessions,
        friction: s.frictionPct,
        dead: s.deadClickSessions,
        rage: s.rageClickSessions,
        e404: s.error404Sessions,
        errors: s.errorNon404Sessions,
      })),
      reading: "Sesiones de cada pantalla con al menos un dead click, rage click o error.",
    },
    {
      key: "companies",
      title: "Empresas con mayor señal de riesgo",
      columns: [
        { key: "name", label: "Empresa" },
        { key: "priority", label: "Prioridad" },
        { key: "sessions", label: "Sesiones", unit: "count" },
        { key: "friction", label: "Con fricción", unit: "count" },
        { key: "rage", label: "Rage clicks", unit: "count" },
        { key: "errors", label: "Errores técnicos", unit: "count" },
      ],
      rows: week.companies.slice(0, 10).map((c) => ({
        name: c.name,
        priority: c.priority,
        sessions: c.sessions,
        friction: c.frictionSessions,
        rage: c.rageClicks,
        errors: c.errorsNon404,
      })),
    },
  ];
}

export function radarLinks(week: RadarWeek): ReportLink[] {
  return week.replays.map((replay) => ({ label: `${replay.company} · ${replay.categoryLabel}`, url: replay.url, kind: "replay" }));
}

export function toReportData(week: RadarWeek, config: RadarConfig): ReportData {
  return { kpis: radarKpis(week), datasets: radarDatasets(week, config), links: radarLinks(week) };
}

export type StoredRadarAnalysis = Omit<RadarAnalysis, "insights"> & {
  insights: Array<RadarAnalysis["insights"][number] & { detail: string }>;
};

/** Adds the `detail` line the generic dashboard shows; the radar fields stay for next week's history. */
export function toReportAnalysis(analysis: RadarAnalysis): StoredRadarAnalysis & ReportAnalysis {
  return {
    ...analysis,
    insights: analysis.insights.map((insight) => ({ ...insight, detail: `${insight.fact} ${insight.interpretation}` })),
  };
}
