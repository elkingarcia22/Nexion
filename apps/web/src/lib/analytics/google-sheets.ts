import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GOOGLE_SHEETS_PENDING_SECRET,
  GOOGLE_SHEETS_TOKEN_SECRET,
  readJsonSecret,
  resolveGoogleOAuthClient,
  saveJsonSecret,
  type GoogleOAuthClient,
} from "@/lib/secrets";

/**
 * Server-side, read-only access to Google Sheets for the product reports (OKR and implementation
 * sheets). Someone connects once in Configuración; Nexión keeps the refresh token and renews the
 * access token by itself, so scheduled reports keep working.
 */
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TIMEOUT_MS = 15_000;
const PENDING_MAX_AGE_MS = 10 * 60_000;
const EXPIRY_MARGIN_MS = 60_000;

interface StoredSheetsToken {
  refresh_token: string;
  access_token?: string;
  expires_at?: number;
  connected_by?: string;
  connected_at: string;
}

interface PendingSheetsConnection {
  state: string;
  user_id: string;
  redirect_uri: string;
  created_at: number;
}

export interface SheetsConnectionStatus {
  connected: boolean;
  connectedAt: string | null;
  clientConfigured: boolean;
}

async function requireClient(db: SupabaseClient): Promise<GoogleOAuthClient> {
  const client = await resolveGoogleOAuthClient(db);
  if (!client) throw new Error("Falta el cliente OAuth de Google. Guárdalo en Configuración → Google.");
  return client;
}

async function tokenRequest(body: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Google respondió: ${String(json.error_description ?? json.error ?? response.status)}`);
  return json;
}

export async function startSheetsConnection(db: SupabaseClient, userId: string, redirectUri: string): Promise<string> {
  const client = await requireClient(db);
  const state = randomBytes(24).toString("base64url");
  const pending: PendingSheetsConnection = { state, user_id: userId, redirect_uri: redirectUri, created_at: Date.now() };
  await saveJsonSecret(db, GOOGLE_SHEETS_PENDING_SECRET, pending, userId);
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SHEETS_SCOPE,
    // offline + consent: Google only returns a refresh token this way.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return url.toString();
}

export async function completeSheetsConnection(db: SupabaseClient, code: string, state: string): Promise<void> {
  const pending = await readJsonSecret<PendingSheetsConnection>(db, GOOGLE_SHEETS_PENDING_SECRET);
  if (!pending || pending.state !== state) throw new Error("La conexión no coincide con la que se inició. Vuelve a intentarlo desde Configuración.");
  await db.from("app_secrets").delete().eq("name", GOOGLE_SHEETS_PENDING_SECRET);
  if (Date.now() - pending.created_at > PENDING_MAX_AGE_MS) throw new Error("El inicio de sesión tardó demasiado. Vuelve a intentarlo.");

  const client = await requireClient(db);
  const json = await tokenRequest({
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: pending.redirect_uri,
    grant_type: "authorization_code",
  });
  if (typeof json.refresh_token !== "string") {
    throw new Error("Google no entregó un token de renovación. Quita el acceso de Nexión en tu cuenta de Google y vuelve a conectar.");
  }
  if (!String(json.scope ?? "").includes("spreadsheets")) throw new Error("No se concedió el permiso de lectura de hojas de cálculo.");
  const stored: StoredSheetsToken = {
    refresh_token: json.refresh_token,
    access_token: typeof json.access_token === "string" ? json.access_token : undefined,
    expires_at: Date.now() + Number(json.expires_in ?? 0) * 1000,
    connected_by: pending.user_id,
    connected_at: new Date().toISOString(),
  };
  await saveJsonSecret(db, GOOGLE_SHEETS_TOKEN_SECRET, stored, pending.user_id);
}

export async function getSheetsStatus(db: SupabaseClient): Promise<SheetsConnectionStatus> {
  const [token, client] = await Promise.all([readJsonSecret<StoredSheetsToken>(db, GOOGLE_SHEETS_TOKEN_SECRET), resolveGoogleOAuthClient(db)]);
  return { connected: Boolean(token?.refresh_token), connectedAt: token?.connected_at ?? null, clientConfigured: Boolean(client) };
}

export async function disconnectSheets(db: SupabaseClient): Promise<void> {
  const { error } = await db.from("app_secrets").delete().in("name", [GOOGLE_SHEETS_TOKEN_SECRET, GOOGLE_SHEETS_PENDING_SECRET]);
  if (error) throw new Error(error.message);
}

/** A valid access token, renewed with the stored refresh token when needed. */
export async function resolveSheetsAccessToken(db: SupabaseClient): Promise<string> {
  const token = await readJsonSecret<StoredSheetsToken>(db, GOOGLE_SHEETS_TOKEN_SECRET);
  if (!token?.refresh_token) throw new Error("Google Sheets no está conectado. Conéctalo en Configuración → Google Sheets.");
  if (token.access_token && (token.expires_at ?? 0) - EXPIRY_MARGIN_MS > Date.now()) return token.access_token;

  const client = await requireClient(db);
  const json = await tokenRequest({
    refresh_token: token.refresh_token,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    grant_type: "refresh_token",
  }).catch((error: Error) => {
    throw new Error(`No se pudo renovar el acceso a Google Sheets (${error.message}). Reconecta en Configuración → Google Sheets.`);
  });
  const accessToken = String(json.access_token ?? "");
  await saveJsonSecret(db, GOOGLE_SHEETS_TOKEN_SECRET, { ...token, access_token: accessToken, expires_at: Date.now() + Number(json.expires_in ?? 0) * 1000 });
  return accessToken;
}

/** Tab names of a spreadsheet. */
export async function listSheetTabs(accessToken: string, spreadsheetId: string): Promise<string[]> {
  const response = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 403 || response.status === 404) throw new Error("La cuenta conectada no tiene acceso a la hoja de cálculo.");
  if (!response.ok) throw new Error(`Google Sheets respondió ${response.status}.`);
  const json = (await response.json()) as { sheets?: Array<{ properties?: { title?: string } }> };
  return (json.sheets ?? []).map((sheet) => sheet.properties?.title ?? "").filter(Boolean);
}

/** All values of a tab as rows of strings (formatted as shown in the sheet). */
export async function readSheetValues(accessToken: string, spreadsheetId: string, tab: string): Promise<string[][]> {
  const range = encodeURIComponent(`'${tab.replace(/'/g, "''")}'`);
  const response = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 403 || response.status === 404) throw new Error(`La cuenta conectada no tiene acceso a la pestaña "${tab}".`);
  if (!response.ok) throw new Error(`Google Sheets respondió ${response.status}.`);
  const json = (await response.json()) as { values?: unknown[][] };
  return (json.values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
}
