import type { Article, NewsletterSource } from "./types";
import { canonicalUrl, domainOf, foldText, hasKeyword, squish, stripHtml } from "./text";

const SUMMARY_MAX_CHARS = 700;
const MIN_HTML_TITLE_CHARS = 12;
const TEXT_DATE_PATTERN = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}, \d{4}\b/;
const HTML_AI_HINTS = [
  "ai",
  "artificial-intelligence",
  "artificial intelligence",
  "openai",
  "anthropic",
  "gemini",
  "llm",
  "agent",
  "codex",
  "claude",
];

type SourceMeta = Pick<NewsletterSource, "name" | "url" | "source_key" | "category" | "priority" | "max_items"> &
  Partial<Pick<NewsletterSource, "metadata">>;

interface RawEntry {
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
  /** Original outlet when the feed is an aggregator (Google News `<source url="…">Name</source>`). */
  publisher?: { name: string; url: string };
}

const AGGREGATOR_DOMAINS = ["news.google.com"];

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1] : "";
}

function extractAtomLink(block: string): string {
  const alternate = block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i);
  if (alternate) return alternate[1];
  const any = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  return any ? any[1] : extractTag(block, "id");
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/[-_/]+/g, " ");
  } catch {
    return url;
  }
}

function extractPublisher(block: string): RawEntry["publisher"] {
  const match = block.match(/<source[^>]+url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
  return match ? { url: match[1], name: stripHtml(match[2]) } : undefined;
}

function toArticle(entry: RawEntry, meta: SourceMeta): Article {
  const url = canonicalUrl(stripHtml(entry.url));
  const parsedDate = new Date(stripHtml(entry.publishedAt));
  let title = stripHtml(entry.title).replace(/[`"]/g, "");
  let domain = domainOf(url);
  let source = meta.name;

  // Aggregator links all share one domain; credit the real outlet so domain quotas, trusted-source
  // bonuses and pill variety treat Reuters, HBR, etc. as different sources.
  const publisher = entry.publisher;
  if (publisher && AGGREGATOR_DOMAINS.includes(domain)) {
    domain = domainOf(publisher.url) || domain;
    source = publisher.name || source;
    const suffix = ` - ${publisher.name}`;
    if (title.endsWith(suffix)) title = title.slice(0, -suffix.length).trim();
  }

  return {
    title,
    url,
    summary: stripHtml(entry.summary).slice(0, SUMMARY_MAX_CHARS),
    source,
    sourceKey: meta.source_key,
    category: meta.category,
    priority: meta.priority,
    sourceMetadata: meta.metadata,
    publishedAt: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
    domain,
  };
}

function parseRss(xml: string): RawEntry[] {
  return (xml.match(/<item[\s\S]*?<\/item>/gi) || []).map((block) => ({
    title: extractTag(block, "title"),
    url: extractTag(block, "link") || extractTag(block, "guid"),
    summary: extractTag(block, "description") || extractTag(block, "content:encoded") || extractTag(block, "summary"),
    publishedAt: extractTag(block, "pubDate") || extractTag(block, "updated") || extractTag(block, "published"),
    publisher: extractPublisher(block),
  }));
}

function parseAtom(xml: string): RawEntry[] {
  return (xml.match(/<entry[\s\S]*?<\/entry>/gi) || []).map((block) => ({
    title: extractTag(block, "title"),
    url: extractAtomLink(block),
    summary: extractTag(block, "summary") || extractTag(block, "content"),
    publishedAt: extractTag(block, "published") || extractTag(block, "updated"),
  }));
}

/** Last resort for sources without a feed: AI-looking links on the page. */
function parseHtmlLinks(html: string, baseUrl: string): RawEntry[] {
  const entries: RawEntry[] = [];
  const seen = new Set<string>();
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) !== null) {
    const title = stripHtml(match[2]);
    let href = match[1];
    if (href.startsWith("/")) {
      try {
        href = new URL(baseUrl).origin + href;
      } catch {
        continue;
      }
    }
    const url = canonicalUrl(href);
    if (!url || title.length < MIN_HTML_TITLE_CHARS || seen.has(url)) continue;

    // Match on title + path only: the host (e.g. anthropic.com) would make every link pass.
    const haystack = foldText(`${title} ${pathOf(url)}`);
    if (!HTML_AI_HINTS.some((hint) => hasKeyword(haystack, hint))) continue;

    seen.add(url);
    // Listing pages often put the date inside the link ("Scaling agents Apr 08, 2026").
    const dateMatch = title.match(TEXT_DATE_PATTERN);
    entries.push({
      title: dateMatch ? squish(title.replace(dateMatch[0], "")) : title,
      url,
      summary: "",
      publishedAt: dateMatch ? dateMatch[0] : "",
    });
  }
  return entries;
}

/** Parse an RSS, Atom or HTML response into at most `max_items` articles. */
export function parseFeed(body: string, meta: SourceMeta): Article[] {
  let entries: RawEntry[];
  if (body.includes("<rss") || body.includes("<channel")) {
    entries = parseRss(body);
  } else if (body.includes("<feed") && body.includes("<entry")) {
    entries = parseAtom(body);
  } else {
    entries = parseHtmlLinks(body, meta.url);
  }

  return entries
    .map((entry) => toArticle(entry, meta))
    .filter((article) => article.title && article.url)
    .slice(0, meta.max_items);
}
