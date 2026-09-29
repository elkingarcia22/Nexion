import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyGoogleOAuthClient } from "./google-oauth";

function googleReply(body: object) {
  return new Response(JSON.stringify(body), { status: 400 });
}

afterEach(() => vi.unstubAllGlobals());

describe("verifyGoogleOAuthClient", () => {
  it("accepts a client when Google only rejects the bogus refresh token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(googleReply({ error: "invalid_grant" })));
    expect(await verifyGoogleOAuthClient("1-a.apps.googleusercontent.com", "GOCSPX-secret")).toBeNull();
  });

  it("rejects a wrong client ID or secret", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(googleReply({ error: "invalid_client" })));
    expect(await verifyGoogleOAuthClient("1-a.apps.googleusercontent.com", "wrong")).toMatch(/rechazó/);
  });

  it("surfaces unexpected answers instead of accepting them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(googleReply({ error: "server_error", error_description: "boom" })));
    expect(await verifyGoogleOAuthClient("1-a.apps.googleusercontent.com", "x")).toMatch(/boom/);
  });
});
