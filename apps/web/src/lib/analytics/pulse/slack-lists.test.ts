import { describe, expect, it } from "vitest";
import { periodContaining } from "../periods";
import { casesSection } from "./message";
import { parseCsv, summarizeCases, toCases } from "./slack-lists";
import { pulseWindow } from "./sql";

const TALENT = [
  'Cliente,Completado,Caso,Producto,Tipo,Estado,"Persona asignada","Fecha del caso","Fecha de vencimiento",Equipo',
  'Murguia,true,"Descargar reportería, detallada",Objetivos,"Sin Ticket",Resuelto,alguien@ubits.co,2026-09-08,,Talent',
  'Tecniseguros,false,"Bug ""líder"" no ve reporte",Objetivos,Ticket,"PDTE - Talent",,2026-09-10,,Talent',
  "Acme,false,Encuesta no envía,Encuestas,Ticket,Pendiente,,2026-09-11,,Talent",
].join("\n");

const HIRING = ['Cliente,Completed,Assignee,"Due Date",Caso,Específico,Tipo,Fecha,Estado,Prioridad', '"Grupo Tiendas",false,,,Requisición,"Optimizar tiempos",Feedback,2026-06-18,Pendiente,5', "Beta,false,,,Agente,Detalle,Ticket,2026-06-20,Resuleto,2"].join("\n");

describe("parseCsv", () => {
  it("handles quoted commas and doubled quotes", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
});

describe("toCases", () => {
  it("filters by product and never reads assignee e-mails", () => {
    const cases = toCases(TALENT, "Objetivos");
    expect(cases.map((c) => [c.client, c.resolved])).toEqual([["Murguia", true], ["Tecniseguros", false]]);
    expect(cases[1].title).toBe('Bug "líder" no ve reporte');
    expect(JSON.stringify(cases)).not.toContain("@ubits.co");
  });

  it("reads the Hiring list's column names (Completed, Específico, Fecha, Prioridad)", () => {
    const cases = toCases(HIRING);
    expect(cases[0]).toMatchObject({ client: "Grupo Tiendas", detail: "Optimizar tiempos", type: "Feedback", date: "2026-06-18", priority: 5, resolved: false });
    expect(cases[1].resolved).toBe(true); // "Resuleto" typo in the list
  });
});

describe("summarizeCases", () => {
  const window = pulseWindow(periodContaining("pulso_quincenal", new Date("2026-09-15T00:00:00Z")));

  it("counts the period and ranks pending cases by priority", () => {
    const summary = summarizeCases(toCases(TALENT), window);
    expect(summary).toMatchObject({ latestDate: "2026-09-11", createdInPeriod: 3, resolvedInPeriod: 1, pending: 2 });
    expect(summary.byType).toEqual({ "Sin Ticket": 1, Ticket: 2 });
  });

  it("warns in the message when the list is stale", () => {
    const stale = summarizeCases(toCases(HIRING), window);
    expect(casesSection(stale, window.end)).toContain("La lista no se actualiza desde el 2026-06-20");
    expect(casesSection(summarizeCases(toCases(TALENT), window), window.end)).not.toContain("no se actualiza");
  });
});
