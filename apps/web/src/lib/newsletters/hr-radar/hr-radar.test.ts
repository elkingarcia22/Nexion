import { describe, expect, it, vi } from "vitest";
import type { Article, NewsletterSource } from "../types";
import { buildHrPrompt, isRelevantHrArticle, rankHrArticles, scoreHrArticle, selectHrPills } from "./editorial";
import { runHrRadar, validateHrMessage } from "./pipeline";

function article(overrides: Partial<Article>): Article {
  const url = overrides.url ?? `https://www.hrdive.com/news/${Math.random().toString(36).slice(2)}`;
  return {
    title: "Companies use AI agents to rethink recruiting and talent acquisition",
    url,
    summary: "HR leaders are redesigning hiring workflows with automation and skills-based talent acquisition.",
    source: "HR Dive",
    sourceKey: "hr_dive",
    category: "talento_reclutamiento",
    priority: "high",
    publishedAt: "2026-09-28T10:00:00.000Z",
    domain: new URL(url).hostname.replace(/^www\./, ""),
    ...overrides,
  };
}

describe("HR relevance and scoring", () => {
  it("accepts Spanish LATAM stories with HR signals", () => {
    const latam = article({
      title: "Empresas en Colombia apuestan por la capacitación y el bienestar para reducir la rotación",
      summary: "Los equipos de recursos humanos usan inteligencia artificial para gestionar el talento.",
      url: "https://www.rrhhdigital.com/articulo/1",
      category: "latam",
    });
    expect(isRelevantHrArticle(latam)).toBe(true);
  });

  it("blocks commercial content and link-only pages", () => {
    expect(isRelevantHrArticle(article({ title: "Sponsored: download now our recruiting white paper" }))).toBe(false);
    expect(isRelevantHrArticle(article({ url: "https://www.hrdive.com/tag/recruiting/" }))).toBe(false);
  });

  it("only keeps layoff news that carries an HR lesson", () => {
    const plain = article({ title: "Retailer announces layoffs at its stores", summary: "The company cut 300 jobs." });
    const useful = article({ title: "Layoffs driven by AI: how HR leadership handles reskilling", summary: "" });
    expect(isRelevantHrArticle(plain)).toBe(false);
    expect(isRelevantHrArticle(useful)).toBe(true);
  });

  it("drops people moves, events, newsletter issues and person pages", () => {
    for (const title of [
      "Major players bring on new HR talent: HR pros on the move in September",
      "No te pierdas la tercera edición del HR Talent Day 2026",
      "Recruiting Brainfood - Issue 520",
      "Tomer Zilberman",
      "Major players in the health, wellness and luxury spaces bring on new HR talent in September",
    ]) {
      expect(isRelevantHrArticle(article({ title })), title).toBe(false);
    }
  });

  it("scores high-priority, on-pillar and fresh stories higher", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    const strong = article({ category: "ia_en_rrhh", priority: "high", publishedAt: "2026-09-29T00:00:00Z" });
    const weak = article({ category: "media_hr", priority: "low", publishedAt: "2026-09-20T00:00:00Z" });
    expect(scoreHrArticle(strong, now)).toBeGreaterThan(scoreHrArticle(weak, now));
  });
});

describe("HR ranking and selection", () => {
  it("uses the catalog pillar as angle and picks two different pillars", () => {
    const ranked = rankHrArticles([
      article({ category: "talento_reclutamiento" }),
      article({ category: "talento_reclutamiento", title: "Recruiting teams adopt AI agents for hiring at scale" }),
      article({
        category: "ia_en_rrhh",
        url: "https://www.reworked.co/ai-hr",
        title: "Generative AI copilots change performance management for managers",
      }),
    ]);

    const pills = selectHrPills(ranked, 2);
    expect(new Set(pills.map((p) => p.angle)).size).toBe(2);
    expect(pills.map((p) => p.angle)).toContain("ia_en_rrhh");
  });
});

describe("buildHrPrompt", () => {
  it("includes the sources and the previous edition as context", () => {
    const ranked = rankHrArticles([article({}), article({ category: "latam", url: "https://x.co/a", title: "Liderazgo y bienestar en equipos híbridos de LATAM" })]);
    const prompt = buildHrPrompt(ranked, { dateLabel: "30/09/2026", previousMessage: "Edición anterior sobre onboarding" });
    expect(prompt).toContain(":busts_in_silhouette: *HR Radar · 30/09/2026*");
    expect(prompt).toContain("Edición anterior sobre onboarding");
    for (const pill of ranked) expect(prompt).toContain(`URL: ${pill.url}`);
  });
});

const URLS = ["https://www.hrdive.com/news/a", "https://www.reworked.co/b"];
const BODY = "Contexto útil para equipos de producto y customer success sobre esta señal de RR. HH. ".repeat(3);

function hrMessage(urls = URLS, extra = ""): string {
  return `:busts_in_silhouette: *HR Radar · 30/09/2026*
Lo que vale la pena leer esta semana.

🧠 *INSIGHT HR · Reclutar con agentes*
${BODY}
👉 Revisen su funnel.
<${urls[0]}|Leer más ↗>

⚔️ *MITO vs REALIDAD · IA y desempeño*
${BODY}
👉 Midan antes de automatizar.
<${urls[1]}|Leer más ↗>
${extra}`;
}

describe("validateHrMessage", () => {
  it("accepts a well-formed message without PILL labels", () => {
    expect(validateHrMessage(hrMessage(), URLS).ok).toBe(true);
  });

  it("rejects forbidden section headings but allows the word in a sentence", () => {
    expect(validateHrMessage(hrMessage(URLS, "\n*Tendencias*"), URLS).ok).toBe(false);
    expect(validateHrMessage(hrMessage(URLS, "\nEstas tendencias importan."), URLS).ok).toBe(true);
  });

  it("rejects links that were not selected", () => {
    expect(validateHrMessage(hrMessage([URLS[0], "https://invented.com"]), URLS).ok).toBe(false);
  });
});

describe("runHrRadar", () => {
  const source = (key: string, url: string, category: string): NewsletterSource => ({
    id: key,
    newsletter_id: "hr-radar",
    source_key: key,
    name: key,
    url,
    source_type: "RSS",
    category,
    priority: "high",
    max_items: 5,
    is_active: true,
    notes: null,
    metadata: {},
  });
  const rss = (title: string, link: string, description: string) =>
    `<rss><channel><item><title>${title}</title><link>${link}</link><description>${description}</description><pubDate>Mon, 28 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
  const feeds: Record<string, string> = {
    "https://feeds.test/talent": rss("Recruiting teams adopt AI agents for talent acquisition", "https://www.hrdive.com/news/a", "Hiring and recruiting workflows change with automation."),
    "https://feeds.test/latam": rss("Empresas de LATAM invierten en capacitación y bienestar", "https://www.rrhhdigital.com/b", "Recursos humanos usa inteligencia artificial para retener talento."),
  };

  it("lets the model pick from the shortlist, sends the previous edition and reports the chosen pills", async () => {
    const generate = vi.fn(async (prompt: string) => {
      const urls = Array.from(prompt.matchAll(/^URL: (.+)$/gm)).map((m) => m[1]);
      return { text: hrMessage(urls.slice(0, 2)), usage: { inputTokens: 10, outputTokens: 5 } };
    });

    const result = await runHrRadar(
      {
        sources: [source("talent", "https://feeds.test/talent", "talento_reclutamiento"), source("latam", "https://feeds.test/latam", "latam")],
        seen: [],
        previousMessage: "La semana pasada hablamos de onboarding.",
      },
      { fetchBody: async (url) => feeds[url], generate, now: () => new Date("2026-09-30T13:00:00Z") }
    );

    expect(result.status).toBe("ready");
    expect(generate.mock.calls[0][0]).toContain("La semana pasada hablamos de onboarding.");
    if (result.status === "ready") expect(result.pills).toHaveLength(2);
  });

  it("rejects a model answer that links a story outside the shortlist", () => {
    const shortlist = ["https://www.hrdive.com/news/a", "https://www.reworked.co/b", "https://x.co/c"];
    expect(validateHrMessage(hrMessage([shortlist[0], shortlist[2]]), shortlist, 2).ok).toBe(true);
    expect(validateHrMessage(hrMessage([shortlist[0], "https://invented.com"]), shortlist, 2).ok).toBe(false);
    expect(validateHrMessage(hrMessage([shortlist[0], shortlist[0]]), shortlist, 2).ok).toBe(false);
  });
});
