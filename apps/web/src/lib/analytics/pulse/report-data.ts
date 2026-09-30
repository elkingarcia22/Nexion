import type { Dataset, Kpi, ReportData, ReportLink } from "../types";
import type { PulseConfig } from "./config";
import type { PulseData } from "./metrics";

/**
 * Stored shape of a pulse (analytics_reports.data). KPI keys are stable: the monthly report and
 * the next pulse read them back. Deltas are against the previous month (BigQuery) or the
 * previous 14 days (HubSpot, Jira).
 */
function kpi(key: string, label: string, value: number | null, previous: number | null | undefined, unit: Kpi["unit"], higherIsBetter: boolean): Kpi {
  const delta = value === null || previous === null || previous === undefined ? null : Math.round((value - previous) * 100) / 100;
  return { key, label, value, unit, delta, higherIsBetter };
}

export function pulseKpis(data: PulseData, config: PulseConfig): Kpi[] {
  const c = data.current;
  const p = data.previous;
  return [
    kpi("contracted_companies", "Empresas con el producto", c.contracted, p?.contracted, "count", true),
    kpi("companies_with_usage", config.usageLabel, c.withUsage, p?.withUsage, "count", true),
    kpi("nsm_companies", "Empresas con criterio NSM", c.nsm, p?.nsm, "count", true),
    kpi("nsm_pct", "Criterio NSM sobre contratadas", c.nsmPct, p?.nsmPct, "pct", true),
    kpi("at_risk_companies", "En riesgo de perder NSM", c.atRisk, p?.atRisk, "count", false),
    kpi("product_arr", "ARR del producto", c.arr, p?.arr, "usd", true),
    kpi("nsm_arr", "ARR de empresas NSM", c.arrNsm, p?.arrNsm, "usd", true),
    kpi("new_arr_hubspot", "ARR reconocido en la quincena", data.newArr.current.arr, data.newArr.previous.arr, "usd", true),
    ...config.activity.map((metric) => kpi(`activity_${metric.key}`, metric.label, c.activity[metric.key] ?? 0, p?.activity[metric.key], "count", true)),
    ...(data.tickets ? [kpi("active_tickets", "Tickets activos en Jira", data.tickets.active.length, null, "count", false)] : []),
  ];
}

export function pulseDatasets(data: PulseData): Dataset[] {
  const { lostNsm, atRisk, gainedNsm } = data.companies;
  const label = { perdio_nsm: "Perdió el criterio NSM", en_riesgo: "En riesgo", gano_nsm: "Alcanzó el criterio NSM", nueva: "Nueva" } as const;
  const datasets: Dataset[] = [
    {
      key: "companies",
      title: "Empresas a seguir",
      columns: [
        { key: "name", label: "Empresa" },
        { key: "change", label: "Situación" },
        { key: "risk", label: "Riesgo" },
        { key: "arr", label: "ARR", unit: "usd" },
        { key: "usage", label: "Uso este mes" },
      ],
      rows: [...lostNsm, ...atRisk, ...gainedNsm].slice(0, 25).map((company) => ({
        name: company.name,
        change: label[company.change],
        risk: company.risk,
        arr: company.arr,
        usage: company.usedThisMonth ? "Sí" : "No",
      })),
      reading: "Empresas que cambiaron de criterio NSM frente al mes anterior o que están por perderlo.",
    },
  ];
  if (data.profitability) {
    const profit = data.profitability;
    datasets.push({
      key: "profitability",
      title: "Rentabilidad preliminar",
      columns: [
        { key: "concept", label: "Concepto" },
        { key: "value", label: "Valor", unit: "usd" },
      ],
      rows: [
        { concept: "ARR distribuido del mes", value: profit.arrMonth },
        { concept: "ARR acumulado", value: profit.arrAccumulated },
        { concept: "Gasto acumulado", value: profit.spendAccumulated },
        { concept: "Balance acumulado", value: profit.balance },
      ],
      reading: profit.spendAccumulated > 0 ? `Recuperación del gasto: ${profit.recoveryPct}%.` : "No hay gasto registrado para calcular la recuperación.",
    });
  }
  if (data.tickets) {
    datasets.push({
      key: "tickets",
      title: "Tickets de soporte activos (Jira)",
      columns: [
        { key: "key", label: "Ticket" },
        { key: "summary", label: "Resumen" },
        { key: "status", label: "Estado" },
        { key: "updated", label: "Actualizado" },
      ],
      rows: data.tickets.active.map((t) => ({ key: t.key, summary: t.summary, status: t.status, updated: t.updated })),
    });
  }
  if (data.cases?.pendingTop.length) {
    datasets.push({
      key: "customer_cases",
      title: "Casos y feedback pendientes (lista de Slack)",
      columns: [
        { key: "client", label: "Cliente" },
        { key: "title", label: "Caso" },
        { key: "type", label: "Tipo" },
        { key: "date", label: "Fecha" },
      ],
      rows: data.cases.pendingTop.map((c) => ({ client: c.client, title: c.title, type: c.type, date: c.date })),
      reading: `${data.cases.pending} pendientes en total; la lista tiene casos hasta el ${data.cases.latestDate ?? "—"}.`,
    });
  }
  return datasets;
}

export function pulseLinks(data: PulseData): ReportLink[] {
  return (data.tickets?.active ?? []).map((t) => ({ label: `${t.key} · ${t.summary}`, url: t.url, kind: "ticket" as const }));
}

export function toPulseReportData(data: PulseData, config: PulseConfig): ReportData {
  return { kpis: pulseKpis(data, config), datasets: pulseDatasets(data), links: pulseLinks(data) };
}
