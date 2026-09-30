import { describe, expect, it } from "vitest";
import { periodContaining } from "../periods";
import { PULSE_CONFIGS } from "./config";
import { okrSection } from "./message";
import { parseFeedback, parseOkrs, parsePercent, parseSheetDate, pickQuarterTab } from "./sheets";
import { pulseWindow } from "./sql";

const objetivos = PULSE_CONFIGS.objetivos;

const OKR_VALUES = [
  ["OKRs Tecnología 2026"],
  ["", "  Squad", "Objetivo", "¿Porqué el objetivo es esencial para la compañía?", "Key Result", "Tipo", "Peso", "Avance", "Resultado"],
  ["Talent", "Talent Growth", "Aumentar el engagement del producto Objetivos", "Retención", "Lograr 70 empresas con criterio NSM en el módulo de Objetivos\nDetalle largo del KR", "Negocio", "50%", "60%", ""],
  ["", "", "", "", "Reducir tickets de carga de exceles a 2 por mes", "Estabilidad", "30%", "0,2", ""],
  ["", "", "", "", "Generar $X en nuevo ARR del producto Objetivos", "Negocio", "20%", "", ""],
  ["", "", "", "", "Lograr el 100% de los objetivos del equipo Core", "Equipo", "10%", "0%", ""],
  ["", "Encuestas", "Mejorar encuestas", "", "Lanzar NOM035", "Producto", "100%", "90%", ""],
];

describe("parseOkrs", () => {
  it("forward-fills merged cells, keeps the product's KRs and weights progress over defined targets", () => {
    const okrs = parseOkrs(OKR_VALUES, "Q3", objetivos.okrTerms);
    expect(okrs.keyResults.map((kr) => kr.keyResult)).toEqual([
      "Lograr 70 empresas con criterio NSM en el módulo de Objetivos\nDetalle largo del KR",
      "Reducir tickets de carga de exceles a 2 por mes",
      "Generar $X en nuevo ARR del producto Objetivos",
    ]);
    expect(okrs.keyResults[1]).toMatchObject({ squad: "Talent Growth", weight: 30, progressPct: 20 });
    expect(okrs.withoutTarget).toBe(1);
    // (50·60 + 30·20) / 80 = 45
    expect(okrs.weightedProgressPct).toBe(45);
    expect(okrs.mostAdvanced?.progressPct).toBe(60);
    expect(okrs.biggestGap?.progressPct).toBe(20);
    const section = okrSection({ okrs, feedback: null });
    expect(section).toContain("Avance ponderado (Q3): *45,0%*");
    expect(section).toContain("Más avanzado: Lograr 70 empresas con criterio NSM en el módulo de Objetivos (60,0%)");
  });
});

describe("sheet helpers", () => {
  it("parses percents, dates and the quarter tab", () => {
    expect([parsePercent("45%"), parsePercent("0,45"), parsePercent("45"), parsePercent("")]).toEqual([45, 45, 45, null]);
    expect([parseSheetDate("05/09/2026"), parseSheetDate("2026-09-05T00:00"), parseSheetDate("pronto")]).toEqual(["2026-09-05", "2026-09-05", null]);
    expect(pickQuarterTab(["Q1", "Q2", "Q3", "Resumen"], "2026-09-20")).toBe("Q3");
    expect(pickQuarterTab(["Q1 2026", "Q2 2026"], "2026-09-20")).toBe("Q2 2026");
    expect(pickQuarterTab(["Resumen"], "2026-09-20")).toBeNull();
  });
});

describe("parseFeedback", () => {
  const w = pulseWindow(periodContaining("pulso_quincenal", new Date("2026-09-15T00:00:00Z")));
  const values = [
    ["Fecha", "Producto(s)", "Explicación de la necesidad", "¿Hecho?", "Categoría ", "Tipo", "Dolor del cliente", "Cliente"],
    ["10/09/2026", "Objetivos", "Carga masiva con errores", "No", "Carga masiva", "Mejora", "Alto", "Acme"],
    ["12/09/2026", "Objetivos, Encuestas", "Reporte por área", "Sí", "Reportería", "Mejora", "Medio", "Beta"],
    ["", "Objetivos", "Permisos por líder", "", "Usuarios", "Mejora", "Bajo", "Gamma"],
    ["11/09/2026", "Encuestas", "Plantillas", "", "", "", "Alto", "Delta"],
  ];

  it("keeps the product's needs and ranks open ones by pain", () => {
    const feedback = parseFeedback(values, objetivos.feedbackTerms, w);
    expect(feedback).toMatchObject({ inPeriod: 2, openInPeriod: 1, resolvedInPeriod: 1, undatedOpen: 1 });
    expect(feedback.top.map((item) => item.client)).toEqual(["Acme", "Gamma"]);
  });
});
