import { describe, expect, it } from "vitest";
import { periodContaining } from "../periods";
import type { AnalyticsAction, AnalyticsReport } from "../types";
import { seriesLine, shortLabel } from "./message";
import { expectedChildren, previousPeriod, rollupWindow } from "./periods";
import { persistentFriction, reviewActions, toSeriesPoint } from "./series";

const period = (type: Parameters<typeof periodContaining>[0], date: string) => periodContaining(type, new Date(`${date}T00:00:00Z`));

describe("rollup periods", () => {
  it("compares with the previous period of the same level and closes on the last month", () => {
    const q3 = period("trimestral", "2026-08-15");
    expect(previousPeriod(q3).key).toBe("2026-Q2");
    const closed = rollupWindow(q3, new Date("2026-10-01T15:00:00Z"));
    expect(closed).toMatchObject({ partial: false, closeMonth: "2026-09-01", previousCloseMonth: "2026-06-01" });
    expect(closed.posthogRange).toEqual({ previousStart: "2026-04-01", start: "2026-07-01", end: "2026-10-01" });
    const open = rollupWindow(q3, new Date("2026-08-20T15:00:00Z"));
    expect(open).toMatchObject({ partial: true, closeMonth: "2026-08-01" });
  });

  it("expects weeks and pulses for a month, only the enabled ones", () => {
    const september = period("mensual", "2026-09-10");
    const children = expectedChildren(september, "mensual", ["radar_semanal", "pulso_quincenal", "mensual"]);
    expect(children.map((c) => [c.type, c.periods.map((p) => p.key)])).toEqual([
      ["radar_semanal", ["2026-W36", "2026-W37", "2026-W38", "2026-W39"]],
      ["pulso_quincenal", ["2026-W35-W36", "2026-W37-W38"]],
    ]);
    expect(expectedChildren(september, "mensual", ["pulso_quincenal"]).map((c) => c.type)).toEqual(["pulso_quincenal"]);
  });
});

const report = (type: AnalyticsReport["report_type"], key: string, start: string, kpis: Record<string, number>, friction: Array<[string, number]> = []): AnalyticsReport =>
  ({
    id: key,
    product_id: "hiring",
    report_type: type,
    period_key: key,
    period_start: start,
    period_end: start,
    status: "published",
    health: "yellow",
    data: {
      kpis: Object.entries(kpis).map(([k, value]) => ({ key: k, label: k, value })),
      datasets: [{ key: "friction", title: "", columns: [], rows: friction.map(([label, value]) => ({ label, friction: value })) }],
    },
    coverage: {},
    analysis: null,
    message: null,
    child_report_ids: [],
    error: null,
    model: null,
    slack_ts: null,
    trigger: "cron",
    created_at: "",
  }) as AnalyticsReport;

describe("series", () => {
  const weeks = [
    report("radar_semanal", "2026-W37", "2026-09-07", { active_users: 41, ignored: 1 }, [["Detalle", 40], ["Dashboard", 10]]),
    report("radar_semanal", "2026-W38", "2026-09-14", { active_users: 45 }, [["Detalle", 50], ["Configuración", 30]]),
  ];

  it("keeps the series KPIs and prints compact labels", () => {
    const points = weeks.map(toSeriesPoint);
    expect(points[0].kpis).toEqual({ active_users: 41 });
    expect(seriesLine(points, "radar_semanal", "active_users", (v) => String(v))).toBe("S37: 41 → S38: 45");
    expect([shortLabel({ type: "pulso_quincenal", periodKey: "2026-W37-W38" }), shortLabel({ type: "mensual", periodKey: "2026-09" }), shortLabel({ type: "trimestral", periodKey: "2026-Q3" })]).toEqual(["S37-38", "sep", "T3"]);
  });

  it("flags screens that repeat among the top friction", () => {
    expect(persistentFriction(weeks)).toEqual([{ label: "Detalle", appearances: 2, averageFrictionPct: 45 }]);
  });
});

describe("reviewActions", () => {
  const action = (key: string, status: AnalyticsAction["status"], created_at: string, closed_at: string | null, result: string | null = null): AnalyticsAction => ({
    id: key, product_id: "hiring", action_key: key, title: key, detail: null, origin_report_id: null, origin_period_key: "2026-W36", status, result, owner: null, created_at, closed_at,
  });

  it("classifies actions created, closed and still open in the period", () => {
    const review = reviewActions(
      [
        action("a", "done", "2026-08-20T10:00:00Z", "2026-09-10T10:00:00Z"),
        action("b", "dropped", "2026-09-02T10:00:00Z", "2026-09-20T10:00:00Z", "No aplica"),
        action("c", "open", "2026-09-05T10:00:00Z", null),
        action("d", "in_progress", "2026-10-05T10:00:00Z", null),
      ],
      "2026-09-01",
      "2026-09-30"
    );
    expect(review.createdInPeriod).toBe(2);
    expect(review.closedInPeriod.map((c) => c.title)).toEqual(["a", "b"]);
    expect(review.openAtClose.map((c) => c.action_key)).toEqual(["c"]);
    expect(review.closedWithoutResult).toBe(1);
  });
});
