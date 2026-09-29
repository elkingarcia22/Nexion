/**
 * Builds an idempotent SQL seed from automation/newsletters/catalogs/*.json.
 *
 * Usage (from the repo root):
 *   npx vite-node scripts/newsletters/build-seed.ts -- [output.sql]
 *
 * Writes to supabase/seeds/newsletter_catalogs.sql by default. Run the result once in the
 * Supabase SQL Editor after the newsletter migrations are applied.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSeedSql, type Catalog } from "../../apps/web/src/lib/newsletters/catalog-seed";

const CATALOG_DIR = "automation/newsletters/catalogs";
const DEFAULT_OUTPUT = "supabase/seeds/newsletter_catalogs.sql";

/** Daily bulletin first, then one per weekday. */
const SORT_ORDER: Record<string, number> = {
  "ia-news-day": 0,
  "procesos-rh": 1,
  "radar-producto": 2,
  "hr-radar": 3,
  "ia-usability": 4,
};

function main() {
  const output = process.argv.slice(2).filter((arg) => arg !== "--")[0] ?? DEFAULT_OUTPUT;
  const files = readdirSync(CATALOG_DIR).filter((file) => file.endsWith(".json")).sort();
  const catalogs = files.map((file) => JSON.parse(readFileSync(join(CATALOG_DIR, file), "utf8")) as Catalog);

  const header = `-- Generado por scripts/newsletters/build-seed.ts desde ${CATALOG_DIR}/ (${files.join(", ")}).\n-- No editar a mano: cambia el catálogo y vuelve a generar.\n\n`;
  writeFileSync(output, header + buildSeedSql(catalogs, SORT_ORDER), "utf8");

  for (const catalog of catalogs) {
    const active = catalog.sources.filter((source) => source.is_active).length;
    console.log(`${catalog.newsletter.id.padEnd(16)} ${String(catalog.sources.length).padStart(4)} fuentes · ${active} activas`);
  }
  console.log(`\nSQL escrito en ${output}`);
}

main();
