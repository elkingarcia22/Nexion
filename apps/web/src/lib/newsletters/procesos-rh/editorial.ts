import type { NewsletterSource, SeenItem, SourcePriority } from "../types";
import { canonicalUrl, domainOf } from "../text";
import type { PageSummary } from "../page-extract";
import type { WeeklyTopic } from "./rotation";

export const PILLS_COUNT = 2;
/** Sources offered to the model for the week's process. */
export const OFFER_SIZE = 6;
const MAX_PER_DOMAIN = 2;
const SUMMARY_PROMPT_CHARS = 900;
const PREVIOUS_EDITION_CHARS = 1200;

const PRIORITY_ORDER: Record<SourcePriority, number> = { high: 0, medium: 1, low: 2 };
/** Articles and official guidance explain a process better than blog listings. */
const KIND_ORDER: Record<string, number> = { regulation: 0, article: 1, report: 2, pdf: 3, blog_listing: 4 };

export interface ProcessCandidate {
  source: NewsletterSource;
  url: string;
  title: string;
  summary: string;
  language: string;
  kind: string;
}

function processesOf(source: NewsletterSource): string[] {
  const listed = source.metadata?.processes;
  return Array.isArray(listed) && listed.length ? (listed as string[]) : [source.category];
}

function metaString(source: NewsletterSource, key: string): string {
  const value = source.metadata?.[key];
  return typeof value === "string" ? value : "";
}

/**
 * Sources for the week's process that were not used yet (all of them if fewer than 2 remain),
 * best first: official guidance and articles, higher priority, then name for stable order.
 */
export function sourcesForProcess(sources: NewsletterSource[], processKey: string, seen: SeenItem[]): NewsletterSource[] {
  const seenUrls = new Set(seen.map((item) => canonicalUrl(item.url)));
  const forProcess = sources.filter((source) => source.is_active && processesOf(source).includes(processKey));
  const unseen = forProcess.filter((source) => !seenUrls.has(canonicalUrl(source.url)));
  const pool = unseen.length >= PILLS_COUNT ? unseen : forProcess;

  return [...pool].sort(
    (a, b) =>
      (KIND_ORDER[metaString(a, "content_kind")] ?? 5) - (KIND_ORDER[metaString(b, "content_kind")] ?? 5) ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      a.name.localeCompare(b.name)
  );
}

/** Up to `size` sources, at most 2 per domain, and at least one in Spanish when the process has one. */
export function offerSources(ordered: NewsletterSource[], size = OFFER_SIZE): NewsletterSource[] {
  const offer: NewsletterSource[] = [];
  const perDomain = (source: NewsletterSource) => offer.filter((s) => domainOf(s.url) === domainOf(source.url)).length;

  const spanish = ordered.find((source) => metaString(source, "language") === "es");
  if (spanish) offer.push(spanish);
  for (const source of ordered) {
    if (offer.length >= size) break;
    if (!offer.includes(source) && perDomain(source) < MAX_PER_DOMAIN) offer.push(source);
  }
  return offer;
}

/** Page content when available; the catalog note otherwise (PDFs, blocked or empty pages). */
export function toCandidate(source: NewsletterSource, page: PageSummary | null): ProcessCandidate {
  const pageSummary = page ? [page.description, page.text].filter(Boolean).join("\n") : "";
  return {
    source,
    url: source.url,
    title: page?.title || source.name,
    summary: pageSummary || source.notes || "",
    language: metaString(source, "language") || "en",
    kind: metaString(source, "content_kind") || "article",
  };
}

function previousEditionBlock(previousMessage: string | null): string {
  if (!previousMessage) return "No hay una edición anterior disponible.";
  return `${previousMessage.slice(0, PREVIOUS_EDITION_CHARS)}

Úsala SOLO como contexto: no repitas estructura, frases ni el mismo tipo de hook.`;
}

export function buildProcessPrompt(
  candidates: ProcessCandidate[],
  topic: WeeklyTopic,
  dateLabel: string,
  previousMessage: string | null
): string {
  const sourcesBlock = candidates
    .map(
      (candidate, index) => `[${index + 1}]
TITLE: ${candidate.title}
SOURCE: ${candidate.source.name}
KIND: ${candidate.kind} · idioma: ${candidate.language}
URL: ${candidate.url}
SUMMARY: ${candidate.summary.slice(0, SUMMARY_PROMPT_CHARS) || "(sin resumen disponible)"}`
    )
    .join("\n\n");

  return `
Eres editor senior de contenidos para Slack en UBITS.

Fecha: ${dateLabel}
Proceso RH de la semana: ${topic.process.label}
Objetivo: ${topic.process.goal}
Enfoque editorial: ${topic.focus}

Tu tarea tiene dos pasos:
1. De las ${candidates.length} fuentes de abajo, ELIGE 2: una para una lectura o señal del proceso (HR RADAR) y otra para una aplicación práctica (APLICACIÓN RÁPIDA). Si hay una fuente en español útil, prefiérela para una de las dos.
2. Escribe EXACTAMENTE 2 micro-pills que expliquen el proceso de forma simple, útil y accionable para equipos de Producto, HR, Customer Success y liderazgo.

## Reglas obligatorias
- Devuelve SOLO markdown final para Slack.
- Cada pill usa UNA fuente distinta. Usa SOLO URLs de la lista; no inventes ni sustituyas fuentes.
- NO uses cifras, porcentajes, métricas, años, cantidades ni benchmarks que no aparezcan literalmente en el TITLE o SUMMARY de la fuente usada. Si no hay cifras, redacta sin números.
- NO escribas una introducción larga ni un resumen del artículo. NO uses tono académico ni vendedor.
- Español natural, claro y ejecutivo.
- Cada pill debe tener entre 55 y 85 palabras, una sola idea central y una implicación concreta para equipos pequeños o en crecimiento.
- El link final de cada pill debe escribirse exactamente así: <URL|Leer más ↗>

## Formato obligatorio
:books: *Entendimiento de procesos RH · ${topic.process.label}* (${dateLabel})
[hook corto de una sola línea]

:satellite_antenna: *HR RADAR*
*[título corto y potente]*
[2 a 4 líneas con una lectura o señal sobre el proceso: qué pasa, por qué importa y qué error evita]
:point_right: [takeaway concreto]
:link: <URL EXACTA de la fuente elegida|Leer más ↗>

:hammer_and_wrench: *APLICACIÓN RÁPIDA*
*[título corto y potente]*
[2 a 4 líneas aterrizadas a operación: qué puede hacer un equipo pequeño esta semana y por qué mejora el proceso]
:point_right: [acción concreta]
:link: <URL EXACTA de la fuente elegida|Leer más ↗>

## Criterio editorial
- La primera pill es de lectura o señal; la segunda, práctica y operativa. No repitas la idea central.
- Si la fuente es general, aterrízala al proceso de la semana: ${topic.process.label}.
- Si el proceso es muy amplio, aterrízalo al primer paso que un equipo pequeño podría implementar.
- Haz que la persona piense: "esto me ayuda a entender mejor el proceso y quiero abrir el link".

## Edición anterior del canal
${previousEditionBlock(previousMessage)}

## Fuentes válidas
${sourcesBlock}
`.trim();
}

const NUMBER_PATTERN = /\d+(?:[.,]\d+)?\s?%?/g;

function numbersIn(text: string): string[] {
  return (text.match(NUMBER_PATTERN) ?? []).map((value) => value.replace(/\s/g, "").replace(",", "."));
}

/**
 * Figures in the pills that do not appear in any offered source (the header date is ignored).
 * Guards the n8n rule "no inventes cifras": a made-up statistic is worse than no statistic.
 */
export function inventedNumbers(message: string, candidates: ProcessCandidate[]): string[] {
  const body = message.split("\n").slice(1).join("\n").replace(/<[^|>]+\|[^>]+>/g, " ");
  const allowed = new Set(candidates.flatMap((candidate) => numbersIn(`${candidate.title} ${candidate.summary}`)));
  // 30-60-90 style plans are process vocabulary rather than statistics.
  ["30", "60", "90"].forEach((value) => allowed.add(value));
  return Array.from(new Set(numbersIn(body).filter((value) => !allowed.has(value))));
}
