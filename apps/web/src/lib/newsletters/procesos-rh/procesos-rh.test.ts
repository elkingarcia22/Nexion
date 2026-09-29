import { describe, expect, it, vi } from "vitest";
import type { NewsletterSource } from "../types";
import { inventedNumbers, offerSources, sourcesForProcess, toCandidate } from "./editorial";
import { runProcesosRh, validateProcessMessage } from "./pipeline";
import { FOCUS_VARIANTS, PROCESSES, topicForWeek } from "./rotation";

function source(key: string, overrides: Partial<NewsletterSource> = {}): NewsletterSource {
  return {
    id: key,
    newsletter_id: "procesos-rh",
    source_key: key,
    name: `Fuente ${key}`,
    url: `https://${key}.example.com/guide`,
    source_type: "HTML",
    category: "ONBOARDING",
    priority: "medium",
    max_items: 1,
    is_active: true,
    notes: "Guía de onboarding con plan 30-60-90.",
    metadata: { processes: ["ONBOARDING"], content_kind: "article", language: "en" },
    ...overrides,
  };
}

describe("topicForWeek", () => {
  it("returns the same topic for every day of a week and changes the next week", () => {
    const monday = topicForWeek(new Date("2026-09-28T14:00:00Z"));
    const friday = topicForWeek(new Date("2026-10-02T20:00:00Z"));
    const nextMonday = topicForWeek(new Date("2026-10-05T14:00:00Z"));
    expect(friday).toEqual(monday);
    expect(nextMonday.process.key).not.toBe(monday.process.key);
  });

  it("visits all 17 processes before repeating one, then switches the focus", () => {
    const start = new Date("2026-01-05T14:00:00Z").getTime();
    const weeks = Array.from({ length: PROCESSES.length }, (_, i) => topicForWeek(new Date(start + i * 7 * 86_400_000)));
    expect(new Set(weeks.map((w) => w.process.key)).size).toBe(PROCESSES.length);
    const afterLap = topicForWeek(new Date(start + PROCESSES.length * 7 * 86_400_000));
    expect(afterLap.process.key).toBe(weeks[0].process.key);
    expect(afterLap.focus).not.toBe(weeks[0].focus);
    expect(FOCUS_VARIANTS).toContain(afterLap.focus);
  });
});

describe("source selection", () => {
  const sources = [
    source("blog", { metadata: { processes: ["ONBOARDING"], content_kind: "blog_listing", language: "en" } }),
    source("guide", { priority: "high" }),
    source("es", { metadata: { processes: ["ONBOARDING"], content_kind: "article", language: "es" }, priority: "low" }),
    source("other", { category: "OKRS", metadata: { processes: ["OKRS"] } }),
  ];

  it("keeps only the week's process, skips used sources and puts articles first", () => {
    const ordered = sourcesForProcess(sources, "ONBOARDING", [{ url: "https://blog.example.com/guide", title: null }]);
    expect(ordered.map((s) => s.source_key)).toEqual(["guide", "es"]);
  });

  it("reuses sources when fewer than 2 are left unused", () => {
    const seen = ["guide", "es", "blog"].map((k) => ({ url: `https://${k}.example.com/guide`, title: null }));
    expect(sourcesForProcess(sources, "ONBOARDING", seen)).toHaveLength(3);
  });

  it("always offers a Spanish source when the process has one", () => {
    const offer = offerSources(sourcesForProcess(sources, "ONBOARDING", []), 2);
    expect(offer.map((s) => s.source_key)).toContain("es");
  });
});

describe("inventedNumbers", () => {
  const candidates = [toCandidate(source("a"), { title: "Onboarding guide", description: "70% of new hires decide in the first month.", text: "" })];

  it("allows figures present in the sources and the 30-60-90 vocabulary", () => {
    expect(inventedNumbers("header 2026\nEl 70% decide en su primer mes. Usa un plan 30-60-90.", candidates)).toEqual([]);
  });

  it("flags statistics the sources do not contain", () => {
    expect(inventedNumbers("header\nEl 45% de las empresas falla en 3 semanas.", candidates)).toEqual(["45%", "3"]);
  });
});

const PILL = "Un equipo pequeño puede ordenar su onboarding con objetivos claros por etapa y revisiones con el manager. ".repeat(2);
function processMessage(a: string, b: string, extra = ""): string {
  return `:books: *Entendimiento de procesos RH · Onboarding de nuevos colaboradores* (28/09/2026)
Un buen inicio cambia todo el primer trimestre.

:satellite_antenna: *HR RADAR*
*El onboarding no es una bienvenida*
${PILL}${extra}
:point_right: Define qué éxito significa en el día 90.
:link: <${a}|Leer más ↗>

:hammer_and_wrench: *APLICACIÓN RÁPIDA*
*Tu plan 30-60-90 en una tarde*
${PILL}
:point_right: Escribe tres metas por etapa.
:link: <${b}|Leer más ↗>`;
}

describe("runProcesosRh", () => {
  const sources = PROCESSES.flatMap((p) =>
    ["a", "b", "c"].map((suffix) =>
      source(`${p.key.toLowerCase()}_${suffix}`, { category: p.key, metadata: { processes: [p.key], content_kind: "article", language: suffix === "c" ? "es" : "en" } })
    )
  );
  const page = `<meta property="og:title" content="Guía práctica"><article><p>Un proceso claro ayuda a los equipos a coordinar responsables, tiempos y revisiones de forma consistente.</p></article>`;

  it("reads the offered pages, lets the model pick 2 and rejects invented figures before accepting", async () => {
    const generate = vi
      .fn()
      .mockImplementationOnce(async (prompt: string) => {
        const urls = Array.from(prompt.matchAll(/^URL: (.+)$/gm)).map((m) => m[1]);
        return { text: processMessage(urls[0], urls[1], " El 83% de las empresas lo hace mal."), usage: { inputTokens: 1, outputTokens: 1 } };
      })
      .mockImplementationOnce(async (prompt: string) => {
        const urls = Array.from(prompt.matchAll(/^URL: (.+)$/gm)).map((m) => m[1]);
        return { text: processMessage(urls[0], urls[1]), usage: { inputTokens: 1, outputTokens: 1 } };
      });

    const result = await runProcesosRh(
      { sources, seen: [], previousMessage: null },
      { fetchBody: async () => page, generate, now: () => new Date("2026-09-28T14:00:00Z") }
    );

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[0][0]).toContain("Proceso RH de la semana:");
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.pills).toHaveLength(2);
  });

  it("validates the HR RADAR + APLICACIÓN RÁPIDA format", () => {
    const urls = ["https://a.example.com/guide", "https://b.example.com/guide"];
    expect(validateProcessMessage(processMessage(urls[0], urls[1]), urls, 2).ok).toBe(true);
    expect(validateProcessMessage(processMessage(urls[0], urls[1]).replace("APLICACIÓN RÁPIDA", "HR RADAR"), urls, 2).ok).toBe(false);
  });
});
