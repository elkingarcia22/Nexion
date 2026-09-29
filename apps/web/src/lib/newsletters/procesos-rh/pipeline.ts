import type { SelectedArticle, TokenUsage } from "../types";
import { formatEditionDate } from "../engine/select";
import type { PipelineDeps, PipelineInput, PipelineResult, PipelineStats } from "../engine/types";
import { createValidator, readMoreUrls } from "../engine/validate";
import { extractPageSummary } from "../page-extract";
import { canonicalUrl, domainOf } from "../text";
import {
  buildProcessPrompt,
  inventedNumbers,
  offerSources,
  PILLS_COUNT,
  sourcesForProcess,
  toCandidate,
  type ProcessCandidate,
} from "./editorial";
import { topicForWeek } from "./rotation";

const MAX_MODEL_ATTEMPTS = 2;

export const validateProcessMessage = createValidator({
  headerMarker: ":books:",
  headerPattern: /^:books:\s+\*Entendimiento de procesos RH/i,
  headerHint: ":books: *Entendimiento de procesos RH",
  minChars: 450,
  requirePillLabels: false,
  forbidden: [/lista final de fuentes/i, /HR RADAR[\s\S]*HR RADAR/, /APLICACIÓN RÁPIDA[\s\S]*APLICACIÓN RÁPIDA/],
});

async function readCandidate(source: ProcessCandidate["source"], fetchBody: PipelineDeps["fetchBody"]) {
  if (source.metadata?.content_kind === "pdf" || /\.pdf($|\?)/i.test(source.url)) {
    return { candidate: toCandidate(source, null), error: null };
  }
  try {
    return { candidate: toCandidate(source, extractPageSummary(await fetchBody(source.url))), error: null };
  } catch (error) {
    // The catalog note still lets the model write something grounded.
    return { candidate: toCandidate(source, null), error: error instanceof Error ? error.message : String(error) };
  }
}

function toPill(candidate: ProcessCandidate, angle: string): SelectedArticle {
  return {
    title: candidate.title,
    url: candidate.url,
    source: candidate.source.name,
    domain: domainOf(candidate.url),
    angle,
    editorialScore: 0,
    adjustedScore: 0,
  };
}

/**
 * Procesos RH: the week's process (deterministic rotation), its best unused sources read for real
 * content, and 2 pills (HR RADAR + APLICACIÓN RÁPIDA) chosen and written by the model. Pills that
 * cite figures absent from the sources are rejected and retried.
 */
export async function runProcesosRh(input: PipelineInput, deps: PipelineDeps): Promise<PipelineResult> {
  const now = deps.now();
  const topic = topicForWeek(now);
  const ordered = sourcesForProcess(input.sources, topic.process.key, input.seen);
  const offered = offerSources(ordered);
  const read = await Promise.all(offered.map((source) => readCandidate(source, deps.fetchBody)));
  const candidates = read.map((item) => item.candidate);

  const stats: PipelineStats & { process: string; focus: string } = {
    sourcesFetched: read.filter((item) => !item.error).length,
    sourceErrors: read.flatMap((item) => (item.error ? [{ source: item.candidate.source.source_key, error: item.error }] : [])),
    articlesParsed: candidates.length,
    candidates: ordered.length,
    newCandidates: ordered.length,
    ranked: candidates.length,
    attempts: 0,
    process: topic.process.label,
    focus: topic.focus,
  };

  if (candidates.length < PILLS_COUNT) {
    return {
      status: "skipped",
      reason: `El proceso "${topic.process.label}" solo tiene ${candidates.length} fuente(s) activa(s); se necesitan ${PILLS_COUNT}.`,
      pills: [],
      stats,
    };
  }

  const prompt = buildProcessPrompt(candidates, topic, formatEditionDate(now), input.previousMessage ?? null);
  const offeredUrls = candidates.map((candidate) => candidate.url);
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt++) {
    stats.attempts = attempt;
    try {
      const result = await deps.generate(prompt);
      usage.inputTokens += result.usage.inputTokens;
      usage.outputTokens += result.usage.outputTokens;

      const validation = validateProcessMessage(result.text, offeredUrls, PILLS_COUNT);
      if (!validation.ok) {
        lastError = validation.error;
        continue;
      }
      const invented = inventedNumbers(validation.message, candidates);
      if (invented.length) {
        lastError = `El boletín usó cifras que no están en las fuentes: ${invented.join(", ")}`;
        continue;
      }

      const byUrl = new Map(candidates.map((candidate) => [canonicalUrl(candidate.url), candidate]));
      const pills = readMoreUrls(validation.message).flatMap((url) => {
        const candidate = byUrl.get(url);
        return candidate ? [toPill(candidate, topic.process.label)] : [];
      });
      return { status: "ready", message: validation.message, pills, usage, stats };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { status: "failed", error: lastError, pills: [], stats };
}
