import { INTERNAL_FILTER, keyEvents, type RadarConfig } from "./config";

/**
 * HogQL for the weekly radar. Windows are calendar weeks in Bogotá (Monday 00:00 = 05:00 UTC),
 * not rolling 7 days, so every weekly report covers exactly one ISO week and the monthly report
 * can be built from them. `weekStart` is the Monday (YYYY-MM-DD) of the week being reported.
 */
const DAY_MS = 86_400_000;
const REPLAY_WINDOW_DAYS = 30;
export const CANDIDATE_LIMIT = 40;
const FRICTION_LIMIT = 100;
const COMPANY_LIMIT = 15;

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Start of the week `offset` weeks from the reported one (0 = its Monday, 1 = the next Monday). */
export function weekBoundary(weekStart: string, offset: number): string {
  return `toDateTime('${shiftDate(weekStart, offset * 7)} 05:00:00', 'UTC')`;
}

function quoteList(values: string[]): string {
  return values.map((value) => `'${value.replace(/'/g, "")}'`).join(", ");
}

function baseFilter(config: RadarConfig): string {
  const identity = "lower(coalesce(person.properties.user_email, distinct_id, ''))";
  return [
    `lower(coalesce(properties.$host, '')) = '${config.host}'`,
    `coalesce(properties.$session_id, '') != ''`,
    `NOT (${INTERNAL_FILTER.emailDomains.map((domain) => `endsWith(${identity}, '${domain}')`).join(" OR ")}` +
      ` OR lower(coalesce(person.properties.company_name, '')) IN (${quoteList(INTERNAL_FILTER.companyNames)})` +
      ` OR coalesce(toString(person.properties.company_ubits_id), '') IN (${quoteList(INTERNAL_FILTER.companyIds)}))`,
  ].join("\n  AND ");
}

function twoWeekWindow(weekStart: string): string {
  return `timestamp >= ${weekBoundary(weekStart, -1)} AND timestamp < ${weekBoundary(weekStart, 1)}`;
}

function periodColumn(weekStart: string, column = "timestamp"): string {
  return `if(${column} >= ${weekBoundary(weekStart, 0)}, 'actual', 'anterior') AS periodo`;
}

const RECURRENCE_COLUMNS = ["actual", "anterior", "previa", "recurrentes", "recurrentes_anterior", "reactivados", "nuevos", "no_regresaron", "multidia", "multidia_anterior"];

/** Lowercased path with numeric ids collapsed (/job/dashboard/70 → /job/dashboard/:id), so screens group. */
const SCREEN = "replaceRegexpAll(lower(coalesce(properties.$pathname, '')), '/[0-9]+', '/:id')";

const IS_404 = "position(toString(properties.$exception_values), 'status code 404') > 0";
const FRICTION_EVENTS = "event IN ('$dead_click', '$rageclick', '$exception')";

export function summaryQuery(config: RadarConfig, weekStart: string): string {
  const keys = quoteList(keyEvents(config));
  return `SELECT ${periodColumn(weekStart)},
  uniqExact(properties.$session_id) AS sesiones,
  uniqExact(person_id) AS usuarios,
  uniqExact(person.properties.company_id) AS empresas,
  countIf(event IN (${keys})) AS acciones_clave,
  uniqExactIf(properties.$session_id, event IN (${keys})) AS sesiones_con_accion_clave,
  uniqExactIf(person_id, event IN (${keys})) AS usuarios_con_accion_clave,
  uniqExactIf(properties.$session_id, event = '$dead_click') AS sesiones_dead_click,
  uniqExactIf(properties.$session_id, event = '$rageclick') AS sesiones_rage_click,
  uniqExactIf(properties.$session_id, event = '$exception') AS sesiones_excepcion,
  uniqExactIf(properties.$session_id, event = '$exception' AND ${IS_404}) AS sesiones_404,
  uniqExactIf(properties.$session_id, event = '$exception' AND NOT ${IS_404}) AS sesiones_error_no_404,
  uniqExactIf(properties.$session_id, position(lower(coalesce(properties.$pathname, '')), '/undefined') > 0) AS sesiones_ruta_invalida,
  uniqExactIf(person_id, ${FRICTION_EVENTS}) AS usuarios_afectados,
  uniqExactIf(person_id, coalesce(toString(person.properties.company_id), '') = '') AS usuarios_sin_empresa,
  uniqExactIf(person_id, coalesce(person.properties.user_email, '') = '' AND position(coalesce(distinct_id, ''), '@') = 0) AS usuarios_sin_identidad
FROM events
WHERE ${twoWeekWindow(weekStart)}
  AND ${baseFilter(config)}
GROUP BY periodo`;
}

export function featureUsageQuery(config: RadarConfig, weekStart: string): string {
  const branches = config.features.map((family) => `event IN (${quoteList(family.events)}), '${family.key}'`).join(",\n    ");
  return `SELECT ${periodColumn(weekStart)},
  multiIf(${branches}, 'other') AS funcionalidad,
  uniqExact(person_id) AS usuarios,
  uniqExact(person.properties.company_id) AS empresas,
  uniqExact(properties.$session_id) AS sesiones,
  count() AS eventos
FROM events
WHERE ${twoWeekWindow(weekStart)}
  AND event IN (${quoteList(keyEvents(config))})
  AND ${baseFilter(config)}
GROUP BY periodo, funcionalidad`;
}

export function funnelQuery(config: RadarConfig, weekStart: string): string {
  const { steps, confirmEvent } = config.funnel;
  const path = "lower(coalesce(properties.$pathname, ''))";
  const stepColumns = steps.map((step, index) => `minIf(timestamp, ${path} = '${step.path}') AS s${index}`).join(",\n    ");
  const confirmColumn = confirmEvent ? `,\n    minIf(timestamp, event = '${confirmEvent}') AS confirmado` : "";
  const reached = (index: number) =>
    steps
      .slice(0, index + 1)
      .map((_, i) => (i === 0 ? "toUnixTimestamp(s0) > 0" : `toUnixTimestamp(s${i}) > 0 AND s${i} >= s${i - 1}`))
      .join(" AND ");
  const stepCounts = steps.map((_, index) => `countIf(${reached(index)}) AS paso_${index}`).join(",\n  ");
  const last = steps.length - 1;
  const confirmCounts = confirmEvent ? `,\n  countIf(toUnixTimestamp(s0) > 0 AND toUnixTimestamp(confirmado) > 0 AND confirmado >= s0) AS confirmadas` : "";

  return `WITH session_steps AS (
  SELECT properties.$session_id AS session_id, any(person_id) AS person_id,
    any(coalesce(toString(person.properties.company_id), '')) AS company_id,
    min(timestamp) AS session_start,
    ${stepColumns}${confirmColumn}
  FROM events
  WHERE ${twoWeekWindow(weekStart)}
    AND (${path} IN (${quoteList(steps.map((step) => step.path))})${confirmEvent ? ` OR event = '${confirmEvent}'` : ""})
    AND ${baseFilter(config)}
  GROUP BY session_id
)
SELECT ${periodColumn(weekStart, "session_start")},
  ${stepCounts}${confirmCounts},
  uniqExactIf(person_id, toUnixTimestamp(s0) > 0) AS usuarios_inicio,
  uniqExactIf(company_id, company_id != '' AND toUnixTimestamp(s0) > 0) AS empresas_inicio,
  round(avgIf(dateDiff('second', s0, s${last}), ${reached(last)}), 2) AS segundos_promedio
FROM session_steps
GROUP BY periodo`;
}

/** Retention per user and company across the reported week, the two before it and a 6-week history. */
export function recurrenceQuery(config: RadarConfig, weekStart: string): string {
  const w = (offset: number) => weekBoundary(weekStart, offset);
  const activity = (entity: string, extra = "") => `SELECT ${entity},
    uniqExactIf(session_id, timestamp >= ${w(0)}) AS actual,
    uniqExactIf(session_id, timestamp >= ${w(-1)} AND timestamp < ${w(0)}) AS anterior,
    uniqExactIf(session_id, timestamp >= ${w(-2)} AND timestamp < ${w(-1)}) AS previa,
    uniqExactIf(session_id, timestamp < ${w(-1)}) AS historial,
    uniqExactIf(activity_date, timestamp >= ${w(0)}) AS dias_actual,
    uniqExactIf(activity_date, timestamp >= ${w(-1)} AND timestamp < ${w(0)}) AS dias_anterior
  FROM base ${extra} GROUP BY ${entity}`;
  const summary = (prefix: string) => `countIf(actual > 0) AS ${prefix}_actual,
    countIf(anterior > 0) AS ${prefix}_anterior,
    countIf(previa > 0) AS ${prefix}_previa,
    countIf(actual > 0 AND anterior > 0) AS ${prefix}_recurrentes,
    countIf(anterior > 0 AND previa > 0) AS ${prefix}_recurrentes_anterior,
    countIf(actual > 0 AND anterior = 0 AND historial > 0) AS ${prefix}_reactivados,
    countIf(actual > 0 AND anterior = 0 AND historial = 0) AS ${prefix}_nuevos,
    countIf(actual = 0 AND anterior > 0) AS ${prefix}_no_regresaron,
    countIf(actual > 0 AND dias_actual >= 2) AS ${prefix}_multidia,
    countIf(anterior > 0 AND dias_anterior >= 2) AS ${prefix}_multidia_anterior`;

  return `WITH base AS (
  SELECT person_id AS user_id, coalesce(toString(person.properties.company_id), '') AS company_id,
    properties.$session_id AS session_id, timestamp, toDate(timestamp) AS activity_date
  FROM events
  WHERE timestamp >= ${w(-5)} AND timestamp < ${w(1)}
    AND person_id IS NOT NULL
    AND ${baseFilter(config)}
),
users AS (${activity("user_id")}),
companies AS (${activity("company_id", "WHERE company_id != ''")}),
user_summary AS (SELECT ${summary("usuarios")} FROM users),
company_summary AS (SELECT ${summary("empresas")} FROM companies)
SELECT ${RECURRENCE_COLUMNS.flatMap((column) => [`user_summary.usuarios_${column}`, `company_summary.empresas_${column}`]).join(", ")}
FROM user_summary CROSS JOIN company_summary`;
}

export function frictionQuery(config: RadarConfig, weekStart: string): string {
  const path = "lower(coalesce(properties.$pathname, ''))";
  return `SELECT ${periodColumn(weekStart)},
  if(${SCREEN} = '', '(sin_ruta)', ${SCREEN}) AS pantalla,
  uniqExact(properties.$session_id) AS sesiones,
  uniqExactIf(properties.$session_id, ${FRICTION_EVENTS}) AS sesiones_friccion,
  uniqExactIf(properties.$session_id, event = '$dead_click') AS sesiones_dead_click,
  uniqExactIf(properties.$session_id, event = '$rageclick') AS sesiones_rage_click,
  uniqExactIf(properties.$session_id, event = '$exception' AND ${IS_404}) AS sesiones_404,
  uniqExactIf(properties.$session_id, event = '$exception' AND NOT ${IS_404}) AS sesiones_error_no_404,
  uniqExactIf(person_id, ${FRICTION_EVENTS}) AS usuarios_afectados,
  uniqExactIf(person.properties.company_id, ${FRICTION_EVENTS} AND coalesce(toString(person.properties.company_id), '') != '') AS empresas_afectadas
FROM events
WHERE ${twoWeekWindow(weekStart)}
  AND (position(${path}, '${config.pathPrefix}') = 1 OR position(${path}, '/undefined') > 0)
  AND ${baseFilter(config)}
GROUP BY periodo, pantalla
ORDER BY periodo, sesiones_friccion DESC, sesiones DESC
LIMIT ${FRICTION_LIMIT}`;
}

/** Companies of the reported week ranked by how much friction their users hit. */
export function companyRiskQuery(config: RadarConfig, weekStart: string): string {
  return `SELECT any(person.properties.company_name) AS empresa,
  uniqExact(person_id) AS usuarios,
  uniqExact(properties.$session_id) AS sesiones,
  uniqExactIf(properties.$session_id, ${FRICTION_EVENTS}) AS sesiones_friccion,
  countIf(event = '$dead_click') AS dead_clicks,
  countIf(event = '$rageclick') AS rage_clicks,
  countIf(event = '$exception' AND ${IS_404}) AS errores_404,
  countIf(event = '$exception' AND NOT ${IS_404}) AS errores_no_404
FROM events
WHERE timestamp >= ${weekBoundary(weekStart, 0)} AND timestamp < ${weekBoundary(weekStart, 1)}
  AND coalesce(toString(person.properties.company_id), '') != ''
  AND ${baseFilter(config)}
GROUP BY person.properties.company_id
HAVING sesiones_friccion > 0
ORDER BY errores_no_404 * 35 + rage_clicks * 12 + errores_404 * 2 + dead_clicks DESC
LIMIT ${COMPANY_LIMIT}`;
}

/** Sessions of the last 30 days (up to the end of the reported week) worth watching as replays. */
export function replayCandidatesQuery(config: RadarConfig, weekStart: string): string {
  const keys = quoteList(keyEvents(config));
  const end = shiftDate(weekStart, 7);
  return `SELECT properties.$session_id AS session_id,
  any(person.properties.company_name) AS empresa,
  min(timestamp) AS inicio,
  uniqExact(properties.$pathname) AS pantallas,
  countIf(event = '$exception' AND ${IS_404}) AS errores_404,
  countIf(event = '$exception' AND NOT ${IS_404}) AS errores_no_404,
  countIf(event = '$dead_click') AS dead_clicks,
  countIf(event = '$rageclick') AS rage_clicks,
  countIf(event IN (${keys})) AS acciones_clave,
  groupUniqArray(${SCREEN}) AS recorrido
FROM events
WHERE timestamp >= toDateTime('${shiftDate(end, -REPLAY_WINDOW_DAYS)} 05:00:00', 'UTC') AND timestamp < ${weekBoundary(weekStart, 1)}
  AND ${baseFilter(config)}
GROUP BY session_id
HAVING dead_clicks > 0 OR rage_clicks > 0 OR errores_404 > 0 OR errores_no_404 > 0 OR acciones_clave > 0
ORDER BY rage_clicks * 10 + errores_no_404 * 8 + dead_clicks + errores_404 * 2 + acciones_clave * 3 DESC
LIMIT ${CANDIDATE_LIMIT}`;
}
