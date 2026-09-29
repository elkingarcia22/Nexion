import type { SourcePriority, SourceType } from "./types";

/** Shape of automation/newsletters/catalogs/<id>.json (see the README there). */
export interface Catalog {
  newsletter: {
    id: string;
    name: string;
    description: string;
    schedule_label: string;
    slack_channel_id: string;
    model: string;
    sort_order?: number;
  };
  sources: CatalogSource[];
}

export interface CatalogSource {
  source_key: string;
  name: string;
  url: string;
  source_type: SourceType;
  category: string;
  priority: SourcePriority;
  max_items: number;
  is_active: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

const SOURCE_TYPES: SourceType[] = ["RSS", "HTML", "SITEMAP", "REDDIT"];
const PRIORITIES: SourcePriority[] = ["high", "medium", "low"];
const MIN_ITEMS = 1;
const MAX_ITEMS = 20;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEY_PATTERN = /^[a-z0-9_]+$/;

/** Returns every problem found; an empty list means the catalog can be seeded. */
export function validateCatalog(catalog: Catalog): string[] {
  const errors: string[] = [];
  const { newsletter, sources } = catalog;
  const where = (key: string) => `${newsletter?.id ?? "?"}/${key}`;

  if (!newsletter || !ID_PATTERN.test(newsletter.id ?? "")) errors.push(`id inválido: "${newsletter?.id}"`);
  for (const field of ["name", "description", "schedule_label", "slack_channel_id", "model"] as const) {
    if (!newsletter?.[field]) errors.push(`${newsletter?.id}: falta newsletter.${field}`);
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    errors.push(`${newsletter?.id}: no hay fuentes`);
    return errors;
  }

  const seenKeys = new Set<string>();
  for (const source of sources) {
    const key = source.source_key;
    if (!KEY_PATTERN.test(key ?? "")) errors.push(`${where(key)}: source_key debe ser snake_case`);
    if (seenKeys.has(key)) errors.push(`${where(key)}: source_key duplicado`);
    seenKeys.add(key);
    if (!/^https?:\/\//.test(source.url ?? "")) errors.push(`${where(key)}: url inválida`);
    if (!source.name) errors.push(`${where(key)}: falta name`);
    if (!source.category) errors.push(`${where(key)}: falta category`);
    if (!SOURCE_TYPES.includes(source.source_type)) errors.push(`${where(key)}: source_type "${source.source_type}" no permitido`);
    if (!PRIORITIES.includes(source.priority)) errors.push(`${where(key)}: priority "${source.priority}" no permitida`);
    if (!Number.isInteger(source.max_items) || source.max_items < MIN_ITEMS || source.max_items > MAX_ITEMS) {
      errors.push(`${where(key)}: max_items debe estar entre ${MIN_ITEMS} y ${MAX_ITEMS}`);
    }
    if (typeof source.is_active !== "boolean") errors.push(`${where(key)}: is_active debe ser true/false`);
  }
  return errors;
}

function sqlText(value: string | null | undefined): string {
  return value === null || value === undefined || value === "" ? "null" : `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: Record<string, unknown> | undefined): string {
  return `${sqlText(JSON.stringify(value ?? {}))}::jsonb`;
}

function newsletterSql(catalog: Catalog, sortOrder: number): string {
  const n = catalog.newsletter;
  // New newsletters start paused; an existing one keeps its is_enabled and model.
  return `insert into public.newsletters (id, name, description, slack_channel_id, schedule_label, model, is_enabled, sort_order)
values (${sqlText(n.id)}, ${sqlText(n.name)}, ${sqlText(n.description)}, ${sqlText(n.slack_channel_id)}, ${sqlText(n.schedule_label)}, ${sqlText(n.model)}, false, ${sortOrder})
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  slack_channel_id = excluded.slack_channel_id,
  schedule_label = excluded.schedule_label,
  sort_order = excluded.sort_order,
  updated_at = now();`;
}

function sourcesSql(catalog: Catalog): string {
  const rows = catalog.sources.map(
    (s) =>
      `  (${sqlText(catalog.newsletter.id)}, ${sqlText(s.source_key)}, ${sqlText(s.name)}, ${sqlText(s.url)}, ${sqlText(s.source_type)}, ` +
      `${sqlText(s.category)}, ${sqlText(s.priority)}, ${s.max_items}, ${s.is_active}, ${sqlText(s.notes)}, ${sqlJson(s.metadata)})`
  );
  return `insert into public.newsletter_sources
  (newsletter_id, source_key, name, url, source_type, category, priority, max_items, is_active, notes, metadata)
values
${rows.join(",\n")}
on conflict (newsletter_id, source_key) do update set
  name = excluded.name,
  url = excluded.url,
  source_type = excluded.source_type,
  category = excluded.category,
  priority = excluded.priority,
  max_items = excluded.max_items,
  is_active = excluded.is_active,
  notes = excluded.notes,
  metadata = excluded.metadata,
  updated_at = now();`;
}

/** Sources in the database that are no longer in the catalog are removed (the catalog is the source of truth). */
function pruneSql(catalog: Catalog): string {
  const keys = catalog.sources.map((s) => sqlText(s.source_key)).join(", ");
  return `delete from public.newsletter_sources
where newsletter_id = ${sqlText(catalog.newsletter.id)}
  and source_key not in (${keys});`;
}

/**
 * Idempotent SQL that creates or refreshes each newsletter and its sources from the catalogs.
 * The catalog is authoritative for source fields, including is_active, and for which sources exist.
 */
export function buildSeedSql(catalogs: Catalog[], defaultSortOrder: Record<string, number> = {}): string {
  const errors = catalogs.flatMap(validateCatalog);
  if (errors.length) throw new Error(`Catálogos inválidos:\n- ${errors.join("\n- ")}`);

  const blocks = catalogs.map((catalog) => {
    const id = catalog.newsletter.id;
    const sortOrder = catalog.newsletter.sort_order ?? defaultSortOrder[id] ?? 100;
    const active = catalog.sources.filter((s) => s.is_active).length;
    return [
      `-- ${catalog.newsletter.name} (${id}): ${catalog.sources.length} fuentes, ${active} activas`,
      newsletterSql(catalog, sortOrder),
      "",
      sourcesSql(catalog),
      "",
      pruneSql(catalog),
    ].join("\n");
  });

  return ["begin;", "", blocks.join("\n\n"), "", "commit;", ""].join("\n");
}
