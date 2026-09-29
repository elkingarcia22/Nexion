import { describe, expect, it } from "vitest";
import type { AnalyticsAction } from "../types";
import { planActions } from "./actions";
import type { RadarAction } from "./types";

const action = (signalKey: string, extra: Partial<RadarAction> = {}): RadarAction => ({
  signalKey,
  title: `Acción ${signalKey}`,
  evidence: "dato",
  nextStep: "entregable",
  owner: "engineering",
  ...extra,
});

const stored = (action_key: string, status: AnalyticsAction["status"]): AnalyticsAction => ({
  id: action_key,
  product_id: "hiring",
  action_key,
  title: action_key,
  detail: null,
  origin_report_id: null,
  origin_period_key: "2026-W38",
  status,
  result: null,
  owner: null,
  created_at: "",
  closed_at: null,
});

describe("planActions", () => {
  it("continues open actions by signal and creates the rest", () => {
    const plan = planActions([action("detail_audit"), action("new_signal")], [stored("detail_audit", "in_progress")], "2026-W39");
    expect(plan.continuedKeys).toEqual(["detail_audit"]);
    expect(plan.actions[0].continuesActionKey).toBe("detail_audit");
    expect(plan.created.map((a) => a.action_key)).toEqual(["new_signal"]);
    expect(plan.created[0].detail).toBe("dato · entregable");
  });

  it("gives a closed signal that comes back a period-suffixed key", () => {
    const plan = planActions([action("detail_audit")], [stored("detail_audit", "done")], "2026-W39");
    expect(plan.created.map((a) => a.action_key)).toEqual(["detail_audit@2026-W39"]);
    expect(plan.actions[0].continuesActionKey).toBeUndefined();
  });

  it("ignores a continuation key that is not open and never continues twice", () => {
    const plan = planActions(
      [action("a", { continuesActionKey: "ghost" }), action("b", { continuesActionKey: "b" }), action("b2", { continuesActionKey: "b" })],
      [stored("b", "open")],
      "2026-W39"
    );
    expect(plan.created.map((a) => a.action_key)).toEqual(["a"]);
    expect(plan.continuedKeys).toEqual(["b"]);
    expect(plan.actions).toHaveLength(2);
  });
});
