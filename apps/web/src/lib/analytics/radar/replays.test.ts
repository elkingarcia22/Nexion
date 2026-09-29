import { afterEach, describe, expect, it, vi } from "vitest";
import { HIRING_RADAR } from "./products/hiring";
import { pickVaried, selectReplays, toCandidates } from "./replays";

afterEach(() => vi.unstubAllGlobals());

const row = (session_id: string, empresa: string, extra: Record<string, unknown> = {}) => ({
  session_id,
  empresa,
  inicio: "2026-09-22T10:00:00Z",
  pantallas: 4,
  recorrido: ["/recruitment/job/detail"],
  ...extra,
});

describe("toCandidates", () => {
  it("classifies by the first matching rule and drops internal companies", () => {
    const candidates = toCandidates(
      [
        row("s1", "A", { errores_no_404: 1 }),
        row("s2", "B", { recorrido: ["/recruitment/job/dashboard/undefined"] }),
        row("s3", "C", { rage_clicks: 6, recorrido: ["/recruitment/job/create/publish"] }),
        row("s4", "Comercial Ubits", { rage_clicks: 9 }),
      ],
      HIRING_RADAR
    );
    expect(candidates.map((c) => c.category)).toEqual(["error_no_404", "ruta_invalida", "rage_clicks_creacion"]);
  });
});

describe("pickVaried", () => {
  it("takes one of each category first and respects the company cap", () => {
    const items = [
      { id: 1, company: "A", category: "x", score: 90, categoryPriority: 1 },
      { id: 2, company: "A", category: "x", score: 80, categoryPriority: 1 },
      { id: 3, company: "B", category: "y", score: 10, categoryPriority: 2 },
    ];
    expect(pickVaried(items, 2, 1, 5).map((i) => i.id)).toEqual([1, 3]);
  });
});

describe("selectReplays", () => {
  it("keeps only recordings PostHog still has, one per company", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("s2")
          ? new Response("{}", { status: 404 })
          : new Response(JSON.stringify({ id: "x", recording_duration: 900, active_seconds: 600, console_error_count: 2, expiry_time: "2026-10-01T00:00:00Z" }), { status: 200 })
      )
    );
    const replays = await selectReplays(
      [row("s1", "A", { errores_no_404: 2 }), row("s2", "B", { rage_clicks: 9 }), row("s3", "A", { dead_clicks: 60 })],
      HIRING_RADAR,
      "key",
      Date.parse("2026-09-28T00:00:00Z")
    );
    expect(replays.map((r) => [r.sessionId, r.priority, r.activeMinutes, r.daysUntilExpiry])).toEqual([["s1", "Crítica", 10, 3]]);
    expect(replays[0].url).toBe("https://us.posthog.com/project/202852/replay/s1");
  });
});
