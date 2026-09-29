import type { Article, SourcePriority } from "../types";
import { dedupe, shortlistByDomain } from "../engine/candidates";
import { selectVariedShortlist } from "../engine/select";
import type { PromptContext, RankedArticle } from "../engine/types";
import { foldText, hasKeyword } from "../text";

export const PILLS_COUNT = 2;
/** The model picks the 2 pills from this many varied candidates. */
export const SHORTLIST_SIZE = 8;
/** Practical guidance ages slower than news. */
export const WINDOW_DAYS = 30;
const SUMMARY_PROMPT_CHARS = 400;
const PREVIOUS_EDITION_CHARS = 1500;
const MIN_TITLE_WORDS = 4;
const DAY_MS = 86_400_000;
const MAX_SIGNAL_POINTS = 5;

/** Catalog pillars with the bonus that nudges the shortlist toward the core topics. */
export const PILLARS: Record<string, { label: string; bonus: number }> = {
  prompts_llms: { label: "Prompts y LLMs", bonus: 2 },
  ux_de_ia: { label: "UX de IA", bonus: 2 },
  usabilidad_research: { label: "Usabilidad y research", bonus: 2 },
  accesibilidad: { label: "Accesibilidad", bonus: 1 },
  ui_design_systems: { label: "UI y design systems", bonus: 1 },
  producto_discovery: { label: "Producto y discovery", bonus: 1 },
  espanol: { label: "En español", bonus: 1 },
};
const PRIORITY_POINTS: Record<SourcePriority, number> = { high: 6, medium: 4, low: 2 };
/** Static reference pages parse into navigation links; keep them as depth, not as the main pick. */
const REFERENCE_PENALTY = 3;

/** Practical-tip vocabulary (folded: lowercase, no accents). */
const SIGNALS = [
  "prompt", "prompting", "llm", "ai", "ia", "agent", "eval", "evaluation", "rag", "context", "ux", "usability",
  "usabilidad", "accessibility", "accesibilidad", "a11y", "wcag", "aria", "research", "investigacion", "user testing",
  "design system", "pattern", "patron", "interface", "interfaz", "onboarding", "heuristic", "survey", "interview",
  "prototype", "prototipo", "figma", "how to", "guide", "guia", "tips", "checklist", "framework", "mistakes", "errores",
];

/** Headlines that are never a practical tip: navigation, promos, events, wallpapers, job posts. */
const NOISE_PATTERNS = [
  /\bwallpapers?\b/, /\bwebinar\b/, /\bregist(er|ration)\b/, /\bsummit\b/, /\bconference\b/, /\bmeetup\b/,
  /\bsponsored\b/, /\bdiscount\b/, /\bsale\b/, /\bpricing\b/, /\bwe(')?re hiring\b/, /\bjob opening\b/,
  /^(log ?in|sign (in|up)|subscribe|about( us)?|contact|careers|view all|read more|see all|all articles)$/,
  /\b(course|workshop) (enrollment|registration)\b/, /\bchangelog\b/, /\brelease notes?\b/,
  // Corporate news without a practical lesson.
  /\binvests?\b/, /\bexpanded .* office\b/, /\bnew office\b/, /\braises?\b .* (funding|series)/, /\bacquires?\b/,
  /\bappoints?\b/, /\bearnings\b/, /\bipo\b/,
];
const BAD_URL_PATTERNS = [
  /\/(tag|tags|category|categories|author|authors|page)\//, /\/(login|signup|register|pricing|careers|jobs|contact|about)(\/|$)/,
  /#/, /\/(events?|webinars?)(\/|$)/, /\.(pdf|png|jpg)$/,
];

/** Hard filter: drop navigation links, promos and events; everything else is a curated source. */
export function isRelevantTip(article: Article): boolean {
  const url = article.url.toLowerCase();
  if (BAD_URL_PATTERNS.some((pattern) => pattern.test(url))) return false;
  const title = foldText(article.title);
  if (title.split(" ").filter(Boolean).length < MIN_TITLE_WORDS) return false;
  return !NOISE_PATTERNS.some((pattern) => pattern.test(title));
}

export function scoreTip(article: Article, now: Date = new Date()): number {
  const text = foldText(`${article.title} ${article.summary}`);
  const signals = Math.min(SIGNALS.filter((keyword) => hasKeyword(text, keyword)).length, MAX_SIGNAL_POINTS);
  const ageDays = (now.getTime() - new Date(article.publishedAt).getTime()) / DAY_MS;
  const freshness = ageDays <= 7 ? 2 : ageDays <= 14 ? 1 : 0;
  const reference = article.sourceMetadata?.content_kind === "reference" ? REFERENCE_PENALTY : 0;
  return PRIORITY_POINTS[article.priority] + (PILLARS[article.category]?.bonus ?? 0) + signals + freshness - reference;
}

export function shortlistTips(articles: Article[], now: Date): Article[] {
  return shortlistByDomain(articles, now, {
    isRelevant: isRelevantTip,
    windowDays: WINDOW_DAYS,
    domainQuotas: {},
    defaultDomainQuota: 3,
    maxCandidates: 60,
  });
}

/** Rank by quality; the pillar is the angle so the two pills cover different topics. */
export function rankTips(articles: Article[], now: Date = new Date()): RankedArticle[] {
  return dedupe(articles)
    .map((article) => {
      const score = scoreTip(article, now);
      return { ...article, angle: article.category, editorialScore: score, adjustedScore: score };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore);
}

/** Varied shortlist: best of each pillar first, at most 2 per pillar and per outlet. */
export function selectTipShortlist(ranked: RankedArticle[], count: number): RankedArticle[] {
  return selectVariedShortlist(ranked, count, { maxPerAngle: 2, maxPerDomain: 2 });
}

function previousEditionBlock(previousMessage: string | null): string {
  if (!previousMessage) return "No hay una edición anterior disponible.";
  return `${previousMessage.slice(0, PREVIOUS_EDITION_CHARS)}

Úsala SOLO como contexto: no repitas temas, fuentes, frases ni tips.`;
}

export function buildTipsPrompt(candidates: RankedArticle[], context: PromptContext): string {
  const sourcesBlock = candidates
    .map(
      (article, index) => `[${index + 1}]
TITLE: ${article.title}
SOURCE: ${article.source}
PILLAR: ${PILLARS[article.angle]?.label ?? article.angle}
URL: ${article.url}
SUMMARY: ${article.summary.slice(0, SUMMARY_PROMPT_CHARS) || "(sin resumen disponible)"}`
    )
    .join("\n\n");

  return `
Eres editor senior de contenidos de IA aplicada, UX y prompts para Slack en UBITS.

Fecha: ${context.dateLabel}

Tu tarea tiene dos pasos:
1. De los ${candidates.length} recursos de abajo, ELIGE los 2 más útiles para aplicar esta semana, de PILARES DISTINTOS.
2. Conviértelos en EXACTAMENTE 2 pills cortas sobre IA usability, prompts, insights y tips prácticos para equipos de Producto, UX, Diseño y Aprendizaje.

## Cómo elegir
- Prioriza tips prácticos sobre prompts, IA aplicada, usabilidad, accesibilidad, investigación UX, patrones de interfaz o aprendizaje digital.
- Descarta recursos promocionales, anuncios de producto sin aprendizaje, colecciones de recursos sin tip concreto y contenido demasiado técnico sin traducción práctica.

## Reglas obligatorias
- Devuelve SOLO el mensaje final en markdown para Slack.
- Cada pill usa UNA sola fuente; no mezcles fuentes.
- Usa SOLO URLs de la lista. NO inventes datos, links, frameworks, autores ni casos.
- NO agregues lista final de fuentes. NO uses tono académico ni vendedor.
- NO escribas "Idea central" ni secciones de reflexiones largas.
- Español natural, claro y profesional. Si la fuente está en inglés, escribe en español.
- Cada pill debe tener entre 55 y 85 palabras, una sola idea central y un tip aplicable esta semana.
- El link de cada pill debe escribirse exactamente así: <URL|Leer más ↗>

## Formato obligatorio
:books: *IA Usability & Prompts · ${context.dateLabel}*
[hook corto de una sola línea sobre lo más útil de aplicar hoy]

:bulb: *PILL 1 · [título corto y potente]*
[2 a 4 líneas: qué insight deja la fuente, por qué importa para UX/producto/aprendizaje y cómo aplicarlo]
:point_right: [tip accionable en una sola línea]
:link: <URL EXACTA del recurso elegido|Leer más ↗>

:hammer_and_wrench: *PILL 2 · [título corto y potente]*
[2 a 4 líneas]
:point_right: [tip accionable en una sola línea]
:link: <URL EXACTA del recurso elegido|Leer más ↗>

## Criterio editorial
- Si la fuente es técnica, tradúcela a una recomendación simple para equipos.
- Si es de diseño, aterrízala a cómo mejorar una experiencia real.
- Si es de prompts o IA, aterrízala a cómo pedir mejor, evaluar mejor o reducir errores.
- Evita frases genéricas como "la IA redefine el futuro". Haz que el lector piense: "esto lo puedo probar esta semana".

## Edición anterior del canal
${previousEditionBlock(context.previousMessage)}

## Recursos disponibles
${sourcesBlock}
`.trim();
}
