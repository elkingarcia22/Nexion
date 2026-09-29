import { screenLabel, type RadarConfig } from "./config";
import { byPeriod, deltaPp, num, pct, variationPct, worstHealth, type Health, type Severity } from "./math";

type Row = Record<string, unknown>;

export interface Alert {
  key: string;
  severity: Severity;
  message: string;
}

// ---------------------------------------------------------------------------- summary

export interface SummaryWeek {
  sessions: number;
  users: number;
  companies: number;
  keyActions: number;
  sessionsWithKeyAction: number;
  usersWithKeyAction: number;
  keyActionSessionsPct: number | null;
  keyActionUsersPct: number | null;
  deadClickPct: number | null;
  rageClickPct: number | null;
  error404Pct: number | null;
  errorNon404Pct: number | null;
  errorNon404Sessions: number;
  invalidRouteSessions: number;
  affectedUsersPct: number | null;
  usersWithoutCompanyPct: number | null;
  usersWithoutIdentityPct: number | null;
}

export interface Summary {
  current: SummaryWeek;
  previous: SummaryWeek;
  alerts: Alert[];
  health: Health;
}

function summaryWeek(row: Row | undefined): SummaryWeek {
  const r = (key: string) => num(row?.[key]);
  const sessions = r("sesiones");
  const users = r("usuarios");
  return {
    sessions,
    users,
    companies: r("empresas"),
    keyActions: r("acciones_clave"),
    sessionsWithKeyAction: r("sesiones_con_accion_clave"),
    usersWithKeyAction: r("usuarios_con_accion_clave"),
    keyActionSessionsPct: pct(r("sesiones_con_accion_clave"), sessions),
    keyActionUsersPct: pct(r("usuarios_con_accion_clave"), users),
    deadClickPct: pct(r("sesiones_dead_click"), sessions),
    rageClickPct: pct(r("sesiones_rage_click"), sessions),
    error404Pct: pct(r("sesiones_404"), sessions),
    errorNon404Pct: pct(r("sesiones_error_no_404"), sessions),
    errorNon404Sessions: r("sesiones_error_no_404"),
    invalidRouteSessions: r("sesiones_ruta_invalida"),
    affectedUsersPct: pct(r("usuarios_afectados"), users),
    usersWithoutCompanyPct: pct(r("usuarios_sin_empresa"), users),
    usersWithoutIdentityPct: pct(r("usuarios_sin_identidad"), users),
  };
}

function atLeast(value: number | null, threshold: number): boolean {
  return value !== null && value >= threshold;
}

export function buildSummary(rows: Row[]): Summary {
  const { current: cur, previous: prev } = byPeriod(rows);
  const current = summaryWeek(cur[0]);
  const previous = summaryWeek(prev[0]);
  const alerts: Alert[] = [];
  const add = (key: string, severity: Severity, message: string) => alerts.push({ key, severity, message });

  if (atLeast(current.error404Pct, 50)) add("persistent_404", "medium", `${current.error404Pct}% de las sesiones registró errores 404.`);
  if (atLeast(current.errorNon404Pct, 5)) add("non_404_errors", "high", `${current.errorNon404Pct}% de las sesiones tuvo errores técnicos distintos de 404.`);
  else if (current.errorNon404Sessions > 0) add("non_404_errors", "medium", `${current.errorNon404Sessions} sesiones tuvieron errores técnicos distintos de 404.`);
  if (atLeast(deltaPp(current.deadClickPct, previous.deadClickPct), 3)) add("dead_click_growth", "medium", "Subieron las sesiones con dead clicks (+3 pp o más).");
  if (atLeast(deltaPp(current.rageClickPct, previous.rageClickPct), 2)) add("rage_click_growth", "medium", "Subieron las sesiones con rage clicks (+2 pp o más).");
  if (current.invalidRouteSessions >= 3) add("invalid_route", "high", `${current.invalidRouteSessions} sesiones pasaron por rutas inválidas (/undefined).`);
  else if (current.invalidRouteSessions > 0) add("invalid_route", "medium", `${current.invalidRouteSessions} sesión(es) pasaron por rutas inválidas (/undefined).`);
  const keyDelta = deltaPp(current.keyActionSessionsPct, previous.keyActionSessionsPct);
  if (keyDelta !== null && keyDelta <= -5) add("key_action_drop", "high", `Cayó ${Math.abs(keyDelta)} pp la proporción de sesiones con una acción clave.`);
  const usersDrop = variationPct(current.usersWithKeyAction, previous.usersWithKeyAction);
  if (previous.usersWithKeyAction >= 5 && usersDrop !== null && usersDrop <= -20) {
    add("key_action_users_drop", "medium", `Usuarios con acciones clave: ${previous.usersWithKeyAction} → ${current.usersWithKeyAction}.`);
  }
  if (atLeast(current.usersWithoutCompanyPct, 20)) add("data_quality_company", "medium", `${current.usersWithoutCompanyPct}% de los usuarios no tiene empresa identificada.`);
  if (atLeast(current.usersWithoutIdentityPct, 20)) add("data_quality_identity", "medium", `${current.usersWithoutIdentityPct}% de los usuarios no tiene identidad.`);

  const health: Health = alerts.some((a) => a.severity === "high") ? "red" : alerts.length ? "yellow" : "green";
  return { current, previous, alerts, health };
}

// ---------------------------------------------------------------------------- features

export type FeatureStatus = "no_current_usage" | "low_adoption" | "concentrated_usage" | "declining" | "growing" | "stable";

export interface FeatureUsage {
  key: string;
  label: string;
  status: FeatureStatus;
  users: number;
  previousUsers: number;
  companies: number;
  events: number;
  previousEvents: number;
  reachPct: number | null;
  reachDeltaPp: number | null;
  eventsPerUser: number | null;
  previousEventsPerUser: number | null;
}

function featureStatus(users: number, previousUsers: number, events: number, previousEvents: number): FeatureStatus {
  const usersVar = variationPct(users, previousUsers) ?? 0;
  const eventsVar = variationPct(events, previousEvents) ?? 0;
  if (users === 0 && previousUsers > 0) return "no_current_usage";
  if (users <= 2) return "low_adoption";
  if (usersVar <= -20 && eventsVar >= 10) return "concentrated_usage";
  if (usersVar <= -20 && eventsVar < 0) return "declining";
  if (usersVar >= 15 && eventsVar >= 10 && users >= 4) return "growing";
  return "stable";
}

export function buildFeatures(rows: Row[], config: RadarConfig, summary: Summary): { features: FeatureUsage[]; health: Health } {
  const find = (list: Row[], key: string) => list.find((row) => row.funcionalidad === key);
  const { current, previous } = byPeriod(rows);
  const features = config.features
    .map((family): FeatureUsage => {
      const cur = find(current, family.key);
      const prev = find(previous, family.key);
      const users = num(cur?.usuarios);
      const previousUsers = num(prev?.usuarios);
      const events = num(cur?.eventos);
      const previousEvents = num(prev?.eventos);
      const reachPct = pct(users, summary.current.users);
      return {
        key: family.key,
        label: family.label,
        status: featureStatus(users, previousUsers, events, previousEvents),
        users,
        previousUsers,
        companies: num(cur?.empresas),
        events,
        previousEvents,
        reachPct,
        reachDeltaPp: deltaPp(reachPct, pct(previousUsers, summary.previous.users)),
        eventsPerUser: users ? Math.round((events / users) * 100) / 100 : null,
        previousEventsPerUser: previousUsers ? Math.round((previousEvents / previousUsers) * 100) / 100 : null,
      };
    })
    .sort((a, b) => b.users - a.users);

  const declining = features.filter((f) => f.status === "declining" || f.status === "no_current_usage").length;
  const lowAdoption = features.filter((f) => f.status === "low_adoption").length;
  const health: Health = declining >= 3 ? "red" : declining > 0 || lowAdoption >= 2 ? "yellow" : "green";
  return { features, health };
}

// ---------------------------------------------------------------------------- funnel

export interface FunnelStepResult {
  key: string;
  label: string;
  sessions: number;
  fromStartPct: number | null;
  fromPreviousPct: number | null;
}

export interface FunnelWeek {
  steps: FunnelStepResult[];
  starts: number;
  completePct: number | null;
  confirmed: number | null;
  confirmedPct: number | null;
  avgMinutes: number | null;
}

export interface Funnel {
  current: FunnelWeek;
  previous: FunnelWeek;
  mainDropoff: { beforeStep: string; lostSessions: number; dropoffPct: number | null } | null;
  health: Health;
}

function funnelWeek(row: Row | undefined, config: RadarConfig): FunnelWeek {
  const counts = config.funnel.steps.map((_, index) => num(row?.[`paso_${index}`]));
  const starts = counts[0] ?? 0;
  const steps = config.funnel.steps.map((step, index) => ({
    key: step.key,
    label: step.label,
    sessions: counts[index],
    fromStartPct: pct(counts[index], starts),
    fromPreviousPct: index === 0 ? pct(counts[0], starts) : pct(counts[index], counts[index - 1]),
  }));
  const confirmed = config.funnel.confirmEvent ? num(row?.confirmadas) : null;
  const seconds = num(row?.segundos_promedio);
  return {
    steps,
    starts,
    completePct: pct(counts[counts.length - 1], starts),
    confirmed,
    confirmedPct: confirmed === null ? null : pct(confirmed, starts),
    avgMinutes: seconds ? Math.round((seconds / 60) * 100) / 100 : null,
  };
}

export function buildFunnel(rows: Row[], config: RadarConfig): Funnel {
  const { current: cur, previous: prev } = byPeriod(rows);
  const current = funnelWeek(cur[0], config);
  const previous = funnelWeek(prev[0], config);

  let mainDropoff: Funnel["mainDropoff"] = null;
  for (let i = 1; i < current.steps.length; i++) {
    const lost = current.steps[i - 1].sessions - current.steps[i].sessions;
    const dropoffPct = pct(lost, current.steps[i - 1].sessions);
    if (lost > 0 && (!mainDropoff || lost > mainDropoff.lostSessions)) {
      mainDropoff = { beforeStep: current.steps[i].label, lostSessions: lost, dropoffPct };
    }
  }

  const conversion = current.completePct;
  const delta = deltaPp(current.completePct, previous.completePct);
  const startsVar = variationPct(current.starts, previous.starts);
  let health: Health = "green";
  if ((conversion !== null && conversion < 30 && current.starts >= 5) || (delta !== null && delta <= -15)) health = "red";
  else if ((conversion !== null && conversion < 60) || (delta !== null && delta <= -5) || (startsVar !== null && startsVar <= -20)) health = "yellow";
  return { current, previous, mainDropoff, health };
}

// ---------------------------------------------------------------------------- recurrence

export interface Recurrence {
  users: number;
  previousUsers: number;
  userRetentionPct: number | null;
  previousUserRetentionPct: number | null;
  companyRetentionPct: number | null;
  previousCompanyRetentionPct: number | null;
  multidayUsersPct: number | null;
  previousMultidayUsersPct: number | null;
  reactivatedUsers: number;
  newUsers: number;
  notReturnedUsers: number;
  health: Health;
}

export function buildRecurrence(rows: Row[]): Recurrence {
  const r = (key: string) => num(rows[0]?.[key]);
  const userRetentionPct = pct(r("usuarios_recurrentes"), r("usuarios_anterior"));
  const previousUserRetentionPct = pct(r("usuarios_recurrentes_anterior"), r("usuarios_previa"));
  const multidayUsersPct = pct(r("usuarios_multidia"), r("usuarios_actual"));
  const retentionDelta = deltaPp(userRetentionPct, previousUserRetentionPct);

  let health: Health = "green";
  if (r("usuarios_anterior") >= 10 && userRetentionPct !== null && userRetentionPct < 30) health = "red";
  else if (
    (userRetentionPct !== null && userRetentionPct < 50) ||
    (retentionDelta !== null && retentionDelta <= -10) ||
    (multidayUsersPct !== null && multidayUsersPct < 35)
  ) {
    health = "yellow";
  }

  return {
    users: r("usuarios_actual"),
    previousUsers: r("usuarios_anterior"),
    userRetentionPct,
    previousUserRetentionPct,
    companyRetentionPct: pct(r("empresas_recurrentes"), r("empresas_anterior")),
    previousCompanyRetentionPct: pct(r("empresas_recurrentes_anterior"), r("empresas_previa")),
    multidayUsersPct,
    previousMultidayUsersPct: pct(r("usuarios_multidia_anterior"), r("usuarios_anterior")),
    reactivatedUsers: r("usuarios_reactivados"),
    newUsers: r("usuarios_nuevos"),
    notReturnedUsers: r("usuarios_no_regresaron"),
    health,
  };
}

// ---------------------------------------------------------------------------- friction

export type ScreenSeverity = "critical" | "high" | "medium" | "low";

export interface FrictionScreen {
  path: string;
  label: string;
  severity: ScreenSeverity;
  sessions: number;
  frictionSessions: number;
  frictionPct: number | null;
  frictionDeltaPp: number | null;
  deadClickSessions: number;
  rageClickSessions: number;
  error404Sessions: number;
  errorNon404Sessions: number;
  affectedCompanies: number;
  impactScore: number;
}

export interface Friction {
  screens: FrictionScreen[];
  health: Health;
}

function screenSeverity(invalid: boolean, s: { sessions: number; frictionPct: number | null; rage: number; non404: number; friction: number; companies: number }): ScreenSeverity {
  if (invalid && (s.sessions >= 3 || s.companies >= 2 || s.friction > 0)) return "critical";
  if (s.non404 >= 3) return "critical";
  if (invalid) return "medium";
  if (s.rage >= 3 || (s.sessions >= 5 && (s.frictionPct ?? 0) >= 50)) return "high";
  return s.friction > 0 ? "medium" : "low";
}

export function buildFriction(rows: Row[], config: RadarConfig): Friction {
  const { current, previous } = byPeriod(rows);
  const screens = current
    .map((row): FrictionScreen => {
      const path = String(row.pantalla ?? "");
      const prev = previous.find((p) => p.pantalla === path);
      const sessions = num(row.sesiones);
      const friction = num(row.sesiones_friccion);
      const frictionPct = pct(friction, sessions);
      const invalid = path.includes("/undefined");
      const rage = num(row.sesiones_rage_click);
      const non404 = num(row.sesiones_error_no_404);
      const companies = num(row.empresas_afectadas);
      return {
        path,
        label: screenLabel(config, path),
        severity: screenSeverity(invalid, { sessions, frictionPct, rage, non404, friction, companies }),
        sessions,
        frictionSessions: friction,
        frictionPct,
        frictionDeltaPp: prev ? deltaPp(frictionPct, pct(num(prev.sesiones_friccion), num(prev.sesiones))) : null,
        deadClickSessions: num(row.sesiones_dead_click),
        rageClickSessions: rage,
        error404Sessions: num(row.sesiones_404),
        errorNon404Sessions: non404,
        affectedCompanies: companies,
        impactScore:
          non404 * 40 + rage * 15 + num(row.sesiones_dead_click) * 3 + num(row.sesiones_404) * 1.5 +
          num(row.usuarios_afectados) * 2 + companies * 3 + (invalid ? 60 : 0),
      };
    })
    .filter((screen) => screen.sessions > 0)
    .sort((a, b) => b.impactScore - a.impactScore);

  const top = screens.slice(0, 5);
  let health: Health = "green";
  if (screens.some((s) => s.severity === "critical")) health = "red";
  else if (screens.some((s) => s.severity === "high" || s.path.includes("/undefined")) || top.some((s) => (s.frictionPct ?? 0) >= 40)) health = "yellow";
  return { screens, health };
}

// ---------------------------------------------------------------------------- companies

export interface CompanyRisk {
  name: string;
  users: number;
  sessions: number;
  frictionSessions: number;
  deadClicks: number;
  rageClicks: number;
  errors404: number;
  errorsNon404: number;
  priority: "Crítica" | "Alta" | "Media-alta" | "Media";
}

export function buildCompanies(rows: Row[]): CompanyRisk[] {
  return rows
    .map((row): CompanyRisk => {
      const rage = num(row.rage_clicks);
      const dead = num(row.dead_clicks);
      const e404 = num(row.errores_404);
      const non404 = num(row.errores_no_404);
      return {
        name: String(row.empresa ?? "Empresa sin nombre"),
        users: num(row.usuarios),
        sessions: num(row.sesiones),
        frictionSessions: num(row.sesiones_friccion),
        deadClicks: dead,
        rageClicks: rage,
        errors404: e404,
        errorsNon404: non404,
        priority: non404 > 0 ? "Crítica" : rage >= 5 ? "Alta" : dead >= 50 || e404 >= 20 ? "Media-alta" : "Media",
      };
    })
    .filter((company) => !company.name.toLowerCase().includes("ubits"))
    // Rows come ranked by friction score; the priority tier goes first (sort is stable).
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

const PRIORITY_RANK: Record<CompanyRisk["priority"], number> = { Crítica: 0, Alta: 1, "Media-alta": 2, Media: 3 };

export function overallHealth(parts: Health[]): Health {
  return worstHealth(parts);
}
