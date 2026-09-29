/**
 * Health check for newsletter source catalogs.
 *
 * Fetches every source with the same parser the pipeline uses and reports whether it
 * responds, what kind of document it is, how many stories it yields and how recent they are.
 * For failing sources it also tries to discover a working RSS/Atom feed.
 *
 * Usage (from the repo root):
 *   npx vite-node scripts/newsletters/check-sources.ts -- <catalog.json | urls.txt> [--json out.json]
 *
 * Input is either a catalog JSON (`{ "sources": [{ "source_key", "url", "max_items"? }] }`)
 * or a text file with one URL per line.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseFeed } from "../../apps/web/src/lib/newsletters/feed-parser";

const TIMEOUT_MS = 15_000;
const CONCURRENCY = 8;
const DAY_MS = 86_400_000;
const FEED_PATHS = ["/feed", "/feed/", "/rss", "/rss.xml", "/feed.xml", "/atom.xml", "/blog/feed", "/blog/rss.xml", "/index.xml"];
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
};

interface InputSource {
  source_key: string;
  url: string;
  max_items?: number;
}

export interface CheckResult {
  source_key: string;
  url: string;
  status: number | "error";
  error?: string;
  kind: "rss" | "atom" | "html" | "other" | "none";
  items: number;
  newest_days: number | null;
  final_url?: string;
  discovered_feed?: string;
  discovered_items?: number;
  verdict: "ok_feed" | "ok_html" | "stale" | "empty" | "broken";
}

async function fetchText(url: string): Promise<{ status: number; body: string; finalUrl: string }> {
  const response = await fetch(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: response.status, body: await response.text(), finalUrl: response.url };
}

function kindOf(body: string): CheckResult["kind"] {
  if (body.includes("<rss") || body.includes("<channel")) return "rss";
  if (body.includes("<feed") && body.includes("<entry")) return "atom";
  if (/<html|<!doctype html/i.test(body)) return "html";
  return body ? "other" : "none";
}

function parse(body: string, source: InputSource) {
  return parseFeed(body, {
    name: source.source_key,
    url: source.url,
    source_key: source.source_key,
    category: "check",
    priority: "medium",
    max_items: 50,
  });
}

function newestAgeDays(dates: string[]): number | null {
  const times = dates.map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t));
  if (!times.length) return null;
  return Math.round((Date.now() - Math.max(...times)) / DAY_MS);
}

/** Look for <link rel="alternate" type="application/rss+xml"> on the page, then common feed paths. */
async function discoverFeed(pageUrl: string, pageBody: string | null): Promise<{ url: string; items: number } | null> {
  const candidates: string[] = [];
  if (pageBody) {
    for (const match of pageBody.matchAll(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/gi)) {
      const href = match[0].match(/href=["']([^"']+)["']/i)?.[1];
      if (href) candidates.push(new URL(href, pageUrl).toString());
    }
  }
  try {
    const { origin, pathname } = new URL(pageUrl);
    const base = pathname.replace(/\/$/, "");
    for (const path of FEED_PATHS) {
      if (base) candidates.push(`${origin}${base}${path}`);
      candidates.push(`${origin}${path}`);
    }
  } catch {
    return null;
  }

  for (const candidate of Array.from(new Set(candidates))) {
    try {
      const { status, body } = await fetchText(candidate);
      const kind = kindOf(body);
      if (status < 400 && (kind === "rss" || kind === "atom")) {
        const items = parse(body, { source_key: "discover", url: candidate }).length;
        if (items > 0) return { url: candidate, items };
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

async function checkSource(source: InputSource): Promise<CheckResult> {
  const base = { source_key: source.source_key, url: source.url };
  let body: string | null = null;
  let result: CheckResult;

  try {
    const response = await fetchText(source.url);
    body = response.body;
    const kind = kindOf(body);
    const articles = response.status < 400 ? parse(body, source) : [];
    const newest = kind === "rss" || kind === "atom" ? newestAgeDays(articles.map((a) => a.publishedAt)) : null;

    let verdict: CheckResult["verdict"];
    if (response.status >= 400) verdict = "broken";
    else if (!articles.length) verdict = "empty";
    else if (newest !== null && newest > 90) verdict = "stale";
    else verdict = kind === "html" ? "ok_html" : "ok_feed";

    result = {
      ...base,
      status: response.status,
      kind,
      items: articles.length,
      newest_days: newest,
      final_url: response.finalUrl !== source.url ? response.finalUrl : undefined,
      verdict,
    };
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause?.code;
    result = { ...base, status: "error", error: cause ?? (error as Error).message, kind: "none", items: 0, newest_days: null, verdict: "broken" };
  }

  if (result.verdict !== "ok_feed") {
    const found = await discoverFeed(source.url, body);
    if (found && found.url !== source.url) {
      result.discovered_feed = found.url;
      result.discovered_items = found.items;
    }
  }
  return result;
}

function readInput(path: string): InputSource[] {
  const raw = readFileSync(path, "utf8");
  if (path.endsWith(".json")) {
    const parsed = JSON.parse(raw);
    return (parsed.sources ?? parsed) as InputSource[];
  }
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((url, index) => ({ source_key: `url_${index + 1}`, url }));
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const input = args[0];
  const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
  if (!input) throw new Error("Uso: check-sources.ts <catalog.json | urls.txt> [--json out.json]");

  const sources = readInput(input);
  const results: CheckResult[] = new Array(sources.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, sources.length) }, async () => {
      while (next < sources.length) {
        const index = next++;
        results[index] = await checkSource(sources[index]);
      }
    })
  );

  for (const r of results) {
    const extra = r.discovered_feed ? `  → feed: ${r.discovered_feed} (${r.discovered_items})` : "";
    const age = r.newest_days === null ? "-" : `${r.newest_days}d`;
    console.log(`${r.verdict.padEnd(8)} ${String(r.status).padEnd(5)} ${r.kind.padEnd(5)} items=${String(r.items).padEnd(3)} age=${age.padEnd(5)} ${r.source_key}  ${r.url}${extra}${r.error ? `  (${r.error})` : ""}`);
  }
  const summary = results.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] ?? 0) + 1 }), {});
  console.log("\nResumen:", JSON.stringify(summary));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
