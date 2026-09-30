import type { OpenAction } from "../radar/types";
import type { PulseConfig } from "./config";
import type { PulseData } from "./metrics";

/** The history the model compares the pulse against: earlier pulses of the same product. */
export interface PulseHistoryEntry {
  period_key: string;
  month: string | null;
  headline: string | null;
  kpis: Record<string, number | null>;
}

const MAX_COMPANIES = 8;

export function buildPulseContext(data: PulseData, config: PulseConfig, history: PulseHistoryEntry[], openActions: OpenAction[]) {
  const trim = (list: PulseData["companies"]["lostNsm"]) => list.slice(0, MAX_COMPANIES).map(({ name, risk, arr, usedThisMonth }) => ({ name, risk, arr, usedThisMonth }));
  return {
    product: config.productName,
    pulse: { key: data.period.key, label: data.period.label },
    reference_month: { month: data.window.month, is_partial_month_to_date: data.window.monthIsPartial, previous_month: data.window.previousMonth },
    nsm_criterion: config.nsmCriterion,
    activity_labels: Object.fromEntries(config.activity.map((metric) => [metric.key, metric.label])),
    current_month: data.current,
    previous_month: data.previous,
    new_arr_hubspot: { pulse_days: data.newArr.current, previous_14_days: data.newArr.previous },
    profitability: data.profitability,
    companies: {
      lost_nsm: trim(data.companies.lostNsm),
      gained_nsm: trim(data.companies.gainedNsm),
      at_risk_of_losing_nsm: trim(data.companies.atRisk),
      newly_contracted: data.companies.newlyContracted,
    },
    support_tickets: data.tickets
      ? {
          active: data.tickets.active.map(({ key, summary, status, priority }) => ({ key, summary, status, priority })),
          resolved_in_pulse: data.tickets.resolvedInPeriod.map(({ key, summary }) => ({ key, summary })),
          created_in_pulse: data.tickets.createdInPeriod,
          created_previous_14_days: data.tickets.createdPrevious,
        }
      : null,
    customer_cases: data.cases
      ? {
          list_latest_date: data.cases.latestDate,
          created_in_pulse: data.cases.createdInPeriod,
          resolved_in_pulse: data.cases.resolvedInPeriod,
          pending_total: data.cases.pending,
          pending_top: data.cases.pendingTop.map(({ client, title, detail, type, priority, date }) => ({ client, title, detail, type, priority, date })),
          by_type: data.cases.byType,
        }
      : null,
    history: { pulses_available: history.length, previous_pulses: history },
    open_actions: openActions,
  };
}

export type PulseContext = ReturnType<typeof buildPulseContext>;

const SCHEMA = `{
  "status": "red | yellow | green",
  "headline": "Titular natural de máximo 20 palabras",
  "summary": "Resumen ejecutivo de máximo 90 palabras",
  "closing": "Cierre de máximo 45 palabras: qué decidir o vigilar",
  "insights": [{"title": "", "fact": "hecho respaldado por una cifra del contexto", "interpretation": "lectura sin afirmar causalidad", "confidence": "high | medium | low", "evidence": ["ruta.en.el.contexto"]}],
  "hypotheses": [{"statement": "", "how_to_validate": "cómo validarla"}],
  "actions": [{"signal_key": "snake_case_estable", "title": "acción concreta", "evidence": "dato que la justifica", "next_step": "entregable verificable", "owner": "product | design | engineering | data", "continues_action_key": "action_key de open_actions o null"}],
  "watch_next": [{"metric": "", "reason": "", "direction": "increase | decrease | stable | investigate"}]
}`;

export function buildPulsePrompt(context: PulseContext, config: PulseConfig, feedback?: string): string {
  return [
    `Eres analista senior de producto y negocio de ${config.productName} en UBITS. Escribe la lectura del pulso quincenal: adopción, criterio NSM, empresas en riesgo, actividad, ingresos, rentabilidad preliminar y soporte.`,
    "",
    "REGLAS:",
    "- Usa solo CONTEXTO_JSON. No inventes ni recalcules cifras; cítalas como aparecen.",
    `- El criterio NSM de ${config.productName} es: ${config.nsmCriterion}. Di "criterio NSM"; no expandas la sigla.`,
    "- Si reference_month.is_partial_month_to_date es true, las cifras de actividad del mes van a mitad de mes: no las presentes como caída frente al mes anterior completo.",
    "- new_arr_hubspot viene de HubSpot por fecha de reconocimiento y puede incluir negocios que agrupan varios productos: preséntalo como ARR reconocido, sin atribuirlo por completo al producto.",
    "- La rentabilidad es preliminar: gasto acumulado en 0 significa gasto no registrado, no gratis. No afirmes punto de equilibrio si no hay gasto registrado.",
    "- Las empresas listadas son clientes: puedes nombrarlas, pero sin datos de personas.",
    "- Los tickets son de Jira (proyecto PTG); nómbralos por su clave (PTG-1234) y sin URLs.",
    "- customer_cases viene de una lista de Slack de casos y feedback de clientes. Si list_latest_date es muy anterior al pulso, di que la lista no está al día en vez de leerla como actividad reciente.",
    "- Diferencia hechos, interpretaciones e hipótesis; correlación no es causalidad. Sin alarmismo.",
    "- history.pulses_available dice cuántos pulsos previos hay; con menos de 3 no hables de tendencias.",
    "- Si una acción de open_actions sigue vigente, repítela con su action_key en continues_action_key en vez de duplicarla.",
    "- Cifras en formato colombiano: coma decimal, máximo un decimal (43,9%), dólares como US$1.234.",
    "- En ningún texto visible menciones claves ni rutas del contexto (como companies.newly_contracted); escribe en lenguaje natural. Las rutas solo van en evidence.",
    "- En watch_next.metric usa nombres legibles en español.",
    "",
    "CANTIDADES: 3 a 5 insights, 2 a 4 hypotheses, 3 a 5 actions, 3 a 5 watch_next.",
    "BREVEDAD: cada fact, interpretation, evidence y next_step en máximo 40 palabras; el JSON completo debe caber sin cortarse.",
    "evidence debe usar rutas reales del contexto, por ejemplo current_month.nsm o companies.lost_nsm[0].arr.",
    "",
    "Devuelve únicamente JSON válido con este esquema, sin Markdown ni texto adicional:",
    SCHEMA,
    ...(feedback ? ["", `Tu respuesta anterior se rechazó por: ${feedback}. Corrígelo.`] : []),
    "",
    `CONTEXTO_JSON:${JSON.stringify(context)}`,
  ].join("\n");
}
