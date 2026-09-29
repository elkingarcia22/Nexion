import type { Article, SourcePriority } from "../types";
import { dedupe, shortlistByDomain } from "../engine/candidates";
import { selectVariedShortlist } from "../engine/select";
import type { PromptContext, RankedArticle } from "../engine/types";
import { foldText, hasKeyword } from "../text";

export const PILLS_COUNT = 2;
/** The model picks the 2 pills from this many varied candidates. */
export const SHORTLIST_SIZE = 8;
export const WINDOW_DAYS = 14;
const SUMMARY_PROMPT_CHARS = 400;
const PREVIOUS_EDITION_CHARS = 1500;
const MIN_TITLE_WORDS = 4;
const DAY_MS = 86_400_000;
const MAX_SIGNAL_POINTS = 6;

/** Catalog pillars (source category) with the bonus that nudges variety toward the most useful topics. */
export const PILLARS: Record<string, { label: string; bonus: number }> = {
  ia_en_rrhh: { label: "IA en RR. HH.", bonus: 3 },
  hr_tech: { label: "HR tech", bonus: 2 },
  talento_reclutamiento: { label: "Talento y reclutamiento", bonus: 2 },
  latam: { label: "RR. HH. en LATAM", bonus: 2 },
  tendencias_trabajo: { label: "Tendencias del trabajo", bonus: 2 },
  aprendizaje: { label: "Aprendizaje y skills", bonus: 1 },
  media_hr: { label: "Gestión de personas", bonus: 0 },
};
const PRIORITY_POINTS: Record<SourcePriority, number> = { high: 6, medium: 4, low: 2 };

// Matching runs on folded text (lowercase, no accents); English and Spanish so LATAM sources compete fairly.
const SIGNALS = [
  "ai", "ia", "agent", "agentic", "automation", "automatizacion", "inteligencia artificial", "hr tech", "hr technology",
  "skills", "habilidades", "reskill", "upskill", "capacitacion", "workforce", "future of work", "futuro del trabajo",
  "recruiting", "hiring", "talent", "talento", "reclutamiento", "seleccion", "onboarding", "performance", "desempeno",
  "leadership", "liderazgo", "manager", "retention", "retencion", "rotacion", "wellbeing", "bienestar", "mental health",
  "salud mental", "culture", "cultura", "employee experience", "experiencia del colaborador", "chro", "people analytics",
];

/** Headlines that are never worth a pill: people moves, events, newsletter issues, ads. */
const NOISE_PATTERNS = [
  /\bon the move\b/, /\bappoint(s|ed|ment)\b/, /\bnames? .* (chief|head|vp|director)\b/, /\bjoins? .* as\b/,
  /\bbrings? on new\b/, /\bnew hr talent\b/, /\bexecutive moves?\b/,
  /\bnombra(miento)?\b/, /\bnuev[oa] (director|gerente|ceo|vp)\b/,
  /\bwebinar\b/, /\bsummit\b/, /\bconference\b/, /\bcongreso\b/, /\bno te pierdas\b/, /\bregist(er|ration)\b/,
  /\binscri(bete|pcion)\b/, /\bcoming soon\b/, /\bedicion del\b/, /\bday 20\d\d\b/, /\bpodcast\b/, /\bepisode\b/,
  /\bissue \d+\b/, /\bnewsletter\b/, /\bnewz\b/, /\bweekly (roundup|recap)\b/, /\bresumen semanal\b/,
  /\bsponsored\b/, /\badvertorial\b/, /\bwhite paper\b/, /\bdownload now\b/, /\bpatrocinado\b/, /\bpress release\b/,
  /\bawards?\b/, /\bpremios?\b/,
];
const BAD_URL_PARTS = ["/subscribe", "/newsletter", "/advertise", "/privacy", "/contact", "/tag/", "/category/", "/author/", "/events/"];
const LAYOFF_TERMS = ["layoff", "job cuts", "despidos", "recorte de personal"];
const LAYOFF_HR_ANGLE = ["ai", "ia", "automation", "automatizacion", "reskill", "restructuring", "communication", "comunicacion", "hr leadership", "chro"];

function titleText(article: Article): string {
  return foldText(article.title);
}

function fullText(article: Article): string {
  return foldText(`${article.title} ${article.summary}`);
}

/** Hard filter: the catalog is already curated for HR, so only noise is dropped here. */
export function isRelevantHrArticle(article: Article): boolean {
  const url = article.url.toLowerCase();
  if (BAD_URL_PARTS.some((part) => url.includes(part))) return false;

  const title = titleText(article);
  if (title.split(" ").filter(Boolean).length < MIN_TITLE_WORDS) return false; // e.g. a person's profile page
  if (NOISE_PATTERNS.some((pattern) => pattern.test(title))) return false;

  const text = fullText(article);
  if (LAYOFF_TERMS.some((term) => text.includes(term)) && !LAYOFF_HR_ANGLE.some((term) => hasKeyword(text, term))) {
    return false; // layoff news only counts when it carries an HR lesson
  }
  return true;
}

/** Quality score used to order the shortlist: source priority, pillar, topical signals and freshness. */
export function scoreHrArticle(article: Article, now: Date = new Date()): number {
  const text = fullText(article);
  const signals = Math.min(SIGNALS.filter((keyword) => hasKeyword(text, keyword)).length, MAX_SIGNAL_POINTS);
  const ageDays = (now.getTime() - new Date(article.publishedAt).getTime()) / DAY_MS;
  const freshness = ageDays <= 2 ? 2 : ageDays <= 5 ? 1 : 0;
  return PRIORITY_POINTS[article.priority] + (PILLARS[article.category]?.bonus ?? 0) + signals + freshness;
}

export function shortlistHr(articles: Article[], now: Date): Article[] {
  return shortlistByDomain(articles, now, {
    isRelevant: isRelevantHrArticle,
    windowDays: WINDOW_DAYS,
    domainQuotas: {},
    defaultDomainQuota: 3,
    maxCandidates: 60,
  });
}

/** Rank by quality; the source pillar is the angle so the two pills cover different topics. */
export function rankHrArticles(articles: Article[], now: Date = new Date()): RankedArticle[] {
  return dedupe(articles)
    .map((article) => {
      const score = scoreHrArticle(article, now);
      return { ...article, angle: article.category, editorialScore: score, adjustedScore: score };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore);
}

/** Varied shortlist (best of each pillar first, at most 2 per pillar and per outlet). */
export function selectHrPills(ranked: RankedArticle[], count: number): RankedArticle[] {
  return selectVariedShortlist(ranked, count, { maxPerAngle: 2, maxPerDomain: 2 });
}

function previousEditionBlock(previousMessage: string | null): string {
  if (!previousMessage) {
    return "No hay una edición anterior disponible; escribe como si fuera la primera publicación.";
  }
  return `${previousMessage.slice(0, PREVIOUS_EDITION_CHARS)}

Úsala SOLO como contexto: no repitas temas, frases, estructuras ni el mismo formato de pill.`;
}

export function buildHrPrompt(candidates: RankedArticle[], context: PromptContext): string {
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
Eres editor senior de contenidos de HR y HR Tech para UBITS.

Fecha: ${context.dateLabel}

Tu tarea tiene dos pasos:
1. De las ${candidates.length} noticias de abajo, ELIGE las 2 de mayor valor para UBITS, de PILARES DISTINTOS.
2. Conviértelas en EXACTAMENTE 2 pills para Slack. NO es un boletín largo.

## Audiencia
Equipos de Producto, HR, Customer Success y liderazgo interno de UBITS (plataforma de talento y aprendizaje en LATAM).

## Cómo elegir
- Prioriza: señales nuevas en HR o HR Tech, usos concretos de IA en RR. HH., aprendizajes útiles para conversaciones con clientes, oportunidades para producto o customer success.
- Descarta: noticias muy locales sin lección aplicable, temas legales puntuales de un solo país, contenido promocional.
- Cada pill usa UNA sola noticia; no mezcles varias.

## Reglas obligatorias
- Devuelve SOLO el mensaje final en markdown para Slack.
- Usa SOLO URLs de la lista. No inventes datos, cifras, ejemplos ni URLs.
- NO uses secciones tipo "panorama general", "tendencias", "implicaciones" o "acciones sugeridas".
- NO agregues una lista final de fuentes.
- Español neutro, práctico, ágil y humano; evita clichés y lenguaje corporativo vacío. Si la fuente está en inglés, escribe en español.
- Cada pill debe tener entre 80 y 130 palabras aprox.
- El link de cada pill debe escribirse exactamente así: <URL|Leer más ↗>

## Formatos de pill (usa uno distinto en cada pill)
- 🧠 *INSIGHT HR*
- ⚔️ *MITO vs REALIDAD*
- 📡 *HR RADAR*
- 👀 *OJO CON ESTO*
- 📌 *PARA GUARDAR*
- 🛠️ *APLICACIÓN RÁPIDA*
- 🔄 *CAMBIO DE ENFOQUE*

## Formato obligatorio
:busts_in_silhouette: *HR Radar · ${context.dateLabel}*
[hook corto de una sola línea sobre lo más útil de esta semana]

[emoji] *[FORMATO] · [título o gancho corto]*
[4 a 6 líneas: contexto, la idea útil y por qué importa para UBITS o sus clientes]
👉 [takeaway accionable en una sola línea]
<URL EXACTA de la noticia elegida|Leer más ↗>

[emoji] *[FORMATO] · [título o gancho corto]*
[4 a 6 líneas]
👉 [takeaway accionable en una sola línea]
<URL EXACTA de la noticia elegida|Leer más ↗>

Haz que la persona piense: "esto sí lo leo completo".

## Edición anterior del canal
${previousEditionBlock(context.previousMessage)}

## Noticias disponibles
${sourcesBlock}
`.trim();
}
