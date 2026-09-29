import { describe, expect, it } from "vitest";
import { periodContaining } from "../periods";
import { buildRadarMessage, SECTION_SEPARATOR } from "./message";
import { buildCompanies, buildFeatures, buildFriction, buildFunnel, buildRecurrence, buildSummary } from "./metrics";
import { HIRING_RADAR } from "./products/hiring";
import type { RadarAnalysis, RadarWeek } from "./types";

function sampleWeek(): RadarWeek {
  const summary = buildSummary([
    { periodo: "actual", sesiones: 196, usuarios: 41, empresas: 20, acciones_clave: 503, sesiones_con_accion_clave: 86 },
    { periodo: "anterior", sesiones: 249, usuarios: 51, empresas: 24, acciones_clave: 523, sesiones_con_accion_clave: 88 },
  ]);
  const features = buildFeatures([{ periodo: "actual", funcionalidad: "candidate_review", usuarios: 23, empresas: 15, eventos: 244 }], HIRING_RADAR, summary);
  return {
    period: periodContaining("radar_semanal", new Date("2026-09-23T00:00:00Z")),
    summary,
    features: features.features,
    featuresHealth: features.health,
    funnel: buildFunnel([{ periodo: "actual", paso_0: 28, paso_1: 22, paso_2: 21, paso_3: 19, confirmadas: 14 }], HIRING_RADAR),
    recurrence: buildRecurrence([{ usuarios_actual: 41, usuarios_anterior: 51, usuarios_recurrentes: 26 }]),
    friction: buildFriction([{ periodo: "actual", pantalla: "/recruitment/job/detail", sesiones: 149, sesiones_friccion: 66 }], HIRING_RADAR),
    companies: buildCompanies([{ empresa: "Grupo Pelón", sesiones: 33, sesiones_friccion: 21, rage_clicks: 1 }]),
    replays: [],
  };
}

const analysis: RadarAnalysis = {
  status: "yellow",
  headline: "Más inicios de vacantes y fricción en Detalle",
  summary: "Resumen.",
  closing: "Cierre.",
  insights: [],
  hypotheses: [],
  actions: [{ signalKey: "a", title: "Auditar Detalle", evidence: "44,3%", nextStep: "Lista", owner: "engineering", continuesActionKey: "a" }],
  watch_next: [{ metric: "Sesiones con dead clicks", reason: "", direction: "decrease" }],
};

describe("buildRadarMessage", () => {
  it("renders every block from the data in es-CO", () => {
    const message = buildRadarMessage(sampleWeek(), HIRING_RADAR, analysis, "yellow", "https://nexion.app/analytics");
    expect(message).toContain("*HIRING · RADAR SEMANAL DE PRODUCTO*");
    expect(message).toContain("Semana 39");
    expect(message).toContain("Usuarios: 41 · :red_circle: ▼ -19,6% · vs. 51");
    expect(message).toContain("Conversión a publicación");
    expect(message).toContain("*Grupo Pelón* · 21 de 33 sesiones con fricción · 1 rage click");
    expect(message).toContain("↻ En seguimiento");
    expect(message).toContain("• Sesiones con dead clicks · objetivo: disminuir");
    expect(message).toContain("<https://nexion.app/analytics|Ver el reporte completo en Nexión>");
    expect(message).not.toMatch(/undefined|NaN|\[object Object\]/);
  });

  it("still produces a complete message without the AI reading", () => {
    const message = buildRadarMessage(sampleWeek(), HIRING_RADAR, null, "red", undefined);
    expect(message).toContain(":red_circle: Atención prioritaria");
    expect(message).toContain("el análisis con IA no estuvo disponible");
    expect(message).not.toContain(":dart: *ACCIONES*");
    expect(message.split(SECTION_SEPARATOR).length).toBeGreaterThan(6);
  });
});
