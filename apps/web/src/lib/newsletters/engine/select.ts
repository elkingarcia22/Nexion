import type { SelectedArticle } from "../types";
import type { RankedArticle } from "./types";

export interface SelectOptions {
  /** Stories that bundle several news items (e.g. TLDR digests): never pick two of them. */
  isBundle?: (article: RankedArticle) => boolean;
}

/**
 * Pick `count` stories: the best one first, then prefer a different angle and domain,
 * relaxing those constraints only when there are not enough alternatives.
 */
export function selectDiverse(ranked: RankedArticle[], count: number, options: SelectOptions = {}): RankedArticle[] {
  const isBundle = options.isBundle ?? (() => false);
  const selected: RankedArticle[] = [];
  const has = (article: RankedArticle) => selected.some((s) => s.url === article.url);
  const sameAngle = (article: RankedArticle) => selected.some((s) => s.angle === article.angle);
  const sameDomain = (article: RankedArticle) => selected.some((s) => s.domain === article.domain);
  const bundleTaken = () => selected.some(isBundle);

  const passes: Array<(article: RankedArticle) => boolean> = [
    (a) => selected.length === 0 || (!sameAngle(a) && !sameDomain(a) && !(bundleTaken() && isBundle(a))),
    (a) => !sameAngle(a),
    () => true,
  ];

  for (const accepts of passes) {
    for (const article of ranked) {
      if (selected.length >= count) return selected;
      if (!has(article) && accepts(article)) selected.push(article);
    }
  }
  return selected;
}

export interface ShortlistSelectOptions {
  maxPerAngle: number;
  maxPerDomain: number;
}

/**
 * A varied shortlist for the model to choose from: first the best story of each angle (in score
 * order), then fill up to `maxPerAngle` per angle, never more than `maxPerDomain` per outlet.
 */
export function selectVariedShortlist(
  ranked: RankedArticle[],
  size: number,
  options: ShortlistSelectOptions
): RankedArticle[] {
  const picked: RankedArticle[] = [];
  const count = (key: (a: RankedArticle) => string, value: string) => picked.filter((a) => key(a) === value).length;

  for (const perAngle of [1, options.maxPerAngle]) {
    for (const article of ranked) {
      if (picked.length >= size) return picked;
      if (picked.some((a) => a.url === article.url)) continue;
      if (count((a) => a.angle, article.angle) >= perAngle) continue;
      if (count((a) => a.domain, article.domain) >= options.maxPerDomain) continue;
      picked.push(article);
    }
  }
  return picked;
}

export function toSelected(article: RankedArticle): SelectedArticle {
  return {
    title: article.title,
    url: article.url,
    source: article.source,
    domain: article.domain,
    angle: article.angle,
    editorialScore: article.editorialScore,
    adjustedScore: article.adjustedScore,
  };
}

export function formatEditionDate(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}
