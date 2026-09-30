import { describe, expect, it } from "vitest";
import { periodContaining } from "../periods";
import { PULSE_CONFIGS } from "./config";
import { ticketsForProduct, type TaggedTicket } from "./jira";
import { buildPulseMessage } from "./message";
import { buildPulseData, pulseHealth, toCompanyChanges, toMonth, toProfitability } from "./metrics";
import { pulseKpis } from "./report-data";
import { monthlySummarySql, pulseWindow } from "./sql";

const objetivos = PULSE_CONFIGS.objetivos;
const pulse = (date: string) => periodContaining("pulso_quincenal", new Date(`${date}T00:00:00Z`));

describe("pulseWindow", () => {
  it("reports the month of the close once it is half way through", () => {
    const w = pulseWindow(pulse("2026-09-15")); // 7 – 20 sep
    expect(w).toMatchObject({ month: "2026-09-01", previousMonth: "2026-08-01", monthIsPartial: true, previousStart: "2026-08-24", previousEnd: "2026-09-06" });
  });

  it("falls back to the previous full month early in a month", () => {
    const w = pulseWindow(pulse("2026-09-28")); // 21 sep – 4 oct
    expect(w).toMatchObject({ month: "2026-09-01", monthIsPartial: false });
  });
});

describe("monthlySummarySql", () => {
  it("queries the product table for both months with its usage rule and activity", () => {
    const sql = monthlySummarySql(objetivos, pulseWindow(pulse("2026-09-15")));
    expect(sql).toContain("`data-mart-cs.product_metrics.goals_usability_history`");
    expect(sql).toContain("IF(usuarios_con_objetivos_unicos_mes > 0, id_empresa, NULL)");
    expect(sql).toContain("SUM(ciclos_nuevos_mes) AS new_cycles");
    expect(sql).toContain("DATE '2026-09-01', DATE '2026-08-01'");
  });
});

const row = (mes: string, values: Record<string, number>) => ({ mes, empresas_contratadas: 100, empresas_con_uso: 40, empresas_nsm: 20, empresas_en_riesgo: 2, ...values });

describe("metrics", () => {
  it("builds months, profitability and company buckets", () => {
    expect(toMonth(row("2026-09-01", { users_with_goals: 7 }), objetivos)).toMatchObject({ usagePct: 40, nsmPct: 20, activity: { users_with_goals: 7, new_cycles: 0 } });
    expect(toProfitability([{ mes: "2026-09-01", arr_acumulado: 50, gasto_acumulado: 200 }])).toMatchObject({ recoveryPct: 25, balance: -150 });
    expect(toProfitability([{ mes: "2026-09-01", arr_acumulado: 50, gasto_acumulado: 0 }])?.recoveryPct).toBeNull();
    const companies = toCompanyChanges([
      { empresa: "A", cambio: "perdio_nsm", arr: 10, con_uso: 0 },
      { empresa: "B", cambio: "nueva" },
      { empresa: "C", cambio: "gano_nsm", con_uso: 1 },
    ]);
    expect([companies.lostNsm.length, companies.gainedNsm[0].usedThisMonth, companies.newlyContracted]).toEqual([1, true, 1]);
  });

  it("goes red when NSM companies fall by 3 or more, yellow on any drop", () => {
    const prev = toMonth(row("2026-08-01", { empresas_nsm: 20 }), objetivos);
    expect(pulseHealth(toMonth(row("2026-09-01", { empresas_nsm: 17 }), objetivos), prev, null)).toBe("red");
    expect(pulseHealth(toMonth(row("2026-09-01", { empresas_nsm: 19 }), objetivos), prev, null)).toBe("yellow");
    expect(pulseHealth(toMonth(row("2026-09-01", { empresas_nsm: 21, empresas_en_riesgo: 1 }), objetivos), prev, null)).toBe("green");
  });
});

describe("ticketsForProduct", () => {
  const ticket = (key: string, summary: string, done: boolean, created: string, updated = created): TaggedTicket => ({
    key, summary, status: done ? "Finalizada" : "En curso", done, priority: null, created, updated, url: `https://jira/browse/${key}`, searchText: summary.toLowerCase(),
  });

  it("keeps the product's tickets and splits them by state and window", () => {
    const w = pulseWindow(pulse("2026-09-15"));
    const tickets = ticketsForProduct(
      [
        ticket("PTG-1", "Error en cargue de objetivos", false, "2026-09-10"),
        ticket("PTG-2", "Ciclo de objetivos no cierra", true, "2026-08-01", "2026-09-12"),
        ticket("PTG-3", "Error 400 al crear una encuesta", false, "2026-09-10"),
        ticket("PTG-4", "Objetivos y encuesta de clima", false, "2026-08-25"),
      ],
      objetivos,
      w
    );
    expect(tickets.active.map((t) => t.key)).toEqual(["PTG-1", "PTG-4"]);
    expect(tickets.resolvedInPeriod.map((t) => t.key)).toEqual(["PTG-2"]);
    expect([tickets.createdInPeriod, tickets.createdPrevious]).toEqual([1, 1]);
    expect(tickets.active[0]).not.toHaveProperty("searchText");
  });
});

describe("buildPulseMessage", () => {
  it("renders a complete pulse without the AI reading", () => {
    const period = pulse("2026-09-15");
    const window = pulseWindow(period);
    const data = buildPulseData(objetivos, period, window, {
      summary: [row("2026-09-01", { arr_producto: 118415, users_with_goals: 1509 }), row("2026-08-01", { empresas_nsm: 22 })],
      companies: [{ empresa: "Grupo ILP", cambio: "en_riesgo", riesgo: "Riesgo 1 mes de vencerse", arr: 120.2, con_uso: 0 }],
      newArr: [{ periodo: "actual", nuevo_arr: 554.86, negocios: 7 }],
      profitability: [{ mes: "2026-09-01", arr_acumulado: 127488.6, gasto_acumulado: 237672.96 }],
      tickets: null,
    });
    expect(data).not.toBeNull();
    const message = buildPulseMessage(data!, objetivos, null, data!.health, undefined);
    expect(message).toContain("*OBJETIVOS · PULSO QUINCENAL*");
    expect(message).toContain("Empresas con criterio NSM: *20* (20,0%) :red_circle: ▼ -2");
    expect(message).toContain("• *Grupo ILP* · US$120 · riesgo 1 mes de vencerse · sin uso este mes");
    expect(message).toContain("balance -US$110.184");
    expect(message).not.toMatch(/undefined|NaN|\[object Object\]/);
    expect(pulseKpis(data!, objetivos).find((k) => k.key === "nsm_companies")).toMatchObject({ value: 20, delta: -2 });
  });

  it("returns null when BigQuery has no row for the month", () => {
    const period = pulse("2026-09-15");
    expect(buildPulseData(objetivos, period, pulseWindow(period), { summary: [], companies: [], newArr: [], profitability: [], tickets: null })).toBeNull();
  });
});
