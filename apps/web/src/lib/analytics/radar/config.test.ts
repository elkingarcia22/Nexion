import { describe, expect, it } from "vitest";
import { screenLabel } from "./config";
import { HIRING_RADAR } from "./products/hiring";

describe("screenLabel", () => {
  it("names known screens and keeps exact entries from swallowing sub-screens", () => {
    expect(screenLabel(HIRING_RADAR, "/recruitment")).toBe("Inicio de Hiring");
    expect(screenLabel(HIRING_RADAR, "/recruitment/job/dashboard")).toBe("Dashboard de vacantes");
    expect(screenLabel(HIRING_RADAR, "/recruitment/job/dashboard/:id")).toBe("Dashboard de vacantes · Carpeta");
    expect(screenLabel(HIRING_RADAR, "/recruitment/workflows/workflowdetail/:id")).toBe("Detalle de workflow");
    expect(screenLabel(HIRING_RADAR, "/recruitment/nueva-pantalla")).toBe("/recruitment/nueva-pantalla");
    expect(screenLabel(HIRING_RADAR, "/")).toBe("Inicio de la plataforma");
    expect(screenLabel(HIRING_RADAR, "/recruitment/job/dashboard/undefined")).toBe("Ruta inválida (/recruitment/job/dashboard/undefined)");
  });
});
