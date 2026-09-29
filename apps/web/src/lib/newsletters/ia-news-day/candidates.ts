import type { Article } from "../types";
import { shortlistByDomain } from "../engine/candidates";

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
const MAX_STORY_AGE_DAYS = 7;

function isAboutAi(article: Article): boolean {
  const text = ` ${article.title} ${article.summary} `.toLowerCase();
  if (text.includes("más antiguas")) return false;
  return AI_KEYWORDS.some((keyword) => text.includes(keyword));
}

/**
 * Keep recent AI stories only, cap each domain, and return the newest `MAX_CANDIDATES`.
 * Stories older than `MAX_STORY_AGE_DAYS` are dropped so the bulletin stays current.
 */
export function balanceCandidates(articles: Article[], now: Date = new Date()): Article[] {
  return shortlistByDomain(articles, now, {
    isRelevant: isAboutAi,
    windowDays: MAX_STORY_AGE_DAYS,
    domainQuotas: DOMAIN_QUOTAS,
    defaultDomainQuota: DEFAULT_DOMAIN_QUOTA,
    maxCandidates: MAX_CANDIDATES,
  });
}

export { excludeSeen } from "../engine/candidates";
