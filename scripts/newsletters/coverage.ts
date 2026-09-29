/**
 * Coverage report: does each newsletter have enough fresh, varied material to write good pills?
 *
 * For every active source it fetches and parses the feed (same parser as production) and counts
 * stories published inside the newsletter's freshness window, grouped by category.
 *
 * Usage (from the repo root):
 *   npx vite-node scripts/newsletters/coverage.ts -- [catalog-id ...] [--json out.json]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFeed } from "../../apps/web/src/lib/newsletters/feed-parser";
import type { Catalog, CatalogSource } from "../../apps/web/src/lib/newsletters/catalog-seed";

const CATALOG_DIR = "automation/newsletters/catalogs";
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 10;
const DAY_MS = 86_400_000;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*",
};

/**
 * What "enough" means per newsletter. News bulletins need fresh stories inside their window;
 * the evergreen process explainer needs depth per HR process instead.
 */
const TARGETS: Record<string, { windowDays: number; minFresh: number; minPerCategory: number; evergreen?: boolean }> = {
  "ia-news-day": { windowDays: 7, minFresh: 60, minPerCategory: 3 },
  "hr-radar": { windowDays: 14, minFresh: 40, minPerCategory: 3 },
  "radar-producto": { windowDays: 30, minFresh: 20, minPerCategory: 3 },
  "ia-usability": { windowDays: 30, minFresh: 30, minPerCategory: 3 },
  "procesos-rh": { windowDays: 0, minFresh: 0, minPerCategory: 4, evergreen: true },
};

interface SourceCoverage {
  source_key: string;
  category: string;
  ok: boolean;
  items: number;
  fresh: number;
  undated: number;
  error?: string;
}

async function measure(source: CatalogSource, windowDays: number): Promise<SourceCoverage> {
  const base = { source_key: source.source_key, category: source.category };
  try {
    const response = await fetch(source.url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return { ...base, ok: false, items: 0, fresh: 0, undated: 0, error: `HTTP ${response.status}` };
    const body = await response.text();
    const isFeed = body.includes("<rss") || body.includes("<channel") || (body.includes("<feed") && body.includes("<entry"));
    const articles = parseFeed(body, { ...source, max_items: 50 });
    const cutoff = Date.now() - windowDays * DAY_MS;
    // HTML listings have no reliable dates: count them as undated, not fresh.
    const fresh = isFeed ? articles.filter((a) => new Date(a.publishedAt).getTime() >= cutoff).length : 0;
    return { ...base, ok: true, items: articles.length, fresh, undated: isFeed ? 0 : articles.length };
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause?.code;
    return { ...base, ok: false, items: 0, fresh: 0, undated: 0, error: cause ?? (error as Error).message };
  }
}

async function measureAll(sources: CatalogSource[], windowDays: number): Promise<SourceCoverage[]> {
  const results: SourceCoverage[] = new Array(sources.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, sources.length) }, async () => {
      while (next < sources.length) {
        const index = next++;
        results[index] = await measure(sources[index], windowDays);
      }
    })
  );
  return results;
}

function evergreenReport(catalog: Catalog, minPerCategory: number) {
  const perProcess = new Map<string, { total: number; spanish: number }>();
  for (const source of catalog.sources.filter((s) => s.is_active)) {
    const processes = Array.isArray(source.metadata?.processes) ? (source.metadata!.processes as string[]) : [source.category];
    for (const process of processes) {
      const entry = perProcess.get(process) ?? { total: 0, spanish: 0 };
      perProcess.set(process, {
        total: entry.total + 1,
        spanish: entry.spanish + (source.metadata?.language === "es" ? 1 : 0),
      });
    }
  }
  const rows = Array.from(perProcess.entries()).sort((a, b) => a[1].total - b[1].total);
  const gaps = rows.filter(([, v]) => v.total < minPerCategory || v.spanish === 0).map(([k]) => k);
  return { perProcess: Object.fromEntries(rows), gaps };
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
  const only = args.filter((arg, i) => !arg.startsWith("--") && args[i - 1] !== "--json");
  const files = readdirSync(CATALOG_DIR)
    .filter((file) => file.endsWith(".json"))
    .filter((file) => !only.length || only.includes(file.replace(/\.json$/, "")));

  const report: Record<string, unknown> = {};
  for (const file of files) {
    const catalog = JSON.parse(readFileSync(join(CATALOG_DIR, file), "utf8")) as Catalog;
    const id = catalog.newsletter.id;
    const target = TARGETS[id] ?? { windowDays: 14, minFresh: 20, minPerCategory: 3 };
    const active = catalog.sources.filter((s) => s.is_active);

    console.log(`\n=== ${catalog.newsletter.name} (${id}) · ${active.length} activas`);
    if (target.evergreen) {
      const { perProcess, gaps } = evergreenReport(catalog, target.minPerCategory);
      for (const [process, v] of Object.entries(perProcess)) console.log(`  ${process.padEnd(28)} ${String(v.total).padStart(3)} fuentes · ${v.spanish} en español`);
      console.log(gaps.length ? `  ⚠ Procesos flojos: ${gaps.join(", ")}` : "  ✓ Todos los procesos cubiertos");
      report[id] = { activeSources: active.length, perProcess, gaps };
      continue;
    }

    const results = await measureAll(active, target.windowDays);
    const byCategory = new Map<string, { sources: number; working: number; fresh: number }>();
    for (const r of results) {
      const entry = byCategory.get(r.category) ?? { sources: 0, working: 0, fresh: 0 };
      byCategory.set(r.category, {
        sources: entry.sources + 1,
        working: entry.working + (r.ok && r.items > 0 ? 1 : 0),
        fresh: entry.fresh + r.fresh,
      });
    }
    const totalFresh = results.reduce((sum, r) => sum + r.fresh, 0);
    const failing = results.filter((r) => !r.ok || r.items === 0);
    const thinCategories = Array.from(byCategory.entries())
      .filter(([, v]) => v.working < target.minPerCategory)
      .map(([k]) => k);

    for (const [category, v] of Array.from(byCategory.entries()).sort((a, b) => b[1].fresh - a[1].fresh)) {
      console.log(`  ${category.padEnd(28)} ${String(v.working).padStart(2)}/${v.sources} funcionando · ${String(v.fresh).padStart(3)} frescas (${target.windowDays}d)`);
    }
    console.log(`  Total frescas: ${totalFresh} (meta ${target.minFresh}) ${totalFresh >= target.minFresh ? "✓" : "⚠"}`);
    if (thinCategories.length) console.log(`  ⚠ Categorías con menos de ${target.minPerCategory} fuentes funcionando: ${thinCategories.join(", ")}`);
    if (failing.length) console.log(`  ⚠ Activas que hoy no entregan nada: ${failing.map((r) => `${r.source_key}${r.error ? ` (${r.error})` : ""}`).join(", ")}`);

    report[id] = {
      activeSources: active.length,
      windowDays: target.windowDays,
      totalFresh,
      minFresh: target.minFresh,
      byCategory: Object.fromEntries(byCategory),
      thinCategories,
      failing: failing.map((r) => ({ source_key: r.source_key, error: r.error ?? "sin items" })),
    };
  }

  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
