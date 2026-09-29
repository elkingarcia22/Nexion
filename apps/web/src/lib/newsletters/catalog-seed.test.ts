import { describe, expect, it } from "vitest";
import { buildSeedSql, validateCatalog, type Catalog } from "./catalog-seed";

function catalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    newsletter: {
      id: "hr-radar",
      name: "HR Radar",
      description: "Boletín semanal de RR. HH.",
      schedule_label: "Miércoles · 8:00 a. m. (Bogotá)",
      slack_channel_id: "C0A34HW4HGR",
      model: "claude-haiku-4-5-20251001",
    },
    sources: [
      {
        source_key: "hr_dive",
        name: "HR Dive",
        url: "https://www.hrdive.com/feeds/news/",
        source_type: "RSS",
        category: "media_hr",
        priority: "high",
        max_items: 5,
        is_active: true,
        notes: "Noticias de RR. HH. en EE. UU. con análisis de la industria",
        metadata: { language: "en" },
      },
    ],
    ...overrides,
  };
}

describe("validateCatalog", () => {
  it("accepts a well-formed catalog", () => {
    expect(validateCatalog(catalog())).toEqual([]);
  });

  it("reports duplicated keys, bad enums and out-of-range max_items", () => {
    const base = catalog().sources[0];
    const errors = validateCatalog(
      catalog({
        sources: [
          base,
          { ...base, source_type: "PRODUCT_UPDATES" as never, priority: "urgent" as never, max_items: 50 },
        ],
      })
    );
    expect(errors.join("\n")).toMatch(/duplicado/);
    expect(errors.join("\n")).toMatch(/source_type "PRODUCT_UPDATES"/);
    expect(errors.join("\n")).toMatch(/priority "urgent"/);
    expect(errors.join("\n")).toMatch(/max_items/);
  });
});

describe("buildSeedSql", () => {
  it("escapes quotes, keeps accents and upserts both tables in one transaction", () => {
    const sql = buildSeedSql(
      [catalog({ sources: [{ ...catalog().sources[0], notes: "Guía de O'Neil · Bogotá" }] })],
      { "hr-radar": 3 }
    );

    expect(sql.startsWith("begin;")).toBe(true);
    expect(sql.trim().endsWith("commit;")).toBe(true);
    expect(sql).toContain("'Guía de O''Neil · Bogotá'");
    expect(sql).toContain("on conflict (id) do update");
    expect(sql).toContain("on conflict (newsletter_id, source_key) do update");
    expect(sql).toContain(`'{"language":"en"}'::jsonb`);
    expect(sql).toMatch(/false, 3\)/);
  });

  it("does not overwrite is_enabled or model of an existing newsletter", () => {
    const upsert = buildSeedSql([catalog()]).split("on conflict (id) do update set")[1].split(";")[0];
    expect(upsert).not.toMatch(/is_enabled|model/);
  });

  it("removes database sources that were dropped from the catalog", () => {
    const sql = buildSeedSql([catalog()]);
    expect(sql).toContain("delete from public.newsletter_sources\nwhere newsletter_id = 'hr-radar'\n  and source_key not in ('hr_dive');");
  });

  it("refuses to build SQL from an invalid catalog", () => {
    expect(() => buildSeedSql([catalog({ sources: [] })])).toThrow(/no hay fuentes/);
  });
});
