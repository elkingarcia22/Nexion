import { describe, expect, it } from "vitest";
import { childPeriods, isoWeek, lastCompletedPeriod, periodContaining } from "./periods";

const d = (value: string) => new Date(`${value}T00:00:00Z`);

describe("isoWeek", () => {
  it("follows ISO rules at year boundaries", () => {
    expect(isoWeek(d("2026-09-30"))).toEqual({ year: 2026, week: 40 });
    expect(isoWeek(d("2027-01-01"))).toEqual({ year: 2026, week: 53 });
    expect(isoWeek(d("2025-12-29"))).toEqual({ year: 2026, week: 1 });
  });
});

describe("periodContaining", () => {
  it("builds each level's key, bounds and label", () => {
    expect(periodContaining("radar_semanal", d("2026-09-30"))).toMatchObject({
      key: "2026-W40",
      start: "2026-09-28",
      end: "2026-10-04",
      label: "Semana 40 · 28 sep – 4 oct 2026",
    });
    expect(periodContaining("pulso_quincenal", d("2026-09-30"))).toMatchObject({ key: "2026-W39-W40", start: "2026-09-21", end: "2026-10-04" });
    expect(periodContaining("mensual", d("2026-02-10"))).toMatchObject({ key: "2026-02", start: "2026-02-01", end: "2026-02-28" });
    expect(periodContaining("trimestral", d("2026-09-30"))).toMatchObject({ key: "2026-Q3", start: "2026-07-01", end: "2026-09-30" });
    expect(periodContaining("semestral", d("2026-09-30"))).toMatchObject({ key: "2026-H2", label: "Segundo semestre 2026" });
    expect(periodContaining("anual", d("2026-09-30"))).toMatchObject({ key: "2026", start: "2026-01-01", end: "2026-12-31" });
  });

  it("closes week 53 as a single-week pulse", () => {
    expect(periodContaining("pulso_quincenal", d("2026-12-30")).key).toBe("2026-W53");
  });
});

describe("lastCompletedPeriod", () => {
  it("reports on the previous period, in Bogotá time", () => {
    // Friday 2 Oct 2026, 8:00 Bogotá = 13:00 UTC: the weekly run reports on week 39.
    expect(lastCompletedPeriod("radar_semanal", new Date("2026-10-02T13:00:00Z")).key).toBe("2026-W39");
    // 1 Oct 2026 03:00 UTC is still 30 Sep in Bogotá: September has not closed yet.
    expect(lastCompletedPeriod("mensual", new Date("2026-10-01T03:00:00Z")).key).toBe("2026-08");
    expect(lastCompletedPeriod("mensual", new Date("2026-10-01T13:00:00Z")).key).toBe("2026-09");
    expect(lastCompletedPeriod("trimestral", new Date("2026-10-01T13:00:00Z")).key).toBe("2026-Q3");
    expect(lastCompletedPeriod("anual", new Date("2027-01-01T13:00:00Z")).key).toBe("2026");
  });
});

describe("childPeriods", () => {
  it("assigns each week to exactly one month (the one holding its Thursday)", () => {
    const september = periodContaining("mensual", d("2026-09-15"));
    const october = periodContaining("mensual", d("2026-10-15"));
    const sepWeeks = childPeriods(september, "radar_semanal").map((p) => p.key);
    const octWeeks = childPeriods(october, "radar_semanal").map((p) => p.key);
    // W40 runs 28 Sep – 4 Oct; its Thursday is 1 Oct, so it counts for October.
    expect(sepWeeks).toEqual(["2026-W36", "2026-W37", "2026-W38", "2026-W39"]);
    expect(octWeeks[0]).toBe("2026-W40");
    expect(sepWeeks.filter((k) => octWeeks.includes(k))).toEqual([]);
  });

  it("nests months in quarters and quarters in semesters and years", () => {
    const q3 = periodContaining("trimestral", d("2026-08-01"));
    expect(childPeriods(q3, "mensual").map((p) => p.key)).toEqual(["2026-07", "2026-08", "2026-09"]);
    const h2 = periodContaining("semestral", d("2026-08-01"));
    expect(childPeriods(h2, "trimestral").map((p) => p.key)).toEqual(["2026-Q3", "2026-Q4"]);
    const year = periodContaining("anual", d("2026-08-01"));
    expect(childPeriods(year, "trimestral")).toHaveLength(4);
  });
});
