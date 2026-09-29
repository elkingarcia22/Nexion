import type { Article, SeenItem } from "../types";
import { canonicalUrl, foldText } from "../text";

const AI_KEYWORDS = [
  "inteligencia artificial",
  " ai ",
  " ai,",
  " ai.",
  " ai-",
  " ai/",
  " ai:",
  "ai's",
  " llm",
  " gpt",
  "gemini",
  "claude",
  "anthropic",
  "perplexity",
  "xai",
  "chatbot",
  "modelo de lenguaje",
  "modelos de lenguaje",
  "large language model",
  "deep learning",
  "machine learning",
  "agents",
  " agent ",
  "agentic",
  "openai",
  "stable diffusion",
  "midjourney",
];

/** Max stories per domain, so one prolific source cannot flood the ranking. */
const DOMAIN_QUOTAS: Record<string, number> = {
  "openai.com": 6,
  "tldr.tech": 5,
  "techcrunch.com": 5,
  "the-decoder.com": 5,
  "latent.space": 5,
  "xataka.com": 4,
  "arstechnica.com": 3,
  "theverge.com": 3,
};
const DEFAULT_DOMAIN_QUOTA = 3;
const MAX_CANDIDATES = 40;
const MIN_TITLE_KEY_CHARS = 8;
const MAX_STORY_AGE_DAYS = 7;
const DAY_MS = 86_400_000;

function isAboutAi(article: Article): boolean {
  const text = ` ${article.title} ${article.summary} `.toLowerCase();
  if (text.includes("más antiguas")) return false;
  return AI_KEYWORDS.some((keyword) => text.includes(keyword));
}

function byNewest(a: Article, b: Article): number {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

/**
 * Keep recent AI stories only, cap each domain, and return the newest `MAX_CANDIDATES`.
 * Stories older than `MAX_STORY_AGE_DAYS` are dropped so the bulletin stays current.
 */
export function balanceCandidates(articles: Article[], now: Date = new Date()): Article[] {
  const oldestAllowed = now.getTime() - MAX_STORY_AGE_DAYS * DAY_MS;
  const recent = articles.filter((article) => new Date(article.publishedAt).getTime() >= oldestAllowed);

  const byDomain = new Map<string, Article[]>();
  for (const article of recent.filter(isAboutAi)) {
    const key = article.domain || article.source || "other";
    byDomain.set(key, [...(byDomain.get(key) ?? []), article]);
  }

  const balanced = Array.from(byDomain.entries()).flatMap(([domain, group]) =>
    [...group].sort(byNewest).slice(0, DOMAIN_QUOTAS[domain] ?? DEFAULT_DOMAIN_QUOTA)
  );

  return balanced.sort(byNewest).slice(0, MAX_CANDIDATES);
}

function titleKey(title: string | null): string {
  return foldText(title)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop stories whose URL or exact title was already published. */
export function excludeSeen(articles: Article[], seen: SeenItem[]): Article[] {
  const seenUrls = new Set(seen.map((item) => canonicalUrl(item.url)).filter(Boolean));
  const seenTitles = new Set(
    seen.map((item) => titleKey(item.title)).filter((key) => key.length > MIN_TITLE_KEY_CHARS)
  );

  return articles.filter(
    (article) => !seenUrls.has(canonicalUrl(article.url)) && !seenTitles.has(titleKey(article.title))
  );
}
