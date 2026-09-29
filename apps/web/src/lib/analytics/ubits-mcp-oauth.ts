import { createHash, randomBytes } from "node:crypto";

/**
 * OAuth for ubits-mcp.com. The server has no static tokens: a person signs in with their Ubits
 * account (authorization code + PKCE, dynamic client registration) and Nexión keeps the token.
 */

export const UBITS_MCP_ISSUER = "https://ubits-mcp.com";
const METADATA_URL = `${UBITS_MCP_ISSUER}/.well-known/oauth-authorization-server`;
const SCOPE = "openid email profile";
const REQUEST_TIMEOUT_MS = 15_000;
/** Refresh or reconnect a bit before the real expiry so a long report run doesn't lose the session. */
const EXPIRY_MARGIN_MS = 2 * 60_000;

export interface OAuthMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
}

export interface StoredToken {
  access_token: string;
  refresh_token?: string;
  /** Epoch ms, or null when the server did not say. */
  expires_at: number | null;
  connected_by?: string;
  connected_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export function createState(): string {
  return randomBytes(24).toString("base64url");
}

export function buildAuthorizeUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
}): string {
  const url = new URL(params.authorizationEndpoint);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_challenge: params.challenge,
    code_challenge_method: "S256",
    state: params.state,
    scope: SCOPE,
    resource: UBITS_MCP_ISSUER,
  }).toString();
  return url.toString();
}

export function toStoredToken(response: TokenResponse, userId: string | undefined, now = Date.now()): StoredToken {
  return {
    access_token: response.access_token,
    ...(response.refresh_token ? { refresh_token: response.refresh_token } : {}),
    expires_at: response.expires_in ? now + response.expires_in * 1000 : null,
    ...(userId ? { connected_by: userId } : {}),
    connected_at: new Date(now).toISOString(),
  };
}

/** Saved value is JSON; a plain string (older manual token) is read as a token without expiry. */
export function parseStoredToken(value: string): StoredToken {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.access_token === "string") return { expires_at: null, ...parsed };
  } catch {
    // not JSON: legacy plain token
  }
  return { access_token: value, expires_at: null };
}

export function isTokenUsable(token: StoredToken, now = Date.now()): boolean {
  return token.expires_at === null || token.expires_at - EXPIRY_MARGIN_MS > now;
}

async function postJsonOrForm(url: string, body: Record<string, string> | object, form: boolean): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json", Accept: "application/json" },
    body: form ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const detail = json.error_description ?? json.error ?? `HTTP ${response.status}`;
    throw new Error(`ubits-mcp.com respondió: ${String(detail)}`);
  }
  return json;
}

export async function fetchOAuthMetadata(): Promise<OAuthMetadata> {
  const response = await fetch(METADATA_URL, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`No se pudo leer la configuración OAuth de ubits-mcp.com (HTTP ${response.status}).`);
  return (await response.json()) as OAuthMetadata;
}

/** Registers Nexión as a public OAuth client for this redirect URI and returns its client_id. */
export async function registerClient(metadata: OAuthMetadata, redirectUri: string): Promise<string> {
  const json = await postJsonOrForm(
    metadata.registration_endpoint,
    {
      client_name: "Nexión",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
    },
    false
  );
  if (typeof json.client_id !== "string") throw new Error("ubits-mcp.com no devolvió un client_id al registrar Nexión.");
  return json.client_id;
}

export async function exchangeCode(
  metadata: OAuthMetadata,
  params: { clientId: string; code: string; verifier: string; redirectUri: string }
): Promise<TokenResponse> {
  const json = await postJsonOrForm(
    metadata.token_endpoint,
    {
      grant_type: "authorization_code",
      client_id: params.clientId,
      code: params.code,
      code_verifier: params.verifier,
      redirect_uri: params.redirectUri,
      resource: UBITS_MCP_ISSUER,
    },
    true
  );
  if (typeof json.access_token !== "string") throw new Error("ubits-mcp.com no devolvió un access_token.");
  return json as unknown as TokenResponse;
}

export async function refreshToken(metadata: OAuthMetadata, clientId: string, refresh: string): Promise<TokenResponse> {
  const json = await postJsonOrForm(
    metadata.token_endpoint,
    { grant_type: "refresh_token", client_id: clientId, refresh_token: refresh, resource: UBITS_MCP_ISSUER },
    true
  );
  if (typeof json.access_token !== "string") throw new Error("ubits-mcp.com no devolvió un access_token al renovar.");
  return json as unknown as TokenResponse;
}
