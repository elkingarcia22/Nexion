import { describe, expect, it } from "vitest";
import type { Article } from "../types";
import { balanceCandidates, excludeSeen } from "./candidates";
import { buildPrompt, inferAngle, rankArticles, scoreArticle, selectPills } from "./editorial";

function article(overrides: Partial<Article>): Article {
  const url = overrides.url ?? `https://example.com/${Math.random()}`;
  return {
    title: "OpenAI launches new agents API for developers",
    url,
    summary: "OpenAI released an API that lets developers build AI agents that automate enterprise workflows.",
    source: "Example",
    sourceKey: "example",
    category: "media",
    priority: "medium",
    publishedAt: "2026-09-28T10:00:00.000Z",
    domain: new URL(url).hostname.replace(/^www\./, ""),
    ...overrides,
  };
}

const NOW = new Date("2026-09-29T13:00:00Z");

describe("balanceCandidates", () => {
  it("drops non-AI stories", () => {
    const result = balanceCandidates(
      [article({ title: "Best pizza in town", summary: "Cheese and dough." }), article({ title: "Claude gets memory" })],
      NOW
    );
    expect(result.map((a) => a.title)).toEqual(["Claude gets memory"]);
  });

  it("caps stories per domain so one source cannot dominate", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      article({ url: `https://blog.example.org/${i}`, publishedAt: `2026-09-${10 + i}T00:00:00Z` })
    );
    const result = balanceCandidates(many, new Date("2026-09-20T00:00:00Z"));
    expect(result).toHaveLength(3);
    expect(result[0].url).toBe("https://blog.example.org/9");
  });

  it("drops stories older than a week", () => {
    const stale = article({ title: "OpenAI old launch", publishedAt: "2026-04-08T00:00:00Z" });
    const fresh = article({ title: "OpenAI new launch" });
    expect(balanceCandidates([stale, fresh], NOW)).toEqual([fresh]);
  });
});

describe("excludeSeen", () => {
  it("removes stories already published by URL or by title", () => {
    const fresh = article({ url: "https://openai.com/index/new", title: "Brand new" });
    const byUrl = article({ url: "https://openai.com/index/bbva/?utm_source=x", title: "Different title" });
    const byTitle = article({ url: "https://other.com/copy", title: "OpenAI to acquire Ona" });

    const result = excludeSeen([fresh, byUrl, byTitle], [
      { url: "https://openai.com/index/bbva", title: "BBVA puts AI at the core" },
      { url: "https://openai.com/index/openai-to-acquire-ona", title: "OpenAI to acquire Ona" },
    ]);

    expect(result).toEqual([fresh]);
  });
});

describe("scoring", () => {
  it("penalizes academic math stories below the threshold", () => {
    const math = article({ title: "AI model disproves Erdős theorem", summary: "A proof about planar unit distance graphs." });
    expect(scoreArticle(math)).toBeLessThan(scoreArticle(article({})));
  });

  it("classifies angles with UX checked before models", () => {
    expect(inferAngle(article({ title: "Figma adds GPT design assistant", summary: "" }))).toBe("diseño, UX y herramientas");
    expect(inferAngle(article({ title: "Nothing relevant", summary: "", url: "https://x.org/y" }))).toBe("señal general de IA");
  });

  it("does not match short keywords inside other words", () => {
    // "build" contains "ui" and "guide" contains "ui"; neither is about UX.
    const story = article({ title: "How to build AI agents: a guide", summary: "", url: "https://x.org/agents" });
    expect(inferAngle(story)).toBe("agentes y automatización");
  });
});

describe("selectPills", () => {
  it("prefers two stories with different angles and domains", () => {
    const ranked = rankArticles([
      article({ url: "https://openai.com/a", title: "OpenAI agents automate workflows" }),
      article({ url: "https://openai.com/b", title: "OpenAI agents run autonomous workflows at scale" }),
      article({ url: "https://techcrunch.com/c", title: "Startup raises funding for AI product pricing", summary: "An AI startup raised funding to grow revenue and enterprise deals." }),
    ]);

    const pills = selectPills(ranked, 2);

    expect(pills).toHaveLength(2);
    expect(new Set(pills.map((p) => p.domain)).size).toBe(2);
    expect(new Set(pills.map((p) => p.angle)).size).toBe(2);
  });

  it("returns fewer pills when there are not enough candidates", () => {
    expect(selectPills(rankArticles([article({})]), 2)).toHaveLength(1);
  });
});

describe("buildPrompt", () => {
  it("includes each source URL and the date", () => {
    const ranked = rankArticles([
      article({ url: "https://openai.com/a" }),
      article({ url: "https://techcrunch.com/b", title: "Anthropic ships Claude for enterprise teams" }),
    ]);
    const prompt = buildPrompt(ranked, "29/09/2026");
    expect(prompt).toContain("URL: https://openai.com/a");
    expect(prompt).toContain("URL: https://techcrunch.com/b");
    expect(prompt).toContain(":robot_face: *IA News Day · 29/09/2026*");
  });
});
