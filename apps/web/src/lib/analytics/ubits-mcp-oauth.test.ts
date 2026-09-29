import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAuthorizeUrl, createPkcePair, isTokenUsable, parseStoredToken, toStoredToken } from "./ubits-mcp-oauth";

describe("createPkcePair", () => {
  it("derives an S256 challenge from a url-safe verifier", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,}$/);
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });
});

describe("buildAuthorizeUrl", () => {
  it("asks for a code with PKCE and the openid scopes", () => {
    const url = new URL(
      buildAuthorizeUrl({
        authorizationEndpoint: "https://ubits-mcp.com/authorize",
        clientId: "abc",
        redirectUri: "https://nexion.app/api/settings/ubits-mcp/callback",
        challenge: "xyz",
        state: "s1",
      })
    );
    expect(url.origin + url.pathname).toBe("https://ubits-mcp.com/authorize");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      response_type: "code",
      client_id: "abc",
      code_challenge: "xyz",
      code_challenge_method: "S256",
      state: "s1",
      scope: "openid email profile",
      resource: "https://ubits-mcp.com",
    });
  });
});

describe("stored token", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");

  it("turns a token response into an absolute expiry", () => {
    const stored = toStoredToken({ access_token: "a", refresh_token: "r", expires_in: 3600 }, "u1", now);
    expect(stored).toMatchObject({ access_token: "a", refresh_token: "r", connected_by: "u1" });
    expect(stored.expires_at).toBe(now + 3600_000);
  });

  it("reads JSON and legacy plain tokens", () => {
    expect(parseStoredToken(JSON.stringify({ access_token: "a", expires_at: 5 }))).toMatchObject({ access_token: "a", expires_at: 5 });
    expect(parseStoredToken("plain-token-value")).toEqual({ access_token: "plain-token-value", expires_at: null });
    expect(parseStoredToken("{broken")).toEqual({ access_token: "{broken", expires_at: null });
  });

  it("treats tokens close to expiry as unusable", () => {
    expect(isTokenUsable({ access_token: "a", expires_at: null }, now)).toBe(true);
    expect(isTokenUsable({ access_token: "a", expires_at: now + 10 * 60_000 }, now)).toBe(true);
    expect(isTokenUsable({ access_token: "a", expires_at: now + 30_000 }, now)).toBe(false);
  });
});
