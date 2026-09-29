import type { Article, SeenItem } from "../types";
import { canonicalUrl, foldText } from "../text";

const DAY_MS = 86_400_000;
const MIN_TITLE_KEY_CHARS = 8;
const TITLE_DEDUPE_CHARS = 90;

export interface ShortlistOptions {
  isRelevant: (article: Article) => boolean;
  /** Stories older than this are dropped so the bulletin stays current. */
  windowDays: number;
  /** Max stories per domain, so one prolific source cannot flood the ranking. */
  domainQuotas: Record<string, number>;
  defaultDomainQuota: number;
  maxCandidates: number;
}

function byNewest(a: Article, b: Article): number {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

/** Keep recent relevant stories, cap each domain, and return the newest `maxCandidates`. */
export function shortlistByDomain(articles: Article[], now: Date, options: ShortlistOptions): Article[] {
  const oldestAllowed = now.getTime() - options.windowDays * DAY_MS;
  const byDomain = new Map<string, Article[]>();

  for (const article of articles) {
    if (new Date(article.publishedAt).getTime() < oldestAllowed || !options.isRelevant(article)) continue;
    const key = article.domain || article.source || "other";
    byDomain.set(key, [...(byDomain.get(key) ?? []), article]);
  }

  const balanced = Array.from(byDomain.entries()).flatMap(([domain, group]) =>
    [...group].sort(byNewest).slice(0, options.domainQuotas[domain] ?? options.defaultDomainQuota)
  );
  return balanced.sort(byNewest).slice(0, options.maxCandidates);
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

/** Remove repeats of the same URL or headline coming from different feeds. */
export function dedupe(articles: Article[]): Article[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  return articles.filter((article) => {
    const urlKey = foldText(article.url);
    const key = foldText(article.title).slice(0, TITLE_DEDUPE_CHARS);
    if (!urlKey || !key || seenUrls.has(urlKey) || seenTitles.has(key)) return false;
    seenUrls.add(urlKey);
    seenTitles.add(key);
    return true;
  });
}
