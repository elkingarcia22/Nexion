import { describe, expect, it } from "vitest";
import { localizeNumbers, parseAnalysis, resolvePath, type AnalysisContext } from "./analysis";

const context = {
  funnel: { current: { completePct: 40 } },
  friction_top_screens: [{ frictionPct: 44.3 }],
  open_actions: [{ action_key: "detail_404_audit", title: "Auditar 404", status: "open", origin_period_key: "2026-W38" }],
} as unknown as AnalysisContext;

function reply(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    status: "yellow",
    headline: "La entrada al funnel sube y la fricción se concentra en Detalle",
    summary: "Resumen de la semana con 43.88% de sesiones con acción clave.",
    closing: "Validar la fricción.",
    insights: [
      { title: "Funnel", fact: "40% completa.", interpretation: "Estable.", confidence: "high", evidence: ["funnel.current.completePct", "no.existe"] },
      { title: "Fricción", fact: "44,3% en Detalle.", interpretation: "Por validar.", confidence: "odd", evidence: ["friction_top_screens[0].frictionPct"] },
    ],
    hypotheses: [{ statement: "H", how_to_validate: "Replays" }],
    actions: [
      { signal_key: "Detail 404 audit", title: "Auditar 404", evidence: "+6.94 pp", next_step: "Lista", owner: "engineering", continues_action_key: "detail_404_audit" },
      { signal_key: "config_friction", title: "Revisar Configuración", evidence: "50%", next_step: "Documento", owner: "nobody" },
      { signal_key: "config_friction", title: "Duplicada", evidence: "", next_step: "", owner: "design" },
    ],
    watch_next: [{ metric: "Sesiones con dead clicks", reason: "Subió", direction: "decrease" }],
    ...overrides,
  });
}

describe("parseAnalysis", () => {
  it("normalizes enums, numbers, evidence and duplicate actions", () => {
    const parsed = parseAnalysis(`Aquí va:\n${reply()}\n`, context);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { analysis } = parsed;
    expect(analysis.summary).toContain("43,9%");
    expect(analysis.insights[0].evidence).toEqual(["funnel.current.completePct"]);
    expect(analysis.insights[1].confidence).toBe("medium");
    expect(analysis.actions).toHaveLength(2);
    expect(analysis.actions[0]).toMatchObject({ signalKey: "detail_404_audit", continuesActionKey: "detail_404_audit", evidence: "+6,9 pp" });
    expect(analysis.actions[1].owner).toBe("product");
  });

  it("rejects replies it cannot trust, with a reason to retry", () => {
    expect(parseAnalysis("no json", context)).toEqual({ ok: false, error: "no devolvió un objeto JSON" });
    expect(parseAnalysis(reply({ headline: "" }), context)).toMatchObject({ ok: false, error: "faltan headline o summary" });
    expect(parseAnalysis(reply({ closing: "Ver https://posthog.com" }), context)).toMatchObject({ ok: false });
  });
});

describe("helpers", () => {
  it("resolves dotted and indexed paths", () => {
    expect(resolvePath(context, "friction_top_screens[0].frictionPct")).toBe(true);
    expect(resolvePath(context, "friction_top_screens[3].frictionPct")).toBe(false);
  });

  it("localizes decimals only next to % or pp", () => {
    expect(localizeNumbers("34.69% y +2.04 pp; versión 1.5")).toBe("34,7% y +2 pp; versión 1.5");
  });
});

describe("parseAnalysis visible text", () => {
  it("drops watch items named with context keys instead of rejecting the reading", () => {
    const parsed = parseAnalysis(
      reply({ watch_next: [{ metric: "deadClickPct", reason: "x", direction: "decrease" }, { metric: "Empresas con criterio NSM (sep.)", reason: "y", direction: "stable" }] }),
      context
    );
    expect(parsed.ok && parsed.analysis.watch_next.map((w) => w.metric)).toEqual(["Empresas con criterio NSM (sep.)"]);
  });

  it("accepts brand names and abbreviations that only look technical", () => {
    expect(parseAnalysis(reply({ closing: "Validar en HubSpot, p.ej. los negocios de sep." }), context).ok).toBe(true);
  });

  it("rejects context keys leaking into the prose", () => {
    const leaked = parseAnalysis(reply({ closing: "Revisar companies.newly_contracted cuanto antes." }), context);
    expect(leaked).toMatchObject({ ok: false });
  });
});
