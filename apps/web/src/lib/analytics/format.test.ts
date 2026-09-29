import { describe, expect, it } from "vitest";
import { formatDelta, formatKpiValue } from "./format";

describe("formatKpiValue", () => {
  it("formats each unit and missing values", () => {
    expect(formatKpiValue(1234.56)).toBe("1.234,6");
    expect(formatKpiValue(42.5, "pct")).toBe("42,5 %");
    expect(formatKpiValue(null)).toBe("—");
    expect(formatKpiValue(3, "days")).toBe("3 d");
  });
});

describe("formatDelta", () => {
  it("colors by direction: more users is good, more friction is bad", () => {
    expect(formatDelta({ delta: 12, unit: "count", higherIsBetter: true })).toEqual({ text: "+12", tone: "good" });
    expect(formatDelta({ delta: 5, unit: "count", higherIsBetter: false })).toEqual({ text: "+5", tone: "bad" });
    expect(formatDelta({ delta: -2.5, unit: "pct", higherIsBetter: true })).toEqual({ text: "−2,5 pp", tone: "bad" });
  });

  it("handles no change and unknown direction", () => {
    expect(formatDelta({ delta: 0, unit: "count" })).toEqual({ text: "= sin cambio", tone: "neutral" });
    expect(formatDelta({ delta: 3, unit: "count" })?.tone).toBe("neutral");
    expect(formatDelta({ delta: null, unit: "count" })).toBeNull();
  });
});
