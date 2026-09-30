import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/newsletters/repository";

export const ANTHROPIC_KEY_SECRET = "anthropic_api_key";
export const SLACK_TOKEN_SECRET = "slack_bot_token";
export const GOOGLE_CLIENT_ID_SECRET = "google_client_id";
export const GOOGLE_CLIENT_SECRET_SECRET = "google_client_secret";
export const POSTHOG_KEY_SECRET = "posthog_api_key";
export const UBITS_MCP_TOKEN_SECRET = "ubits_mcp_token";
export const UBITS_MCP_CLIENT_SECRET = "ubits_mcp_oauth_client";
export const UBITS_MCP_PENDING_SECRET = "ubits_mcp_oauth_pending";
export const GOOGLE_SHEETS_TOKEN_SECRET = "google_sheets_token";
export const GOOGLE_SHEETS_PENDING_SECRET = "google_sheets_oauth_pending";

/** Server-only: read a secret from `app_secrets` (requires the service-role client). */
export async function getSecret(db: SupabaseClient, name: string): Promise<string | null> {
  const { data, error } = await db.from("app_secrets").select("value").eq("name", name).maybeSingle();
  if (error) throw new Error(`No se pudo leer la clave "${name}": ${error.message}`);
  return data?.value ?? null;
}

/** Server-only: store a JSON value in `app_secrets` (OAuth sessions, pending sign-ins). */
export async function saveJsonSecret(db: SupabaseClient, name: string, value: unknown, userId?: string): Promise<void> {
  const { error } = await db.from("app_secrets").upsert({
    name,
    value: JSON.stringify(value),
    ...(userId ? { updated_by: userId } : {}),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`No se pudo guardar "${name}": ${error.message}`);
}

/** Server-only: read a JSON value saved with saveJsonSecret (null when missing or not JSON). */
export async function readJsonSecret<T>(db: SupabaseClient, name: string): Promise<T | null> {
  const value = await getSecret(db, name);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Claude key: the one saved in Configuración wins; ANTHROPIC_API_KEY is the fallback. */
export async function resolveAnthropicKey(db: SupabaseClient): Promise<string> {
  const key = (await getSecret(db, ANTHROPIC_KEY_SECRET)) || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("No hay clave de Claude. Agrégala en Configuración → Claude AI.");
  return key;
}

/**
 * Slack bot token: the one saved in Configuración wins, then SLACK_BOT_TOKEN.
 * NEXT_PUBLIC_SLACK_BOT_TOKEN is the legacy read-only token and is only a last resort.
 */
export async function resolveSlackToken(db: SupabaseClient): Promise<string> {
  const token =
    (await getSecret(db, SLACK_TOKEN_SECRET)) || process.env.SLACK_BOT_TOKEN || process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN;
  if (!token) throw new Error("No hay token de Slack. Agrégalo en Configuración → Slack bot.");
  return token;
}

/**
 * Slack token for features that degrade gracefully when Slack is not set up (channel listing,
 * daily sync). Returns null instead of throwing, and never fails because Supabase is unreachable.
 */
export async function getOptionalSlackToken(): Promise<string | null> {
  try {
    return await resolveSlackToken(createServiceClient());
  } catch {
    return process.env.SLACK_BOT_TOKEN || process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN || null;
  }
}

export interface GoogleOAuthClient {
  clientId: string;
  clientSecret: string;
}

/** Google OAuth client used to refresh Drive/Calendar tokens: Configuración first, then the environment. */
export async function resolveGoogleOAuthClient(db: SupabaseClient): Promise<GoogleOAuthClient | null> {
  const [savedId, savedSecret] = await Promise.all([
    getSecret(db, GOOGLE_CLIENT_ID_SECRET),
    getSecret(db, GOOGLE_CLIENT_SECRET_SECRET),
  ]);
  const clientId = savedId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = savedSecret || process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** PostHog personal API key saved in Configuración → PostHog (falls back to POSTHOG_API_KEY). */
export async function resolvePosthogKey(db: SupabaseClient): Promise<string> {
  const key = (await getSecret(db, POSTHOG_KEY_SECRET)) || process.env.POSTHOG_API_KEY;
  if (!key) throw new Error("No hay llave de PostHog. Agrégala en Configuración → PostHog.");
  return key;
}
