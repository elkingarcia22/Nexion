import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  EditionStatus,
  EditionTrigger,
  Newsletter,
  NewsletterEdition,
  NewsletterSource,
  SeenItem,
  SelectedArticle,
  TokenUsage,
} from "./types";

/**
 * Explains a wrong SUPABASE_SERVICE_ROLE_KEY instead of failing later with empty reads:
 * with the anon/publishable key, RLS hides every newsletter row from the server.
 */
export function describeServiceKeyProblem(key: string): string | null {
  const hint = "Revisa SUPABASE_SERVICE_ROLE_KEY en Vercel: debe ser la llave service_role (Supabase → Project Settings → API).";
  if (key.startsWith("sb_secret_")) return null;
  if (key.startsWith("sb_publishable_")) return `Se configuró la llave publishable en lugar de la secreta. ${hint}`;

  const payload = key.split(".")[1];
  if (!payload) return `La llave no tiene formato válido. ${hint}`;
  try {
    const role = JSON.parse(Buffer.from(payload, "base64").toString("utf8")).role;
    return role === "service_role" ? null : `Se configuró la llave "${role}" en lugar de "service_role". ${hint}`;
  } catch {
    return `La llave no tiene formato válido. ${hint}`;
  }
}

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase no está configurado (URL o SERVICE_ROLE_KEY).");
  const problem = describeServiceKeyProblem(key);
  if (problem) throw new Error(problem);
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getNewsletter(db: SupabaseClient, id: string): Promise<Newsletter> {
  const { data, error } = await db.from("newsletters").select("*").eq("id", id).single();
  if (error && error.code !== "PGRST116") throw new Error(`No se pudo leer el boletín "${id}": ${error.message}`);
  if (!data) throw new Error(`No existe el boletín "${id}".`);
  return data as Newsletter;
}

export async function getActiveSources(db: SupabaseClient, newsletterId: string): Promise<NewsletterSource[]> {
  const { data, error } = await db
    .from("newsletter_sources")
    .select("*")
    .eq("newsletter_id", newsletterId)
    .eq("is_active", true);
  if (error) throw new Error(`No se pudieron leer las fuentes: ${error.message}`);
  return (data ?? []) as NewsletterSource[];
}

export async function getSeenItems(db: SupabaseClient, newsletterId: string): Promise<SeenItem[]> {
  const { data, error } = await db
    .from("newsletter_seen_items")
    .select("url, title")
    .eq("newsletter_id", newsletterId);
  if (error) throw new Error(`No se pudo leer el historial: ${error.message}`);
  return (data ?? []) as SeenItem[];
}

export interface NewEdition {
  newsletterId: string;
  status: EditionStatus;
  trigger: EditionTrigger;
  message: string | null;
  pills: SelectedArticle[];
  stats: Record<string, unknown>;
  error: string | null;
  model: string | null;
  usage: TokenUsage | null;
  slackTs: string | null;
}

export async function saveEdition(db: SupabaseClient, edition: NewEdition): Promise<string> {
  const { data, error } = await db
    .from("newsletter_editions")
    .insert({
      newsletter_id: edition.newsletterId,
      status: edition.status,
      trigger: edition.trigger,
      message: edition.message,
      pills: edition.pills,
      stats: edition.stats,
      error: edition.error,
      model: edition.model,
      usage: edition.usage,
      slack_ts: edition.slackTs,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`No se pudo guardar la edición: ${error?.message}`);
  return data.id as string;
}

export async function getEdition(db: SupabaseClient, editionId: string): Promise<NewsletterEdition> {
  const { data, error } = await db.from("newsletter_editions").select("*").eq("id", editionId).single();
  if (error || !data) throw new Error("No existe esa edición.");
  return data as NewsletterEdition;
}

/** Text of the latest edition that went out, used as "don't repeat yourself" context. */
export async function getLastPublishedMessage(db: SupabaseClient, newsletterId: string): Promise<string | null> {
  const { data, error } = await db
    .from("newsletter_editions")
    .select("message")
    .eq("newsletter_id", newsletterId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer la última edición: ${error.message}`);
  return (data?.message as string | null) ?? null;
}

export async function markEditionPublished(db: SupabaseClient, editionId: string, slackTs: string): Promise<void> {
  const { error } = await db
    .from("newsletter_editions")
    .update({ status: "published", slack_ts: slackTs })
    .eq("id", editionId);
  if (error) throw new Error(`No se pudo actualizar la edición: ${error.message}`);
}

/** True if the newsletter already went out since `since` (guards against cron retries). */
export async function hasPublishedSince(db: SupabaseClient, newsletterId: string, since: Date): Promise<boolean> {
  const { count, error } = await db
    .from("newsletter_editions")
    .select("id", { count: "exact", head: true })
    .eq("newsletter_id", newsletterId)
    .eq("status", "published")
    .gte("created_at", since.toISOString());
  if (error) throw new Error(`No se pudo revisar el historial de ediciones: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function markSeen(
  db: SupabaseClient,
  newsletterId: string,
  editionId: string,
  pills: SelectedArticle[]
): Promise<void> {
  const rows = pills.map((pill) => ({
    newsletter_id: newsletterId,
    url: pill.url,
    title: pill.title,
    edition_id: editionId,
  }));
  const { error } = await db
    .from("newsletter_seen_items")
    .upsert(rows, { onConflict: "newsletter_id,url", ignoreDuplicates: true });
  if (error) throw new Error(`No se pudo guardar el historial: ${error.message}`);
}
