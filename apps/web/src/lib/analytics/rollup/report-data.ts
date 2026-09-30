import { PULSE_CONFIGS } from "../pulse/config";
import { pulseDatasets, pulseKpis } from "../pulse/report-data";
import { deltaPp } from "../radar/math";
import type { Dataset, Kpi, ReportData, ReportLink } from "../types";
import type { RollupData } from "./gather";
import { shortLabel } from "./message";

/**
 * Stored shape of a roll-up. KPI keys match the weekly and biweekly ones, so the level above reads
 * the same keys from every child (active_users, nsm_companies, …).
 */
function behaviourKpis(data: RollupData): Kpi[] {
  const b = data.behaviour;
  if (!b) return [];
  const { current: c, previous: p } = b.summary;
  const count = (key: string, label: string, value: number, previous: number): Kpi => ({ key, label, value, unit: "count", delta: value - previous, higherIsBetter: true });
  const rate = (key: string, label: string, value: number | null, previous: number | null, higherIsBetter: boolean): Kpi => ({ key, label, value, unit: "pct", delta: deltaPp(value, previous), higherIsBetter });
  return [
    count("active_users", "Usuarios únicos", c.users, p.users),
    count("active_companies", "Empresas únicas", c.companies, p.companies),
    count("sessions", "Sesiones", c.sessions, p.sessions),
    rate("key_action_sessions_pct", "Sesiones con acción clave", c.keyActionSessionsPct, p.keyActionSessionsPct, true),
    count("funnel_starts", "Inicios del funnel", b.funnel.current.starts, b.funnel.previous.starts),
    rate("funnel_complete_pct", "Conversión del funnel", b.funnel.current.completePct, b.funnel.previous.completePct, true),
    rate("dead_click_sessions_pct", "Sesiones con dead clicks", c.deadClickPct, p.deadClickPct, false),
  ];
}

function seriesDataset(data: RollupData): Dataset | null {
  if (!data.series.length) return null;
  const keys = ["active_users", "key_action_sessions_pct", "funnel_complete_pct", "nsm_companies", "at_risk_companies", "product_arr"];
  const labels: Record<string, string> = {
    active_users: "Usuarios",
    key_action_sessions_pct: "Acción clave",
    funnel_complete_pct: "Conversión funnel",
    nsm_companies: "Criterio NSM",
    at_risk_companies: "En riesgo",
    product_arr: "ARR",
  };
  const present = keys.filter((key) => data.series.some((point) => point.kpis[key] !== undefined));
  const units: Record<string, "count" | "pct" | "usd"> = { key_action_sessions_pct: "pct", funnel_complete_pct: "pct", product_arr: "usd" };
  return {
    key: "series",
    title: "Reportes que lo componen",
    columns: [{ key: "period", label: "Periodo" }, { key: "health", label: "Estado" }, ...present.map((key) => ({ key, label: labels[key], unit: units[key] ?? ("count" as const) }))],
    rows: data.series.map((point) => ({
      period: `${shortLabel(point)} · ${point.label}`,
      health: point.health === "green" ? "Verde" : point.health === "red" ? "Rojo" : point.health === "yellow" ? "Amarillo" : "—",
      ...Object.fromEntries(present.map((key) => [key, point.kpis[key] ?? null])),
    })),
    reading: data.children.missing.length ? `Faltan ${data.children.missing.length} reportes del periodo: ${data.children.missing.slice(0, 4).join(", ")}.` : undefined,
  };
}

function behaviourDatasets(data: RollupData): Dataset[] {
  const b = data.behaviour;
  const datasets: Dataset[] = [];
  if (b) {
    datasets.push({
      key: "features",
      title: "Uso de funcionalidades en el periodo",
      columns: [{ key: "label", label: "Funcionalidad" }, { key: "users", label: "Usuarios", unit: "count" }, { key: "companies", label: "Empresas", unit: "count" }, { key: "reach", label: "Alcance", unit: "pct" }],
      rows: b.features.map((f) => ({ label: f.label, users: f.users, companies: f.companies, reach: f.reachPct })),
    });
    datasets.push({
      key: "friction",
      title: "Fricción por pantalla en el periodo",
      columns: [{ key: "label", label: "Pantalla" }, { key: "sessions", label: "Sesiones", unit: "count" }, { key: "friction", label: "Con fricción", unit: "pct" }, { key: "rage", label: "Rage clicks", unit: "count" }, { key: "errors", label: "Otros errores", unit: "count" }],
      rows: b.friction.screens.slice(0, 10).map((s) => ({ label: s.label, sessions: s.sessions, friction: s.frictionPct, rage: s.rageClickSessions, errors: s.errorNon404Sessions })),
    });
  }
  if (data.persistentScreens.length) {
    datasets.push({
      key: "persistent_friction",
      title: "Fricción persistente",
      columns: [{ key: "label", label: "Pantalla" }, { key: "appearances", label: "Periodos en el top 3", unit: "count" }, { key: "average", label: "Fricción promedio", unit: "pct" }],
      rows: data.persistentScreens.map((s) => ({ label: s.label, appearances: s.appearances, average: s.averageFrictionPct })),
    });
  }
  return datasets;
}

export function toRollupReportData(data: RollupData, productId: string): ReportData {
  const pulseConfig = PULSE_CONFIGS[productId];
  const business = data.business && pulseConfig ? data.business : null;
  const series = seriesDataset(data);
  const links: ReportLink[] = (business?.tickets?.active ?? []).map((t) => ({ label: `${t.key} · ${t.summary}`, url: t.url, kind: "ticket" }));
  return {
    kpis: [...behaviourKpis(data), ...(business ? pulseKpis(business, pulseConfig).filter((k) => k.key !== "new_arr_hubspot") : []), ...(business ? [{ key: "new_arr_hubspot", label: "ARR reconocido en el periodo", value: business.newArr.current.arr, unit: "usd" as const, delta: Math.round((business.newArr.current.arr - business.newArr.previous.arr) * 100) / 100, higherIsBetter: true }] : [])],
    datasets: [...(series ? [series] : []), ...behaviourDatasets(data), ...(business ? pulseDatasets(business) : [])],
    links,
  };
}
