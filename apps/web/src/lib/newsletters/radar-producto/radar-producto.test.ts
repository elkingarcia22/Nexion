import { describe, expect, it } from "vitest";
import type { Article } from "../types";
import {
  buildProductPrompt,
  competitorOf,
  isRelevantProductUpdate,
  rankProductUpdates,
  scoreProductUpdate,
  selectProductShortlist,
} from "./editorial";
import { validateProductMessage } from "./pipeline";

function update(overrides: Partial<Article> = {}): Article {
  const url = overrides.url ?? `https://www.ashbyhq.com/product-updates/${Math.random().toString(36).slice(2)}`;
  return {
    title: "Introducing AI Notetaker for faster hiring decisions",
    url,
    summary: "Ashby launches an AI assistant that records and summarizes interviews.",
    source: "Ashby · Product updates",
    sourceKey: "ashby_product_updates",
    category: "reclutamiento",
    priority: "high",
    publishedAt: "2026-09-28T10:00:00.000Z",
    domain: new URL(url).hostname.replace(/^www\./, ""),
    sourceMetadata: { competitor: "Ashby", content_kind: "product_updates" },
    ...overrides,
  };
}

describe("isRelevantProductUpdate", () => {
  it("keeps a concrete, public product update", () => {
    expect(isRelevantProductUpdate(update())).toBe(true);
  });

  it("drops hubs, API docs, support, events and generic titles", () => {
    for (const url of [
      "https://www.ashbyhq.com/product-updates",
      "https://developers.smartrecruiters.com/changelog/new-endpoint",
      "https://support.greenhouse.io/hc/en-us/articles/123-release",
      "https://lattice.com/events/rfh-2026-summit-signup",
      "https://updates.cultureamp.com/#featured-updates",
      "https://lattice.com/platform/ai-agent",
      "https://www.sap.com/assetdetail/2026/04/50ba1292-employee-data-agent.html",
    ]) {
      expect(isRelevantProductUpdate(update({ url })), url).toBe(false);
    }
    expect(isRelevantProductUpdate(update({ title: "Learn more" }))).toBe(false);
  });

  it("drops corporate noise such as fraud cases or layoffs", () => {
    expect(isRelevantProductUpdate(update({ title: "Buk investigado por presunto fraude en Chile" }))).toBe(false);
    expect(isRelevantProductUpdate(update({ title: "Deel Dealt New Setbacks in Rippling Case Over Alleged Spying" }))).toBe(false);
  });

  it("requires the competitor in Google News titles to avoid same-name companies", () => {
    const meta = { competitor: "Rankmi", via: "google_news", content_kind: "press" };
    expect(isRelevantProductUpdate(update({ title: "Rankmi lanza nueva evaluación de desempeño con IA", sourceMetadata: meta }))).toBe(true);
    expect(isRelevantProductUpdate(update({ title: "Otra empresa lanza nueva plataforma de nómina", sourceMetadata: meta }))).toBe(false);
  });
});

describe("ranking and shortlist", () => {
  it("scores changelog launches above generic blog posts", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    const launch = update();
    const blog = update({ title: "Five tips for better company culture this year", summary: "", priority: "low", sourceMetadata: { competitor: "X", content_kind: "blog" } });
    expect(scoreProductUpdate(launch, now)).toBeGreaterThan(scoreProductUpdate(blog, now));
  });

  it("offers at most one story per competitor, even when outlets differ", () => {
    const ranked = rankProductUpdates([
      update(),
      update({ title: "Ashby adds AI talent rediscovery to past candidates", url: "https://news.example.com/ashby-2", domain: "news.example.com" }),
      update({ title: "Lattice introduces AI performance review drafts", url: "https://lattice.com/product-updates/ai-reviews", category: "objetivos_desempeno", sourceMetadata: { competitor: "Lattice", content_kind: "product_updates" } }),
    ]);
    const shortlist = selectProductShortlist(ranked, 8);
    expect(shortlist.map(competitorOf)).toEqual(expect.arrayContaining(["Ashby", "Lattice"]));
    expect(shortlist.filter((a) => competitorOf(a) === "Ashby")).toHaveLength(1);
  });
});

describe("prompt and validation", () => {
  it("lists competitor and product line for each candidate", () => {
    const prompt = buildProductPrompt(rankProductUpdates([update()]), { dateLabel: "29/09/2026", previousMessage: null });
    expect(prompt).toContain("COMPETITOR: Ashby");
    expect(prompt).toContain("PRODUCT_LINE: Reclutamiento");
    expect(prompt).toContain(":dart: *Radar de Producto · 29/09/2026*");
  });

  const urls = ["https://www.ashbyhq.com/a", "https://lattice.com/b", "https://x.co/c"];
  const body = "Ashby lanzó un asistente que resume entrevistas y acelera decisiones de contratación. ".repeat(2);
  const message = (a: string, b: string) => `:dart: *Radar de Producto · 29/09/2026*
Esta semana la IA entra al proceso de selección.

🧠 *INSIGHT COMPETITIVO · Ashby: notas con IA*
${body}
👉 Evaluar un resumen automático de entrevistas.
<${a}|Leer más ↗>

📡 *PRODUCT RADAR · Lattice: reviews asistidas*
${body}
👉 Revisar el flujo de evaluaciones.
<${b}|Leer más ↗>`;

  it("accepts two shortlist links and rejects NO_PUBLICAR or outside links", () => {
    expect(validateProductMessage(message(urls[0], urls[1]), urls, 2).ok).toBe(true);
    expect(validateProductMessage(message(urls[0], "https://invented.com"), urls, 2).ok).toBe(false);
    expect(validateProductMessage("NO_PUBLICAR", urls, 2).ok).toBe(false);
  });
});
