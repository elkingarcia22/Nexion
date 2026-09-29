import type { Article, SourcePriority } from "../types";
import { dedupe, shortlistByDomain } from "../engine/candidates";
import { selectVariedShortlist } from "../engine/select";
import type { PromptContext, RankedArticle } from "../engine/types";
import { foldText, hasKeyword } from "../text";

export const PILLS_COUNT = 2;
/** The model picks the 2 pills from this many varied candidates. */
export const SHORTLIST_SIZE = 8;
/** Competitors ship less often than news breaks, so the window is a month. */
export const WINDOW_DAYS = 30;
const SUMMARY_PROMPT_CHARS = 400;
const PREVIOUS_EDITION_CHARS = 1500;
const MIN_TITLE_WORDS = 4;
const DAY_MS = 86_400_000;
const MAX_SIGNAL_POINTS = 5;

/** Ubits product lines (catalog pillars) with the bonus that nudges the shortlist toward the core. */
export const PRODUCT_LINES: Record<string, { label: string; bonus: number }> = {
  latam: { label: "Competidores LATAM", bonus: 2 },
  reclutamiento: { label: "Reclutamiento", bonus: 1 },
  aprendizaje: { label: "Aprendizaje (LMS/LXP)", bonus: 1 },
  objetivos_desempeno: { label: "Objetivos y desempeño", bonus: 1 },
  encuestas_clima: { label: "Encuestas y clima", bonus: 1 },
  compensacion: { label: "Compensación", bonus: 0 },
  suites_hcm: { label: "Suites HCM", bonus: 0 },
};
const PRIORITY_POINTS: Record<SourcePriority, number> = { high: 6, medium: 4, low: 2 };
/** Changelogs are the most concrete signal; press releases next; blogs last. */
const CONTENT_KIND_POINTS: Record<string, number> = { product_updates: 2, press: 1, blog: 0 };

/** Launch vocabulary (folded: lowercase, no accents). */
const LAUNCH_SIGNALS = [
  "launch", "launches", "introduc", "announc", "unveil", "release", "now available", "rolls out", "new feature",
  "ai", "agent", "copilot", "integration", "integrates", "automation", "partnership", "acquires", "acquisition",
  "lanza", "presenta", "anuncia", "nueva", "nuevo", "incorpora", "integra", "ia", "alianza", "adquiere",
];

/** Rules ported from the n8n radar: only public, concrete updates can become a pill. */
const BAD_URL_PATTERNS = [
  /\/api(\/|$)/, /developer/, /\/docs?(\/|$)/, /#/, /\/(register|webinar|webinars|events?|demo)(\/|$)/,
  /\/help(\/|$)/, /support\./, /help\./, /\/login/, /\/\/my\./, /\/(dashboard|admin|settings)(\/|$)/,
  /\/(careers|jobs|pricing)(\/|$)/, /\/(newsroom|news|product-updates|blog|press|press-releases)\/?$/,
  /\/(platform|products?|solutions?|features?)(\/[^/]+)?\/?$/, /\/assetdetail\//, /\.pdf$/,
];
const GENERIC_TITLES = [
  /^learn more$/, /^(featured|follow|latest|all) updates$/, /^newsroom$/, /^product updates$/, /^(read|see) more$/,
];
const NOISE_PATTERNS = [
  /\bwebinar\b/, /\bregist(er|ration)\b/, /\binscri(bete|pcion)\b/, /\bsummit\b/, /\bconference\b/, /\bpodcast\b/,
  /\bfraud(e)?\b/, /\blawsuit\b/, /\bdemanda\b/, /\bestafa\b/, /\barrest/, /\blayoffs?\b/, /\bdespidos?\b/,
  /\bstock\b/, /\bearnings\b/, /\balleged\b/, /\bspying\b/, /\bcourt\b/, /\bcase over\b/, /\bjuicio\b/,
  /\bespionaje\b/, /\bsetbacks?\b/, /\bawards?\b/, /\bpremios?\b/, /\bhiring now\b/, /\bwe are hiring\b/,
];

export function competitorOf(article: Article): string {
  const competitor = article.sourceMetadata?.competitor;
  return typeof competitor === "string" && competitor ? competitor : article.source;
}

/** Hard filter: drop hubs, docs, support, login, events and off-topic corporate news. */
export function isRelevantProductUpdate(article: Article): boolean {
  const url = article.url.toLowerCase();
  if (BAD_URL_PATTERNS.some((pattern) => pattern.test(url))) return false;

  const title = foldText(article.title);
  if (GENERIC_TITLES.some((pattern) => pattern.test(title))) return false;
  if (title.split(" ").filter(Boolean).length < MIN_TITLE_WORDS) return false;
  if (NOISE_PATTERNS.some((pattern) => pattern.test(title))) return false;

  // Google News queries can match other companies with the same name: the competitor must be in the title.
  if (article.sourceMetadata?.via === "google_news") {
    return title.includes(foldText(competitorOf(article)).split(" ")[0]);
  }
  return true;
}

export function scoreProductUpdate(article: Article, now: Date = new Date()): number {
  const text = foldText(`${article.title} ${article.summary}`);
  const signals = Math.min(LAUNCH_SIGNALS.filter((keyword) => hasKeyword(text, keyword)).length, MAX_SIGNAL_POINTS);
  const kind = String(article.sourceMetadata?.content_kind ?? "");
  const ageDays = (now.getTime() - new Date(article.publishedAt).getTime()) / DAY_MS;
  const freshness = ageDays <= 7 ? 2 : ageDays <= 14 ? 1 : 0;
  return (
    PRIORITY_POINTS[article.priority] +
    (PRODUCT_LINES[article.category]?.bonus ?? 0) +
    (CONTENT_KIND_POINTS[kind] ?? 0) +
    signals +
    freshness
  );
}

export function shortlistProductUpdates(articles: Article[], now: Date): Article[] {
  return shortlistByDomain(articles, now, {
    isRelevant: isRelevantProductUpdate,
    windowDays: WINDOW_DAYS,
    domainQuotas: {},
    defaultDomainQuota: 3,
    maxCandidates: 60,
  });
}

/** Rank by quality; the product line is the angle so the two pills cover different lines. */
export function rankProductUpdates(articles: Article[], now: Date = new Date()): RankedArticle[] {
  return dedupe(articles)
    .map((article) => {
      const score = scoreProductUpdate(article, now);
      return { ...article, angle: article.category, editorialScore: score, adjustedScore: score };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore);
}

/** Varied shortlist: best of each product line first, at most 2 per line and 1 per competitor. */
export function selectProductShortlist(ranked: RankedArticle[], count: number): RankedArticle[] {
  return selectVariedShortlist(ranked, count, { maxPerAngle: 2, maxPerDomain: 1, groupOf: competitorOf });
}

function previousEditionBlock(previousMessage: string | null): string {
  if (!previousMessage) return "No hay una edición anterior disponible.";
  return `${previousMessage.slice(0, PREVIOUS_EDITION_CHARS)}

Úsala SOLO como contexto: no repitas competidores, lanzamientos, frases ni el mismo formato de pill.`;
}

export function buildProductPrompt(candidates: RankedArticle[], context: PromptContext): string {
  const sourcesBlock = candidates
    .map(
      (article, index) => `[${index + 1}]
COMPETITOR: ${competitorOf(article)}
PRODUCT_LINE: ${PRODUCT_LINES[article.angle]?.label ?? article.angle}
TITLE: ${article.title}
URL: ${article.url}
SUMMARY: ${article.summary.slice(0, SUMMARY_PROMPT_CHARS) || "(sin resumen disponible)"}`
    )
    .join("\n\n");

  return `
Eres analista senior de producto y benchmark competitivo para UBITS (plataforma de talento y aprendizaje en LATAM).

Fecha: ${context.dateLabel}

Tu tarea tiene dos pasos:
1. De las ${candidates.length} señales de abajo, ELIGE las 2 más relevantes para UBITS: de COMPETIDORES DISTINTOS y, si es posible, de LÍNEAS DE PRODUCTO distintas.
2. Conviértelas en EXACTAMENTE 2 pills de benchmark para Slack.

## Cómo elegir
- Prioriza lanzamientos, features, integraciones o movimientos de IA concretos que UBITS pueda aprender, igualar o diferenciar.
- Descarta señales genéricas, notas corporativas sin producto, o señales que solo hablen de la empresa y no de lo que lanzó.
- Si el título es genérico, usa el resumen para entender la señal; si ambos son vagos, no la elijas.

## Reglas obligatorias
- Devuelve SOLO el mensaje final en markdown para Slack.
- Cada pill desarrolla UNA sola idea y menciona explícitamente al competidor.
- Usa SOLO URLs de la lista. NO inventes competidores, features, cifras ni integraciones.
- Escribe como aprendizaje práctico para UBITS, no como noticia genérica. No escribas literalmente "por qué importa para UBITS".
- Español neutro, breve, claro y estratégico. Si la fuente está en inglés, escribe en español.
- Cada pill debe tener entre 45 y 75 palabras.
- El link de cada pill debe escribirse exactamente así: <URL|Leer más ↗>

## Formatos de pill (usa uno distinto en cada pill)
- 🧠 *INSIGHT COMPETITIVO*
- 📡 *PRODUCT RADAR*
- 👀 *OJO CON ESTO*
- 🛠️ *JUGADA A MIRAR*

## Formato obligatorio
:dart: *Radar de Producto · ${context.dateLabel}*
[una línea: qué están moviendo los competidores esta semana]

[emoji] *[FORMATO] · [Competidor]: [título corto]*
[2 a 4 líneas: qué lanzó y qué señal de mercado revela]
👉 [insight concreto para UBITS en una línea]
<URL EXACTA de la señal elegida|Leer más ↗>

[emoji] *[FORMATO] · [Competidor]: [título corto]*
[2 a 4 líneas]
👉 [insight concreto para UBITS en una línea]
<URL EXACTA de la señal elegida|Leer más ↗>

## Edición anterior del canal
${previousEditionBlock(context.previousMessage)}

## Señales disponibles
${sourcesBlock}
`.trim();
}
