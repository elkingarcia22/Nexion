import type { Period } from "../periods";
import type { PulseConfig } from "./config";

const DATASET = "`data-mart-cs.product_metrics";
/** A month needs this many days elapsed at the pulse's close to be the one reported. */
const MIN_DAYS_INTO_MONTH = 15;
const COMPANY_LIMIT = 40;

export interface PulseWindow {
  /** First day (YYYY-MM-01) of the month the BigQuery figures describe. */
  month: string;
  previousMonth: string;
  /** True when that month had not finished at the pulse's close (month-to-date figures). */
  monthIsPartial: boolean;
  /** Pulse days, and the 14 days before them, for dated sources (new ARR, Jira). */
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function monthStart(date: string, monthsBack = 0): string {
  const d = new Date(`${date}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsBack, 1)).toISOString().slice(0, 10);
}

function monthEnd(month: string): string {
  const d = new Date(`${month}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

export function pulseWindow(period: Period): PulseWindow {
  const endDay = Number(period.end.slice(8, 10));
  const month = endDay >= MIN_DAYS_INTO_MONTH ? monthStart(period.end) : monthStart(period.end, 1);
  const days = Math.round((Date.parse(period.end) - Date.parse(period.start)) / 86_400_000) + 1;
  return {
    month,
    previousMonth: monthStart(month, 1),
    monthIsPartial: monthEnd(month) > period.end,
    start: period.start,
    end: period.end,
    previousStart: shift(period.start, -days),
    previousEnd: shift(period.start, -1),
  };
}

const q = (value: string) => `'${value.replace(/'/g, "")}'`;

/** Adoption, NSM, risk, ARR and activity for the reported month and the one before. */
export function monthlySummarySql(config: PulseConfig, w: PulseWindow): string {
  const activity = config.activity.map((m) => `SUM(${m.column}) AS ${m.key}`).join(",\n  ");
  return `SELECT CAST(mes_reporte AS STRING) AS mes,
  COUNT(DISTINCT id_empresa) AS empresas_contratadas,
  COUNT(DISTINCT IF(${config.usageCondition}, id_empresa, NULL)) AS empresas_con_uso,
  COUNT(DISTINCT IF(NSM = 'si', id_empresa, NULL)) AS empresas_nsm,
  COUNT(DISTINCT IF(STARTS_WITH(RISK, 'Riesgo'), id_empresa, NULL)) AS empresas_en_riesgo,
  ROUND(SUM(arr_producto), 2) AS arr_producto,
  ROUND(SUM(IF(NSM = 'si', arr_producto, 0)), 2) AS arr_empresas_nsm,
  MAX(total_empresas_vigentes) AS empresas_vigentes_ubits,
  ${activity}
FROM ${DATASET}.${config.table}\`
WHERE mes_reporte IN (DATE ${q(w.month)}, DATE ${q(w.previousMonth)})
GROUP BY mes
ORDER BY mes`;
}

/** Companies whose NSM changed, or that are at risk of losing it, most ARR first. */
export function companyChangesSql(config: PulseConfig, w: PulseWindow): string {
  return `WITH cur AS (
  SELECT id_empresa, ANY_VALUE(company_name) AS empresa, ANY_VALUE(NSM) AS nsm, ANY_VALUE(RISK) AS riesgo,
    SUM(arr_producto) AS arr, MAX(IF(${config.usageCondition}, 1, 0)) AS con_uso
  FROM ${DATASET}.${config.table}\` WHERE mes_reporte = DATE ${q(w.month)} GROUP BY id_empresa
), prev AS (
  SELECT id_empresa, ANY_VALUE(NSM) AS nsm, MAX(IF(${config.usageCondition}, 1, 0)) AS con_uso
  FROM ${DATASET}.${config.table}\` WHERE mes_reporte = DATE ${q(w.previousMonth)} GROUP BY id_empresa
)
SELECT cur.empresa, cur.riesgo, ROUND(cur.arr, 2) AS arr, cur.con_uso, prev.con_uso AS con_uso_anterior,
  CASE
    WHEN cur.nsm = 'si' AND COALESCE(prev.nsm, 'no') != 'si' THEN 'gano_nsm'
    WHEN cur.nsm != 'si' AND prev.nsm = 'si' THEN 'perdio_nsm'
    WHEN STARTS_WITH(cur.riesgo, 'Riesgo') THEN 'en_riesgo'
    WHEN prev.id_empresa IS NULL THEN 'nueva'
    ELSE 'sin_cambio'
  END AS cambio
FROM cur LEFT JOIN prev USING (id_empresa)
WHERE (cur.nsm = 'si') != (COALESCE(prev.nsm, 'no') = 'si') OR STARTS_WITH(cur.riesgo, 'Riesgo') OR prev.id_empresa IS NULL
ORDER BY CASE cambio WHEN 'perdio_nsm' THEN 0 WHEN 'en_riesgo' THEN 1 WHEN 'gano_nsm' THEN 2 ELSE 3 END, arr DESC
LIMIT ${COMPANY_LIMIT}`;
}

/** New ARR recognized in the pulse days and in the 14 days before (HubSpot). */
export function newArrSql(config: PulseConfig, w: PulseWindow): string {
  return `SELECT
  IF(mes_reconocimiento >= DATE ${q(w.start)}, 'actual', 'anterior') AS periodo,
  ROUND(SUM(arr_producto_usd_multicuentas_split), 2) AS nuevo_arr,
  COUNTIF(arr_producto_usd_multicuentas_split > 0) AS negocios,
  COUNT(DISTINCT IF(arr_producto_usd_multicuentas_split > 0, id_empresa, NULL)) AS empresas
FROM ${DATASET}.arr_hubspot\`
WHERE producto_categoria = ${q(config.arrCategory)}
  AND mes_reconocimiento BETWEEN DATE ${q(w.previousStart)} AND DATE ${q(w.end)}
GROUP BY periodo`;
}

/** Preliminary profitability: accumulated ARR against accumulated spend up to the reported month. */
export function profitabilitySql(config: PulseConfig, w: PulseWindow): string {
  return `SELECT CAST(mes AS STRING) AS mes, ROUND(arr_distribuido_usd, 2) AS arr_mes, ROUND(gasto_total_usd, 2) AS gasto_mes,
  ROUND(arr_acumulado_usd, 2) AS arr_acumulado, ROUND(gasto_acumulado_usd, 2) AS gasto_acumulado
FROM ${DATASET}.arr_vs_spend_consolidated\`
WHERE producto_categoria = ${q(config.arrCategory)} AND mes <= DATE ${q(w.month)}
ORDER BY mes DESC
LIMIT 2`;
}
