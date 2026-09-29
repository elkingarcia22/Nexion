import { describe, expect, it } from "vitest";
import type { Article } from "../types";
import { buildTipsPrompt, isRelevantTip, rankTips, scoreTip, selectTipShortlist } from "./editorial";
import { validateTipsMessage } from "./pipeline";

function tip(overrides: Partial<Article> = {}): Article {
  const url = overrides.url ?? `https://www.nngroup.com/articles/${Math.random().toString(36).slice(2)}`;
  return {
    title: "How to write prompts that reduce AI hallucinations in UX research",
    url,
    summary: "A practical guide with a checklist for evaluating LLM output in usability studies.",
    source: "Nielsen Norman Group",
    sourceKey: "nng_articles",
    category: "prompts_llms",
    priority: "high",
    publishedAt: "2026-09-28T10:00:00.000Z",
    domain: new URL(url).hostname.replace(/^www\./, ""),
    sourceMetadata: { content_kind: "article" },
    ...overrides,
  };
}

describe("isRelevantTip", () => {
  it("keeps a practical article", () => {
    expect(isRelevantTip(tip())).toBe(true);
  });

  it("drops wallpapers, events, navigation and tag pages", () => {
    expect(isRelevantTip(tip({ title: "Small Joys And Big Adventures (August 2026 Wallpapers Edition)" }))).toBe(false);
    expect(isRelevantTip(tip({ title: "Join our UX research webinar next week" }))).toBe(false);
    expect(isRelevantTip(tip({ title: "Sign up" }))).toBe(false);
    expect(isRelevantTip(tip({ title: "Figma invests in the UK with expanded London office" }))).toBe(false);
    expect(isRelevantTip(tip({ url: "https://www.smashingmagazine.com/category/ux-design/" }))).toBe(false);
  });
});

describe("ranking and shortlist", () => {
  it("prefers core pillars and penalizes static reference pages", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    const article = tip();
    const reference = tip({ sourceMetadata: { content_kind: "reference" } });
    expect(scoreTip(article, now)).toBeGreaterThan(scoreTip(reference, now));
  });

  it("offers the best of each pillar first", () => {
    const ranked = rankTips([
      tip(),
      tip({ title: "Prompt chaining patterns for product teams using LLM agents" }),
      tip({ category: "accesibilidad", url: "https://webaim.org/blog/contrast-tips", title: "Five contrast mistakes that break accessibility on mobile" }),
    ]);
    const shortlist = selectTipShortlist(ranked, 2);
    expect(new Set(shortlist.map((t) => t.angle)).size).toBe(2);
  });
});

describe("prompt and validation", () => {
  it("builds the n8n format header", () => {
    const prompt = buildTipsPrompt(rankTips([tip()]), { dateLabel: "01/10/2026", previousMessage: "edición previa" });
    expect(prompt).toContain(":books: *IA Usability & Prompts · 01/10/2026*");
    expect(prompt).toContain("edición previa");
  });

  const urls = ["https://www.nngroup.com/a", "https://webaim.org/b", "https://x.co/c"];
  const body = "Un tip práctico para equipos de producto y UX que quieren usar mejor la IA esta semana. ".repeat(2);
  const message = (a: string, b: string) => `:books: *IA Usability & Prompts · 01/10/2026*
Dos ideas para probar hoy.

:bulb: *PILL 1 · Prompts que no alucinan*
${body}
:point_right: Agrega un paso de verificación.
:link: <${a}|Leer más ↗>

:hammer_and_wrench: *PILL 2 · Contraste que sí se lee*
${body}
:point_right: Revisa tus botones secundarios.
:link: <${b}|Leer más ↗>`;

  it("requires PILL labels and two distinct shortlist links", () => {
    expect(validateTipsMessage(message(urls[0], urls[1]), urls, 2).ok).toBe(true);
    expect(validateTipsMessage(message(urls[0], urls[0]), urls, 2).ok).toBe(false);
    expect(validateTipsMessage(message(urls[0], urls[1]).replace("PILL 2", "TIP 2"), urls, 2).ok).toBe(false);
  });
});
