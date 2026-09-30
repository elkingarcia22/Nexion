import type { SupabaseClient } from "@supabase/supabase-js";
import { getSecret, readJsonSecret, saveJsonSecret, UBITS_MCP_CLIENT_SECRET, UBITS_MCP_PENDING_SECRET, UBITS_MCP_TOKEN_SECRET } from "@/lib/secrets";
import {
  buildAuthorizeUrl,
  createPkcePair,
  createState,
  exchangeCode,
  fetchOAuthMetadata,
  isTokenUsable,
  parseStoredToken,
  refreshToken,
  registerClient,
  toStoredToken,
  type StoredToken,
} from "./ubits-mcp-oauth";
import { verifyUbitsMcpToken } from "./ubits-mcp";

/** A sign-in started in Configuración must come back within this window. */
const PENDING_MAX_AGE_MS = 10 * 60_000;

interface RegisteredClient {
  client_id: string;
  redirect_uri: string;
}

interface PendingConnection {
  state: string;
  verifier: string;
  user_id: string;
  client_id: string;
  redirect_uri: string;
  created_at: number;
}

export interface McpConnectionStatus {
  connected: boolean;
  expiresAt: string | null;
  canRefresh: boolean;
  expired: boolean;
  connectedAt: string | null;
  usingEnvFallback: boolean;
}

/** One registered client per redirect URI (localhost and production get their own). */
async function ensureClient(db: SupabaseClient, redirectUri: string): Promise<string> {
  const saved = await readJsonSecret<RegisteredClient>(db, UBITS_MCP_CLIENT_SECRET);
  if (saved?.redirect_uri === redirectUri) return saved.client_id;

  const clientId = await registerClient(await fetchOAuthMetadata(), redirectUri);
  await saveJsonSecret(db, UBITS_MCP_CLIENT_SECRET, { client_id: clientId, redirect_uri: redirectUri });
  return clientId;
}

/** Starts the Ubits sign-in: returns the URL the browser must open. */
export async function startUbitsMcpConnection(db: SupabaseClient, userId: string, redirectUri: string): Promise<string> {
  const [metadata, clientId] = await Promise.all([fetchOAuthMetadata(), ensureClient(db, redirectUri)]);
  const { verifier, challenge } = createPkcePair();
  const state = createState();
  const pending: PendingConnection = { state, verifier, user_id: userId, client_id: clientId, redirect_uri: redirectUri, created_at: Date.now() };
  await saveJsonSecret(db, UBITS_MCP_PENDING_SECRET, pending, userId);
  return buildAuthorizeUrl({ authorizationEndpoint: metadata.authorization_endpoint, clientId, redirectUri, challenge, state });
}

/** Finishes the sign-in from the OAuth callback. Throws a user-facing message on any problem. */
export async function completeUbitsMcpConnection(db: SupabaseClient, code: string, state: string): Promise<void> {
  const pending = await readJsonSecret<PendingConnection>(db, UBITS_MCP_PENDING_SECRET);
  if (!pending || pending.state !== state) throw new Error("La conexión no coincide con la que se inició. Vuelve a intentarlo desde Configuración.");
  await db.from("app_secrets").delete().eq("name", UBITS_MCP_PENDING_SECRET);
  if (Date.now() - pending.created_at > PENDING_MAX_AGE_MS) throw new Error("El inicio de sesión tardó demasiado. Vuelve a intentarlo.");

  const response = await exchangeCode(await fetchOAuthMetadata(), {
    clientId: pending.client_id,
    code,
    verifier: pending.verifier,
    redirectUri: pending.redirect_uri,
  });
  const rejection = await verifyUbitsMcpToken(response.access_token);
  if (rejection) throw new Error(rejection);
  await saveJsonSecret(db, UBITS_MCP_TOKEN_SECRET, toStoredToken(response, pending.user_id), pending.user_id);
}

export async function getUbitsMcpStatus(db: SupabaseClient): Promise<McpConnectionStatus> {
  const value = await getSecret(db, UBITS_MCP_TOKEN_SECRET);
  const token = value ? parseStoredToken(value) : null;
  return {
    connected: Boolean(token),
    expiresAt: token?.expires_at ? new Date(token.expires_at).toISOString() : null,
    canRefresh: Boolean(token?.refresh_token),
    expired: token ? !isTokenUsable(token) && !token.refresh_token : false,
    connectedAt: token?.connected_at ?? null,
    usingEnvFallback: !token && Boolean(process.env.UBITS_MCP_TOKEN),
  };
}

export async function disconnectUbitsMcp(db: SupabaseClient): Promise<void> {
  const { error } = await db.from("app_secrets").delete().in("name", [UBITS_MCP_TOKEN_SECRET, UBITS_MCP_PENDING_SECRET]);
  if (error) throw new Error(error.message);
}

/**
 * Access token for report pipelines (service-role client). Renews it when the server gave a
 * refresh token; otherwise an expired session means someone must reconnect in Configuración.
 */
export async function resolveUbitsMcpToken(db: SupabaseClient): Promise<string> {
  const value = await getSecret(db, UBITS_MCP_TOKEN_SECRET);
  if (!value) {
    if (process.env.UBITS_MCP_TOKEN) return process.env.UBITS_MCP_TOKEN;
    throw new Error("El MCP de Ubits no está conectado. Conéctalo en Configuración → MCP de Ubits.");
  }

  const token = parseStoredToken(value);
  if (isTokenUsable(token)) return token.access_token;
  if (!token.refresh_token) {
    throw new Error("La sesión con el MCP de Ubits venció. Reconéctala en Configuración → MCP de Ubits.");
  }

  const client = await readJsonSecret<RegisteredClient>(db, UBITS_MCP_CLIENT_SECRET);
  if (!client) throw new Error("Falta el registro de Nexión en ubits-mcp.com. Reconecta el MCP en Configuración.");
  const renewed = await refreshToken(await fetchOAuthMetadata(), client.client_id, token.refresh_token);
  const next: StoredToken = {
    ...toStoredToken(renewed, token.connected_by),
    refresh_token: renewed.refresh_token ?? token.refresh_token,
    connected_at: token.connected_at,
  };
  await saveJsonSecret(db, UBITS_MCP_TOKEN_SECRET, next);
  return next.access_token;
}
