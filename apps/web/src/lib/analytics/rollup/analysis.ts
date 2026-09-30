import { REPORT_TYPE_LABELS } from "../periods";
import { PULSE_CONFIGS } from "../pulse/config";
import type { OpenAction } from "../radar/types";
import type { RollupData } from "./gather";
import type { RollupLevel } from "./periods";
import type { SeriesPoint } from "./series";

/** Each level answers different questions (from the n8n period contracts). */
const QUESTIONS: Record<RollupLevel, string[]> = {
  mensual: [
    "¿El producto creció, se mantuvo o cayó en el mes?",
    "¿Los cambios de las semanas son tendencia o ruido?",
    "¿Qué funcionalidades ganan o pierden adopción?",
    "¿Qué fricciones son persistentes (aparecen en varias semanas)?",
    "¿Las acciones cerradas en el mes muestran resultados?",
    "¿Cuál debe ser el foco del próximo mes?",
  ],
  trimestral: [
    "¿El producto creció, se mantuvo o cayó en el trimestre, mes a mes?",
    "¿El uso creció por más empresas activas o por más profundidad en la misma base?",
    "¿Qué fricciones fueron recurrentes durante el trimestre?",
    "¿El uso se conecta con el criterio NSM y el ARR?",
    "¿Qué objetivo y prioridades conviene fijar para el siguiente trimestre?",
  ],
  semestral: [
    "¿Cómo evolucionó el producto trimestre a trimestre en el semestre?",
    "¿Qué apuestas funcionaron y cuáles no, según las acciones y los datos?",
    "¿Qué debe priorizarse en el siguiente semestre?",
  ],
  anual: [
    "¿Cómo evolucionó el producto en el año, trimestre a trimestre?",
    "¿Qué cambió de fondo en adopción, criterio NSM e ingresos?",
    "¿Qué apuestas conviene fijar para el próximo año?",
  ],
};

export interface RollupHistoryEntry {
  period_key: string;
  headline: string | null;
  kpis: Record<string, number | null>;
}

const MAX_COMPANIES = 8;

function seriesForModel(series: SeriesPoint[]) {
  return series.map(({ type, label, health, headline, kpis }) => ({ level: REPORT_TYPE_LABELS[type], label, health, headline, kpis }));
}

export function buildRollupContext(data: RollupData, productId: string, productName: string, history: RollupHistoryEntry[], openActions: OpenAction[]) {
  const { window, behaviour, business } = data;
  const trim = <T extends { name: string; risk: string; arr: number }>(list: T[]) => list.slice(0, MAX_COMPANIES).map(({ name, risk, arr }) => ({ name, risk, arr }));
  return {
    product: productName,
    level: REPORT_TYPE_LABELS[data.level],
    period: { key: window.period.key, label: window.period.label, is_partial: window.partial, compared_with: window.previous.label },
    child_reports: { expected: data.children.expected, found: data.children.found.length, missing: data.children.missing },
    series_of_child_reports: seriesForModel(data.series),
    behaviour_whole_period: behaviour
      ? {
          current: behaviour.summary.current,
          previous_period: behaviour.summary.previous,
          alerts: behaviour.summary.alerts,
          features: behaviour.features.slice(0, 8).map(({ key: _k, ...feature }) => feature),
          funnel: { current: behaviour.funnel.current, previous: { starts: behaviour.funnel.previous.starts, completePct: behaviour.funnel.previous.completePct }, main_dropoff: behaviour.funnel.mainDropoff },
          top_friction_screens: behaviour.friction.screens.slice(0, 6),
        }
      : null,
    persistent_friction: data.persistentScreens,
    business_close: business
      ? {
          close_month: window.closeMonth,
          compared_with_month: window.previousCloseMonth,
          nsm_criterion: PULSE_CONFIGS[productId]?.nsmCriterion ?? null,
          current: business.current,
          previous: business.previous,
          arr_recognized_in_period: business.newArr.current,
          arr_recognized_previous_period: business.newArr.previous,
          profitability: business.profitability,
          companies: {
            lost_nsm: trim(business.companies.lostNsm),
            gained_nsm: trim(business.companies.gainedNsm),
            at_risk_of_losing_nsm: trim(business.companies.atRisk),
            newly_contracted: business.companies.newlyContracted,
          },
          okrs: business.okrs ? { quarter_tab: business.okrs.tab, weighted_progress_pct: business.okrs.weightedProgressPct, most_advanced: business.okrs.mostAdvanced?.keyResult ?? null, biggest_gap: business.okrs.biggestGap?.keyResult ?? null, without_defined_target: business.okrs.withoutTarget } : null,
          implementation_feedback: business.feedback ? { in_period: business.feedback.inPeriod, open_in_period: business.feedback.openInPeriod, undated_open_backlog: business.feedback.undatedOpen } : null,
          customer_cases: business.cases
            ? { list_latest_date: business.cases.latestDate, created_in_period: business.cases.createdInPeriod, pending_total: business.cases.pending, pending_top: business.cases.pendingTop.map(({ client, title, type }) => ({ client, title, type })) }
            : null,
          support_tickets: business.tickets
            ? { active: business.tickets.active.map(({ key, summary, status }) => ({ key, summary, status })), created_in_period: business.tickets.createdInPeriod, resolved_in_period: business.tickets.resolvedInPeriod.length }
            : null,
        }
      : null,
    action_review: data.actions,
    history: { previous_reports_of_this_level: history },
    open_actions: openActions,
  };
}

export type RollupContext = ReturnType<typeof buildRollupContext>;

const SCHEMA = `{
  "status": "red | yellow | green",
  "headline": "Titular natural de máximo 20 palabras",
  "summary": "Resumen ejecutivo de máximo 110 palabras que responda las preguntas del nivel",
  "closing": "Objetivo o foco recomendado para el siguiente periodo, en máximo 45 palabras",
  "insights": [{"title": "", "fact": "hecho respaldado por una cifra del contexto", "interpretation": "lectura sin afirmar causalidad", "confidence": "high | medium | low", "evidence": ["ruta.en.el.contexto"]}],
  "hypotheses": [{"statement": "", "how_to_validate": ""}],
  "actions": [{"signal_key": "snake_case_estable", "title": "prioridad concreta del siguiente periodo", "evidence": "dato que la justifica", "next_step": "entregable verificable", "owner": "product | design | engineering | data", "continues_action_key": "action_key de open_actions o null"}],
  "watch_next": [{"metric": "", "reason": "", "direction": "increase | decrease | stable | investigate"}]
}`;

export function buildRollupPrompt(context: RollupContext, level: RollupLevel, feedback?: string): string {
  return [
    `Eres analista senior de producto y negocio de ${context.product} en UBITS. Escribe la lectura ${context.level.toLowerCase()} de ${context.period.label}.`,
    "",
    "PREGUNTAS QUE DEBE RESPONDER:",
    ...QUESTIONS[level].map((question) => `- ${question}`),
    "",
    "REGLAS:",
    "- Usa solo CONTEXTO_JSON; no inventes ni recalcules cifras.",
    "- behaviour_whole_period viene de una consulta del periodo completo (usuarios y empresas únicos): úsala para el total; series_of_child_reports sirve para ver la evolución, nunca para sumar.",
    "- No promedies porcentajes ni sumes usuarios o empresas de periodos distintos.",
    "- Si period.is_partial es true o faltan reportes hijos (child_reports.missing), dilo y no afirmes tendencias completas.",
    "- Con menos de 3 puntos en la serie no hables de tendencia ni de estacionalidad.",
    "- El impacto de acciones solo puede afirmarse si action_review.closedInPeriod trae resultado; si no, di que falta registrarlo.",
    "- La rentabilidad es preliminar: gasto no registrado no significa operación gratuita.",
    "- El ARR reconocido en HubSpot puede incluir negocios que agrupan varios productos.",
    "- Dead clicks, rage clicks y 404 son señales por validar, no causas.",
    "- Si una acción de open_actions sigue vigente, repítela con su action_key en continues_action_key.",
    "- Cifras en formato colombiano (coma decimal, máximo un decimal; US$1.234). Di \"criterio NSM\" sin expandir la sigla.",
    "- En ningún texto visible menciones claves ni rutas del contexto; esas solo van en evidence.",
    "",
    "CANTIDADES: 3 a 5 insights, 2 a 4 hypotheses, 3 a 5 actions (prioridades del siguiente periodo), 3 a 5 watch_next.",
    "BREVEDAD: cada fact, interpretation, evidence y next_step en máximo 40 palabras.",
    "",
    "Devuelve únicamente JSON válido con este esquema, sin Markdown ni texto adicional:",
    SCHEMA,
    ...(feedback ? ["", `Tu respuesta anterior se rechazó por: ${feedback}. Corrígelo.`] : []),
    "",
    `CONTEXTO_JSON:${JSON.stringify(context)}`,
  ].join("\n");
}
