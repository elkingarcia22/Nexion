const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
];

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&mdash;": "—",
  "&ndash;": "–",
  "&lt;": "<",
  "&gt;": ">",
};

/** Stringify and collapse whitespace. */
export function squish(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

/** Lowercase and strip accents, for keyword matching. */
export function foldText(value: unknown): string {
  return squish(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;|&#39;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity);
}

export function stripHtml(html: string): string {
  const withoutMarkup = String(html)
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  // Feeds often double-encode, so markup can reappear after one decode.
  return squish(decodeEntities(withoutMarkup).replace(/<[^>]+>/g, " "));
}

/** Remove tracking params and trailing slash so the same story always has one key. */
export function canonicalUrl(url: string): string {
  const raw = decodeEntities(squish(url)).replace(/^=/, "");
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    TRACKING_PARAMS.forEach((param) => parsed.searchParams.delete(param));
    const search = parsed.searchParams.toString();
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}${search ? `?${search}` : ""}`;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

const SHORT_KEYWORD_MAX_CHARS = 3;
const wordPatterns = new Map<string, RegExp>();

/**
 * Keyword match on folded text. Short keywords ("ai", "ui", "api") must be whole words,
 * otherwise "build" would count as UI and "detail" as AI.
 */
export function hasKeyword(text: string, keyword: string): boolean {
  if (keyword.length > SHORT_KEYWORD_MAX_CHARS) return text.includes(keyword);
  let pattern = wordPatterns.get(keyword);
  if (!pattern) {
    pattern = new RegExp(`(^|[^a-z0-9])${keyword}([^a-z0-9]|$)`);
    wordPatterns.set(keyword, pattern);
  }
  return pattern.test(text);
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    const match = String(url).match(/^https?:\/\/([^/]+)/i);
    return match ? match[1].replace(/^www\./, "") : "";
  }
}
