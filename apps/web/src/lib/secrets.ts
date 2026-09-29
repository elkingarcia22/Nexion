import type { SupabaseClient } from "@supabase/supabase-js";

export const ANTHROPIC_KEY_SECRET = "anthropic_api_key";
export const SLACK_TOKEN_SECRET = "slack_bot_token";

/** Server-only: read a secret from `app_secrets` (requires the service-role client). */
export async function getSecret(db: SupabaseClient, name: string): Promise<string | null> {
  const { data, error } = await db.from("app_secrets").select("value").eq("name", name).maybeSingle();
  if (error) throw new Error(`No se pudo leer la clave "${name}": ${error.message}`);
  return data?.value ?? null;
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
