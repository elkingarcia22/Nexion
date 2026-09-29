import { describe, expect, it, vi } from "vitest";
import type { NewsletterSource } from "../types";
import { runIaNewsDay, type PipelineDeps } from "./pipeline";

function source(key: string, url: string): NewsletterSource {
  return {
    id: key,
    newsletter_id: "ia-news-day",
    source_key: key,
    name: key,
    url,
    source_type: "RSS",
    category: "media",
    priority: "high",
    max_items: 5,
    is_active: true,
    notes: null,
    metadata: {},
  };
}

function rss(items: Array<{ title: string; link: string; description: string }>): string {
  return `<rss><channel>${items
    .map((i) => `<item><title>${i.title}</title><link>${i.link}</link><description>${i.description}</description><pubDate>Mon, 28 Sep 2026 10:00:00 GMT</pubDate></item>`)
    .join("")}</channel></rss>`;
}

const FEEDS: Record<string, string> = {
  "https://openai.com/rss": rss([
    { title: "OpenAI agents automate enterprise workflows", link: "https://openai.com/index/agents", description: "OpenAI launched agents for enterprise automation and developer workflows." },
  ]),
  "https://techcrunch.com/rss": rss([
    { title: "AI startup raises funding to cut model pricing", link: "https://techcrunch.com/2026/ai-pricing", description: "The AI startup raised funding to lower pricing for enterprise model inference." },
  ]),
};

function modelReply(urls: string[]): string {
  const body = "Contexto útil para que el equipo entienda la señal y decida qué probar esta semana. ".repeat(3);
  return `:robot_face: *IA News Day · 28/09/2026*
Hook.

:zap: *PILL 1 · Uno*
${body}
:point_right: Takeaway.
:link: <${urls[0]}|Leer más ↗>

:art: *PILL 2 · Dos*
${body}
:point_right: Takeaway.
:link: <${urls[1]}|Leer más ↗>`;
}

function deps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    fetchBody: async (url) => {
      if (!FEEDS[url]) throw new Error("HTTP 404");
      return FEEDS[url];
    },
    generate: async (prompt) => {
      const urls = Array.from(prompt.matchAll(/^URL: (.+)$/gm)).map((m) => m[1]);
      return { text: modelReply(urls), usage: { inputTokens: 100, outputTokens: 50 } };
    },
    now: () => new Date("2026-09-28T13:00:00Z"),
    ...overrides,
  };
}

const SOURCES = [
  source("openai", "https://openai.com/rss"),
  source("techcrunch", "https://techcrunch.com/rss"),
  source("broken", "https://broken.example/rss"),
];

describe("runIaNewsDay", () => {
  it("produces a validated message with two unseen pills and reports failing sources", async () => {
    const result = await runIaNewsDay({ sources: SOURCES, seen: [] }, deps());

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.pills.map((p) => p.url).sort()).toEqual([
      "https://openai.com/index/agents",
      "https://techcrunch.com/2026/ai-pricing",
    ]);
    expect(result.stats.sourceErrors).toEqual([{ source: "broken", error: "HTTP 404" }]);
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 50 });
  });

  it("skips without calling the model when there are not enough new stories", async () => {
    const generate = vi.fn();
    const result = await runIaNewsDay(
      { sources: SOURCES, seen: [{ url: "https://openai.com/index/agents", title: null }] },
      deps({ generate })
    );

    expect(result.status).toBe("skipped");
    expect(generate).not.toHaveBeenCalled();
  });

  it("retries once when the model output is invalid, then fails with the reason", async () => {
    const generate = vi.fn().mockResolvedValue({ text: "respuesta inválida", usage: { inputTokens: 1, outputTokens: 1 } });
    const result = await runIaNewsDay({ sources: SOURCES, seen: [] }, deps({ generate }));

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.error).toMatch(/corto/);
  });

  it("recovers when the first model call throws", async () => {
    const good = deps().generate;
    const generate = vi.fn().mockRejectedValueOnce(new Error("503")).mockImplementation(good);
    const result = await runIaNewsDay({ sources: SOURCES, seen: [] }, deps({ generate }));

    expect(result.status).toBe("ready");
    expect(result.stats.attempts).toBe(2);
  });
});
