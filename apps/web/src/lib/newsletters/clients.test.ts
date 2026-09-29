import { afterEach, describe, expect, it, vi } from "vitest";
import { postToSlack, verifySlackToken } from "./clients";

function slackReply(body: object, scopes = "") {
  return new Response(JSON.stringify(body), { headers: { "x-oauth-scopes": scopes } });
}

afterEach(() => vi.unstubAllGlobals());

describe("verifySlackToken", () => {
  it("accepts a token that can post messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(slackReply({ ok: true, team: "Ubits", user: "nexion" }, "channels:read, chat:write")));
    expect(await verifySlackToken("xoxb-test")).toEqual({ ok: true, team: "Ubits", bot: "nexion" });
  });

  it("rejects a valid token that lacks chat:write and explains how to fix it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(slackReply({ ok: true, team: "Ubits", user: "nexion" }, "channels:read,groups:read")));
    const result = await verifySlackToken("xoxb-test");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("chat:write");
  });

  it("rejects a revoked or invalid token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(slackReply({ ok: false, error: "invalid_auth" })));
    const result = await verifySlackToken("xoxb-bad");
    expect(result).toEqual({ ok: false, error: "El token de Slack es inválido o fue revocado." });
  });
});

describe("postToSlack", () => {
  it("returns the message timestamp and sends the given token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(slackReply({ ok: true, ts: "1759.001" }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await postToSlack("C123", "hola", "xoxb-abc")).toBe("1759.001");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer xoxb-abc");
  });

  it("turns not_in_channel into an actionable message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(slackReply({ ok: false, error: "not_in_channel" })));
    await expect(postToSlack("C123", "hola", "xoxb-abc")).rejects.toThrow(/invite/);
  });
});
