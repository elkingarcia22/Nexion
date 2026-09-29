import type { Article } from "../types";
import { dedupe } from "../engine/candidates";
import { formatEditionDate, selectDiverse, toSelected } from "../engine/select";
import type { RankedArticle } from "../engine/types";
import { foldText, hasKeyword, squish } from "../text";

export const MIN_EDITORIAL_SCORE = 3;
const SUMMARY_PROMPT_CHARS = 500;
const TIE_SCORE_WINDOW = 8;
const MIN_USEFUL_SUMMARY_CHARS = 40;

const ANGLE_RULES: Array<{ angle: string; keywords: string[] }> = [
  // UX first: otherwise it gets swallowed by "OpenAI/model".
  {
    angle: "diseño, UX y herramientas",
    keywords: ["design", "ux", "ui", "figma", "prototype", "powerpoint", "interface", "visual", "video", "image", "multimodal"],
  },
  {
    angle: "dev tools y construcción",
    keywords: ["developer", "coding", "code", "cursor", "codex", "github", "api", "framework", "composer"],
  },
  {
    angle: "agentes y automatización",
    keywords: ["agent", "agentic", "autonomous", "workflow", "automation", "executor"],
  },
  {
    angle: "modelos y capacidades",
    keywords: ["gemini", "gpt", "claude", "llm", "large language model", "model", "reasoning", "inference", "benchmark", "flash"],
  },
  {
    angle: "producto y negocio",
    keywords: ["product", "startup", "business", "enterprise", "revenue", "pricing", "cost", "funding", "partnership", "deal", "microsoft", "anthropic", "openai"],
  },
  {
    angle: "riesgos y gobernanza",
    keywords: ["policy", "risk", "safety", "security", "privacy", "copyright", "regulation", "governance"],
  },
];
const DEFAULT_ANGLE = "señal general de IA";

/** Lower value wins ties, so the two pills cover different, useful angles. */
const ANGLE_PRIORITY: Record<string, number> = {
  "agentes y automatización": 1,
  "modelos y capacidades": 2,
  "dev tools y construcción": 3,
  "diseño, UX y herramientas": 4,
  "producto y negocio": 5,
  "riesgos y gobernanza": 6,
  [DEFAULT_ANGLE]: 99,
};

const STRONG_SIGNALS = [
  "openai", "anthropic", "google", "deepmind", "gemini", "microsoft", "meta ai", "perplexity", "xai", "nvidia",
  "mistral", "deepseek", "cursor", "codex", "agents", "agentic", "llm", "gpt", "claude", "model", "reasoning",
  "automation", "ai tools", "artificial intelligence", "machine learning", "generative ai",
];
const PRODUCT_SIGNALS = [
  "product", "feature", "launch", "platform", "api", "developer", "enterprise", "workflow", "automation", "design",
  "ux", "app", "tool", "framework", "integration", "plugin", "composer",
];
const BUSINESS_SIGNALS = [
  "funding", "revenue", "arr", "cost", "pricing", "partnership", "deal", "acquisition", "strategy", "competition",
  "market", "ipo",
];
const NOISE_SIGNALS = [
  "rumor", "meme", "reddit", "opinion", "thread", "podcast", "newsletter", "subscribe", "giveaway", "job opening",
  "hiring now",
];
/** Academic math stories score high on "model" but are useless for the team. */
const ACADEMIC_SIGNALS = ["erdos", "unit distance", "planar", "theorem", "proof", "disproves", "math problem"];

const TRUSTED_DOMAIN_BONUS: Record<string, number> = {
  "openai.com": 5,
  "blog.google": 5,
  "deepmind.google": 5,
  "anthropic.com": 5,
  "microsoft.com": 4,
  "techcrunch.com": 4,
  "the-decoder.com": 4,
  "tldr.tech": 3,
  "latent.space": 3,
  "technologyreview.com": 3,
  "venturebeat.com": 3,
  "mit.edu": 3,
  "theverge.com": 2,
  "arstechnica.com": 2,
  "xataka.com": 2,
};


function articleText(article: Article): string {
  return foldText(`${article.title} ${article.summary} ${article.url} ${article.source} ${article.domain}`);
}

function countMatches(text: string, keywords: string[]): number {
  return keywords.filter((keyword) => hasKeyword(text, keyword)).length;
}

function isTldr(article: Article): boolean {
  return foldText(`${article.url} ${article.source} ${article.title}`).includes("tldr.tech");
}

function hasUsefulSummary(article: Article): boolean {
  const summary = squish(article.summary);
  return summary.length >= MIN_USEFUL_SUMMARY_CHARS && !summary.toLowerCase().includes("sin resumen");
}

function isAcademic(text: string): boolean {
  return ACADEMIC_SIGNALS.some((keyword) => hasKeyword(text, keyword));
}

export function inferAngle(article: Article): string {
  const text = articleText(article);
  return ANGLE_RULES.find((rule) => rule.keywords.some((k) => hasKeyword(text, k)))?.angle ?? DEFAULT_ANGLE;
}

export function scoreArticle(article: Article): number {
  const text = articleText(article);
  let score =
    countMatches(text, STRONG_SIGNALS) * 4 +
    countMatches(text, PRODUCT_SIGNALS) * 2 +
    countMatches(text, BUSINESS_SIGNALS) * 2 -
    countMatches(text, NOISE_SIGNALS) * 3;

  for (const [domain, bonus] of Object.entries(TRUSTED_DOMAIN_BONUS)) {
    if (text.includes(domain)) score += bonus;
  }
  if (!squish(article.summary)) score -= 2;
  if (isAcademic(text)) score -= 10;

  if (isTldr(article)) {
    // TLDR items bundle several stories under one title: hard to turn into a single pill.
    if (!hasUsefulSummary(article)) score -= 4;
    if ((article.title.match(/,/g) || []).length >= 2) score -= 3;
  } else {
    score += 3;
  }
  return score;
}

export function rankArticles(articles: Article[]): RankedArticle[] {
  return dedupe(articles)
    .map((article) => {
      const editorialScore = scoreArticle(article);
      // Second pass reinforces the single-story and non-academic preference used for variety.
      let adjustedScore = editorialScore;
      if (isTldr(article) && !hasUsefulSummary(article)) adjustedScore -= 4;
      if (!isTldr(article)) adjustedScore += 3;
      if (isAcademic(articleText(article))) adjustedScore -= 10;
      return { ...article, angle: inferAngle(article), editorialScore, adjustedScore };
    })
    .filter((article) => article.editorialScore >= MIN_EDITORIAL_SCORE)
    .sort((a, b) => {
      const diff = b.adjustedScore - a.adjustedScore;
      if (Math.abs(diff) <= TIE_SCORE_WINDOW) {
        return (ANGLE_PRIORITY[a.angle] ?? 50) - (ANGLE_PRIORITY[b.angle] ?? 50);
      }
      return diff;
    });
}

/** Two different angles and domains, and never two TLDR-style digests in the same edition. */
export function selectPills(ranked: RankedArticle[], count: number): RankedArticle[] {
  return selectDiverse(ranked, count, { isBundle: isTldr });
}

export { toSelected, formatEditionDate };

export function buildPrompt(pills: RankedArticle[], dateLabel: string): string {
  const sourcesBlock = pills
    .map(
      (article, index) => `[${index + 1}]
TITLE: ${article.title}
SOURCE: ${article.source}
URL: ${article.url}
SUMMARY: ${article.summary.slice(0, SUMMARY_PROMPT_CHARS) || "(sin resumen disponible)"}
ANGLE: ${article.angle}`
    )
    .join("\n\n");

  return `
Eres editor senior de IA Daily para Slack.

Fecha: ${dateLabel}

Tu tarea es convertir las noticias seleccionadas en EXACTAMENTE 2 pills cortas sobre Inteligencia Artificial.

## Objetivo
Crear 2 micro-pills útiles para equipos de Producto, Diseño/UX, Automatización y Negocio.

No escribas un boletín largo.
No escribas visión del día.
No escribas secciones largas.
Cada pill debe captar interés rápido y llevar a la fuente original.

## Reglas obligatorias
- Devuelve SOLO el mensaje final en markdown para Slack.
- Genera EXACTAMENTE 2 pills.
- Cada pill debe usar UNA fuente.
- La primera pill debe usar la fuente 1.
- La segunda pill debe usar la fuente 2.
- Usa SOLO las URLs listadas abajo.
- NO inventes datos, nombres, cifras, alianzas, lanzamientos ni features.
- NO mezcles varias noticias en una misma pill.
- NO agregues una lista final de fuentes.
- NO uses tono hype ni exagerado.
- Español natural, claro y ejecutivo.
- Cada pill debe tener entre 55 y 85 palabras aprox.
- Cada pill debe tener una sola idea central.
- Cada pill debe incluir una implicación práctica para producto, UX, automatización o negocio.
- El link final de cada pill debe escribirse exactamente así: <URL|Leer más ↗>

## Formato obligatorio
:robot_face: *IA News Day · ${dateLabel}*
[hook corto de una sola línea sobre lo más útil de mirar hoy]

:zap: *PILL 1 · [título corto y potente]*
[2 a 4 líneas: qué pasó o qué señal aparece, por qué importa y qué decisión/práctica puede activar en un equipo]
:point_right: [takeaway accionable en una sola línea]
:link: <URL EXACTA de la fuente 1|Leer más ↗>

:art: *PILL 2 · [título corto y potente]*
[2 a 4 líneas: qué pasó o qué señal aparece, por qué importa y qué decisión/práctica puede activar en un equipo]
:point_right: [takeaway accionable en una sola línea]
:link: <URL EXACTA de la fuente 2|Leer más ↗>

## Criterio editorial
- Prioriza señales útiles sobre IA aplicada, agentes, modelos, herramientas, automatización, UX, producto o negocio.
- Si una noticia es técnica, tradúcela a implicación práctica.
- Si una noticia es de negocio, tradúcela a impacto en estrategia, costos, velocidad, diferenciación o competencia.
- Si una noticia es de herramienta, tradúcela a caso de uso posible para equipos.
- Evita frases genéricas como “esto redefine el futuro”.
- Haz que el lector piense: “esto me sirve para probar algo o tomar una mejor decisión”.

## Fuentes válidas
${sourcesBlock}
`.trim();
}
