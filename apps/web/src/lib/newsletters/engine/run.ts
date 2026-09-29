import type { Article, NewsletterSource, TokenUsage } from "../types";
import { parseFeed } from "../feed-parser";
import { canonicalUrl } from "../text";
import { excludeSeen } from "./candidates";
import { formatEditionDate, toSelected } from "./select";
import { readMoreUrls } from "./validate";
import type { NewsProfile, PipelineDeps, PipelineInput, PipelineResult, PipelineStats } from "./types";

const MAX_MODEL_ATTEMPTS = 2;
const FETCH_CONCURRENCY = 10;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function collectArticles(sources: NewsletterSource[], fetchBody: PipelineDeps["fetchBody"]) {
  const outcomes = await mapWithConcurrency(sources, FETCH_CONCURRENCY, async (source) => {
    try {
      return { source, articles: parseFeed(await fetchBody(source.url), source), error: null };
    } catch (error) {
      return { source, articles: [] as Article[], error: error instanceof Error ? error.message : String(error) };
    }
  });

  return {
    articles: outcomes.flatMap((outcome) => outcome.articles),
    sourceErrors: outcomes
      .filter((outcome) => outcome.error)
      .map((outcome) => ({ source: outcome.source.source_key, error: outcome.error as string })),
  };
}

/** The offered stories the message actually links, in the order they appear. */
function pickedPills(offered: ReturnType<typeof toSelected>[], message: string) {
  const byUrl = new Map(offered.map((pill) => [canonicalUrl(pill.url), pill]));
  return readMoreUrls(message).flatMap((url) => byUrl.get(url) ?? []);
}

/**
 * Shared news pipeline: fetch the sources, keep fresh unseen stories, let the profile rank and
 * pick them, then have the model write a message the profile validates (one retry).
 */
export async function runNewsPipeline(
  profile: NewsProfile,
  input: PipelineInput,
  deps: PipelineDeps
): Promise<PipelineResult> {
  const { articles, sourceErrors } = await collectArticles(input.sources, deps.fetchBody);
  const candidates = profile.shortlist(articles, deps.now());
  const fresh = excludeSeen(candidates, input.seen);
  const ranked = profile.rank(fresh);
  const modelPicks = profile.modelPicks;
  const offered = profile.select(ranked, modelPicks ? modelPicks.shortlistSize : profile.pillsCount);
  const offeredPills = offered.map(toSelected);

  const stats: PipelineStats = {
    sourcesFetched: input.sources.length - sourceErrors.length,
    sourceErrors,
    articlesParsed: articles.length,
    candidates: candidates.length,
    newCandidates: fresh.length,
    ranked: ranked.length,
    attempts: 0,
  };

  if (offered.length < profile.pillsCount) {
    return {
      status: "skipped",
      reason: `Solo hubo ${offered.length} noticia(s) nueva(s) y relevante(s); se necesitan ${profile.pillsCount}.`,
      pills: offeredPills,
      stats,
    };
  }

  const prompt = profile.buildPrompt(offered, {
    dateLabel: formatEditionDate(deps.now()),
    previousMessage: input.previousMessage ?? null,
  });
  const offeredUrls = offeredPills.map((pill) => pill.url);
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt++) {
    stats.attempts = attempt;
    try {
      const result = await deps.generate(prompt);
      usage.inputTokens += result.usage.inputTokens;
      usage.outputTokens += result.usage.outputTokens;

      const validation = modelPicks
        ? profile.validate(result.text, offeredUrls, profile.pillsCount)
        : profile.validate(result.text, offeredUrls);
      if (validation.ok) {
        return { status: "ready", message: validation.message, pills: pickedPills(offeredPills, validation.message), usage, stats };
      }
      lastError = validation.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { status: "failed", error: lastError, pills: modelPicks ? [] : offeredPills, stats };
}
