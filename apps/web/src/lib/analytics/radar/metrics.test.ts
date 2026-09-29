import { describe, expect, it } from "vitest";
import { buildCompanies, buildFeatures, buildFriction, buildFunnel, buildRecurrence, buildSummary } from "./metrics";
import { HIRING_RADAR } from "./products/hiring";

const week = (periodo: string, values: Record<string, number>) => ({ periodo, ...values });

describe("buildSummary", () => {
  it("computes rates per week and raises alerts from the current week", () => {
    const summary = buildSummary([
      week("actual", { sesiones: 200, usuarios: 40, sesiones_con_accion_clave: 60, sesiones_error_no_404: 12, sesiones_ruta_invalida: 1 }),
      week("anterior", { sesiones: 250, usuarios: 50, sesiones_con_accion_clave: 100 }),
    ]);
    expect(summary.current.keyActionSessionsPct).toBe(30);
    expect(summary.previous.keyActionSessionsPct).toBe(40);
    expect(summary.alerts.map((a) => [a.key, a.severity])).toEqual([
      ["non_404_errors", "high"],
      ["invalid_route", "medium"],
      ["key_action_drop", "high"],
    ]);
    expect(summary.health).toBe("red");
  });

  it("is green without alerts", () => {
    const summary = buildSummary([week("actual", { sesiones: 10, usuarios: 5 }), week("anterior", { sesiones: 10, usuarios: 5 })]);
    expect(summary.alerts).toEqual([]);
    expect(summary.health).toBe("green");
  });
});

describe("buildFeatures", () => {
  const summary = buildSummary([week("actual", { sesiones: 100, usuarios: 50 }), week("anterior", { sesiones: 100, usuarios: 40 })]);

  it("classifies trends and reach against active users", () => {
    const { features } = buildFeatures(
      [
        { periodo: "actual", funcionalidad: "candidate_review", usuarios: 20, eventos: 200, empresas: 9 },
        { periodo: "anterior", funcionalidad: "candidate_review", usuarios: 10, eventos: 100 },
        { periodo: "actual", funcionalidad: "cv_import", usuarios: 4, eventos: 90 },
        { periodo: "anterior", funcionalidad: "cv_import", usuarios: 8, eventos: 40 },
        { periodo: "anterior", funcionalidad: "workflows", usuarios: 3, eventos: 5 },
      ],
      HIRING_RADAR,
      summary
    );
    const byKey = Object.fromEntries(features.map((f) => [f.key, f]));
    expect(byKey.candidate_review).toMatchObject({ status: "growing", reachPct: 40, reachDeltaPp: 15 });
    expect(byKey.cv_import.status).toBe("concentrated_usage");
    expect(byKey.workflows.status).toBe("no_current_usage");
    expect(features[0].key).toBe("candidate_review");
  });
});

describe("buildFunnel", () => {
  it("measures ordered steps and the biggest loss", () => {
    const funnel = buildFunnel(
      [
        { periodo: "actual", paso_0: 20, paso_1: 10, paso_2: 9, paso_3: 8, confirmadas: 6, segundos_promedio: 600 },
        { periodo: "anterior", paso_0: 10, paso_1: 9, paso_2: 9, paso_3: 9, confirmadas: 8 },
      ],
      HIRING_RADAR
    );
    expect(funnel.current.completePct).toBe(40);
    expect(funnel.current.confirmedPct).toBe(30);
    expect(funnel.current.avgMinutes).toBe(10);
    expect(funnel.mainDropoff).toEqual({ beforeStep: "Configuración", lostSessions: 10, dropoffPct: 50 });
    expect(funnel.health).toBe("red"); // −50 pp against the previous week
  });
});

describe("buildRecurrence", () => {
  it("uses the previous week as the retention base", () => {
    const r = buildRecurrence([{ usuarios_actual: 40, usuarios_anterior: 50, usuarios_recurrentes: 10, usuarios_multidia: 8, empresas_anterior: 10, empresas_recurrentes: 8 }]);
    expect(r.userRetentionPct).toBe(20);
    expect(r.companyRetentionPct).toBe(80);
    expect(r.health).toBe("red");
  });
});

describe("buildFriction", () => {
  it("ranks screens by impact and flags repeated invalid routes as critical", () => {
    const { screens, health } = buildFriction(
      [
        { periodo: "actual", pantalla: "/recruitment/job/detail", sesiones: 100, sesiones_friccion: 40, sesiones_dead_click: 30, sesiones_rage_click: 1 },
        { periodo: "anterior", pantalla: "/recruitment/job/detail", sesiones: 100, sesiones_friccion: 30 },
        { periodo: "actual", pantalla: "/recruitment/job/dashboard/undefined", sesiones: 3, sesiones_friccion: 1 },
      ],
      HIRING_RADAR
    );
    expect(screens[0]).toMatchObject({ label: "Detalle de vacante", frictionPct: 40, frictionDeltaPp: 10, severity: "medium" });
    expect(screens[1].severity).toBe("critical");
    expect(health).toBe("red");
  });
});

describe("buildCompanies", () => {
  it("drops internal companies and puts the highest priority first", () => {
    const companies = buildCompanies([
      { empresa: "A", dead_clicks: 80 },
      { empresa: "UBITS demo", errores_no_404: 3 },
      { empresa: "B", errores_no_404: 1 },
    ]);
    expect(companies.map((c) => [c.name, c.priority])).toEqual([
      ["B", "Crítica"],
      ["A", "Media-alta"],
    ]);
  });
});
