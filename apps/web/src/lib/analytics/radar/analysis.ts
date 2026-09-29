import type { RadarConfig } from "./config";
import type { Health } from "./math";
import type { OpenAction, RadarAction, RadarAnalysis, RadarHistoryEntry, RadarWeek } from "./types";

/**
 * The AI reading of a week. The model only interprets: every number shown in Slack comes from
 * the deterministic metrics, and its output is checked before it is used.
 */
const MAX_WORDS_HEADLINE = 25;
const OWNERS = ["product", "design", "engineering", "data"] as const;
const DIRECTIONS = ["increase", "decrease", "stable", "investigate"] as const;
const CONFIDENCES = ["high", "medium", "low"] as const;
const HEALTH: Health[] = ["green", "yellow", "red"];
const FORBIDDEN = [/https?:\/\//i, /[\w.+-]+@[\w-]+\.[\w.]+/, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i];

export function buildAnalysisContext(week: RadarWeek, history: RadarHistoryEntry[], openActions: OpenAction[], config: RadarConfig) {
  const { summary, funnel, recurrence } = week;
  return {
    product: config.productName,
    week: { key: week.period.key, label: week.period.label },
    weekly_experience: { current: summary.current, previous: summary.previous, alerts: summary.alerts },
    feature_usage: week.features.map(({ key, ...rest }) => ({ feature_key: key, ...rest })),
    funnel: {
      name: config.funnel.label,
      current: funnel.current,
      previous: { starts: funnel.previous.starts, completePct: funnel.previous.completePct, confirmedPct: funnel.previous.confirmedPct, avgMinutes: funnel.previous.avgMinutes },
      main_dropoff: funnel.mainDropoff,
    },
    recurrence,
    friction_top_screens: week.friction.screens.slice(0, 6),
    companies_with_friction: week.companies.slice(0, 5),
    replay_evidence: week.replays.map(({ sessionId: _s, url: _u, startedAt: _t, ...rest }) => rest),
    history: { weeks_available: history.length, previous_weeks: history },
    open_actions: openActions,
  };
}

export type AnalysisContext = ReturnType<typeof buildAnalysisContext>;

const SCHEMA = `{
  "status": "red | yellow | green",
  "headline": "Titular natural de máximo ${MAX_WORDS_HEADLINE} palabras",
  "summary": "Resumen ejecutivo de máximo 90 palabras",
  "closing": "Cierre de máximo 45 palabras: qué vigilar o decidir",
  "insights": [{"title": "", "fact": "hecho respaldado por una cifra del contexto", "interpretation": "lectura sin afirmar causalidad", "confidence": "high | medium | low", "evidence": ["ruta.en.el.contexto"]}],
  "hypotheses": [{"statement": "", "how_to_validate": "replays, instrumentación o investigación"}],
  "actions": [{"signal_key": "snake_case_estable", "title": "acción concreta", "evidence": "dato que la justifica", "next_step": "entregable verificable", "owner": "product | design | engineering | data", "continues_action_key": "action_key de open_actions o null"}],
  "watch_next": [{"metric": "", "reason": "", "direction": "increase | decrease | stable | investigate"}]
}`;

export function buildAnalysisPrompt(context: AnalysisContext, config: RadarConfig, feedback?: string): string {
  return [
    `Eres analista senior de producto digital de ${config.productName} en UBITS. Analiza la semana: experiencia, adopción, recurrencia, funnel de ${config.funnel.label.toLowerCase()}, fricción e instrumentación.`,
    "",
    "REGLAS:",
    "- Usa solo CONTEXTO_JSON. No inventes, recalcules ni redondees cifras distinto a como aparecen.",
    "- Diferencia hechos, interpretaciones e hipótesis. No presentes correlación como causalidad.",
    "- Dead clicks, rage clicks, 404 y excepciones son señales por validar, no causas demostradas.",
    "- No incluyas emails, IDs, session_id ni URLs. Solo menciona empresas que aparezcan en el contexto.",
    "- No analices métricas comerciales (NSM, ARR, OKRs).",
    `- history.weeks_available dice cuántas semanas previas hay. Con menos de 4 no hables de tendencias sostenidas; compara solo contra la semana anterior.`,
    "- Si una acción de open_actions sigue vigente, no la dupliques: repítela con su action_key en continues_action_key.",
    "- signal_key identifica el problema (no la redacción): mismo problema, mismo signal_key.",
    "- Escribe en español natural, profesional y conciso, en frases completas.",
    "- Cifras en formato colombiano: coma decimal y máximo un decimal (43,9%; +6,9 pp).",
    "- En watch_next.metric usa el nombre legible de la métrica en español (por ejemplo \"Sesiones con dead clicks\"), nunca claves ni rutas del contexto.",
    "",
    "CANTIDADES: 3 a 5 insights, 2 a 4 hypotheses, 3 a 5 actions, 3 a 5 watch_next.",
    "evidence debe usar rutas reales del contexto, por ejemplo funnel.current.completePct o friction_top_screens[0].frictionPct.",
    "",
    "Devuelve únicamente JSON válido con este esquema, sin Markdown ni texto adicional:",
    SCHEMA,
    ...(feedback ? ["", `Tu respuesta anterior se rechazó por: ${feedback}. Corrígelo.`] : []),
    "",
    `CONTEXTO_JSON:${JSON.stringify(context)}`,
  ].join("\n");
}

/** Resolves "a.b[0].c" against the context; used to keep only traceable evidence. */
export function resolvePath(root: unknown, path: string): boolean {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let node: unknown = root;
  for (const part of parts) {
    if (node === null || typeof node !== "object" || !(part in (node as object))) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return parts.length > 0;
}

/** "43.88%" / "+6.94 pp" → "43,9%" / "+6,9 pp": the message is in es-CO with one decimal. */
export function localizeNumbers(value: string): string {
  return value.replace(/(\d+)\.(\d+)(?=\s?(?:%|pp\b))/g, (_, whole: string, fraction: string) =>
    (Math.round(Number(`${whole}.${fraction}`) * 10) / 10).toLocaleString("es-CO", { maximumFractionDigits: 1 })
  );
}

function text(value: unknown, max = 600): string {
  return typeof value === "string" ? localizeNumbers(value.replace(/\s+/g, " ").trim()).slice(0, max) : "";
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function slug(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
}

export type ParsedAnalysis = { ok: true; analysis: RadarAnalysis } | { ok: false; error: string };

export function parseAnalysis(raw: string, context: AnalysisContext): ParsedAnalysis {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false, error: "no devolvió un objeto JSON" };
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return { ok: false, error: "el JSON está incompleto o mal formado" };
  }

  const list = (key: string) => (Array.isArray(data[key]) ? (data[key] as Record<string, unknown>[]) : []);
  const openKeys = new Set(context.open_actions.map((action) => action.action_key));

  const analysis: RadarAnalysis = {
    status: pick(data.status, HEALTH, "yellow"),
    headline: text(data.headline, 220),
    summary: text(data.summary, 900),
    closing: text(data.closing, 400),
    insights: list("insights")
      .map((item) => ({
        title: text(item.title, 180),
        fact: text(item.fact),
        interpretation: text(item.interpretation),
        confidence: pick(item.confidence, CONFIDENCES, "medium"),
        evidence: (Array.isArray(item.evidence) ? item.evidence : []).map(String).filter((path) => resolvePath(context, path)),
      }))
      .filter((item) => item.fact && item.interpretation),
    hypotheses: list("hypotheses")
      .map((item) => ({ statement: text(item.statement), how_to_validate: text(item.how_to_validate) }))
      .filter((item) => item.statement && item.how_to_validate),
    actions: dedupeActions(
      list("actions").map((item): RadarAction => {
        const continues = typeof item.continues_action_key === "string" && openKeys.has(item.continues_action_key) ? item.continues_action_key : undefined;
        return {
          signalKey: slug(text(item.signal_key) || text(item.title)) || "accion",
          title: text(item.title, 300),
          evidence: text(item.evidence, 400),
          nextStep: text(item.next_step, 400),
          owner: pick(item.owner, OWNERS, "product"),
          ...(continues ? { continuesActionKey: continues } : {}),
        };
      })
    ).filter((action) => action.title),
    watch_next: list("watch_next")
      .map((item) => ({ metric: text(item.metric, 160), reason: text(item.reason, 300), direction: pick(item.direction, DIRECTIONS, "investigate") }))
      .filter((item) => item.metric),
  };

  const problem = validate(analysis);
  return problem ? { ok: false, error: problem } : { ok: true, analysis };
}

function dedupeActions(actions: RadarAction[]): RadarAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = action.continuesActionKey ?? action.signalKey;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validate(analysis: RadarAnalysis): string | null {
  if (!analysis.headline || !analysis.summary) return "faltan headline o summary";
  if (analysis.headline.split(/\s+/).length > MAX_WORDS_HEADLINE) return `el headline supera ${MAX_WORDS_HEADLINE} palabras`;
  if (analysis.insights.length < 2) return "hay menos de 2 insights con hecho e interpretación";
  if (analysis.actions.length < 2) return "hay menos de 2 acciones";
  if (analysis.insights.some((insight) => insight.evidence.length === 0)) return "algún insight no cita rutas de evidencia válidas del contexto";
  const visible = [analysis.headline, analysis.summary, analysis.closing, ...analysis.actions.flatMap((a) => [a.title, a.evidence, a.nextStep])].join(" ");
  if (FORBIDDEN.some((pattern) => pattern.test(visible))) return "incluye URLs, emails o identificadores";
  if (analysis.watch_next.some((item) => /[a-z][A-Z]|[._\[\]]/.test(item.metric))) return "watch_next.metric usa claves técnicas en vez de nombres legibles";
  return null;
}
