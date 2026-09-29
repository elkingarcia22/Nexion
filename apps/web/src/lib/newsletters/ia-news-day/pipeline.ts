import type { Article, NewsletterSource, SeenItem, SelectedArticle, TokenUsage } from "../types";
import { parseFeed } from "../feed-parser";
import { balanceCandidates, excludeSeen } from "./candidates";
import { buildPrompt, formatEditionDate, rankArticles, selectPills, toSelected } from "./editorial";
import { validateMessage } from "./validate";

export const REQUIRED_PILLS = 2;
const MAX_MODEL_ATTEMPTS = 2;
const FETCH_CONCURRENCY = 10;

export interface PipelineDeps {
  fetchBody: (url: string) => Promise<string>;
  generate: (prompt: string) => Promise<{ text: string; usage: TokenUsage }>;
  now: () => Date;
}

export interface PipelineInput {
  sources: NewsletterSource[];
  seen: SeenItem[];
}

export type PipelineResult =
  | { status: "ready"; message: string; pills: SelectedArticle[]; usage: TokenUsage; stats: PipelineStats }
  | { status: "skipped"; reason: string; pills: SelectedArticle[]; stats: PipelineStats }
  | { status: "failed"; error: string; pills: SelectedArticle[]; stats: PipelineStats };

export interface PipelineStats {
  sourcesFetched: number;
  sourceErrors: Array<{ source: string; error: string }>;
  articlesParsed: number;
  candidates: number;
  newCandidates: number;
  ranked: number;
  attempts: number;
}

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

/** Fetch sources, pick 2 unseen stories, and have the model write a validated Slack message. */
export async function runIaNewsDay(input: PipelineInput, deps: PipelineDeps): Promise<PipelineResult> {
  const { articles, sourceErrors } = await collectArticles(input.sources, deps.fetchBody);
  const candidates = balanceCandidates(articles, deps.now());
  const fresh = excludeSeen(candidates, input.seen);
  const ranked = rankArticles(fresh);
  const chosen = selectPills(ranked, REQUIRED_PILLS);
  const pills = chosen.map(toSelected);

  const stats: PipelineStats = {
    sourcesFetched: input.sources.length - sourceErrors.length,
    sourceErrors,
    articlesParsed: articles.length,
    candidates: candidates.length,
    newCandidates: fresh.length,
    ranked: ranked.length,
    attempts: 0,
  };

  if (chosen.length < REQUIRED_PILLS) {
    return {
      status: "skipped",
      reason: `Solo hubo ${chosen.length} noticia(s) nueva(s) y relevante(s); se necesitan ${REQUIRED_PILLS}.`,
      pills,
      stats,
    };
  }

  const prompt = buildPrompt(chosen, formatEditionDate(deps.now()));
  const expectedUrls = pills.map((pill) => pill.url);
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt++) {
    stats.attempts = attempt;
    try {
      const result = await deps.generate(prompt);
      usage.inputTokens += result.usage.inputTokens;
      usage.outputTokens += result.usage.outputTokens;

      const validation = validateMessage(result.text, expectedUrls);
      if (validation.ok) return { status: "ready", message: validation.message, pills, usage, stats };
      lastError = validation.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { status: "failed", error: lastError, pills, stats };
}
