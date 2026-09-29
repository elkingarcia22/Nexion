import { supabase } from "@/lib/supabase";
import type { Newsletter, NewsletterEdition, NewsletterSource } from "@/lib/newsletters/types";

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

const RECENT_EDITIONS_LIMIT = 30;
const REQUEST_TIMEOUT_MS = 90_000;

function toError(error: unknown): { success: false; error: string } {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return { success: false, error: "La operación tardó demasiado. Revisa la lista de ediciones por si alcanzó a completarse." };
  }
  return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
}

export async function listNewsletters(): Promise<ServiceResult<Newsletter[]>> {
  const ordered = await supabase.from("newsletters").select("*").order("sort_order").order("name");
  // Before the sort_order migration is applied, fall back to alphabetical order instead of failing.
  const result = ordered.error?.message.includes("sort_order")
    ? await supabase.from("newsletters").select("*").order("name")
    : ordered;
  if (result.error) return { success: false, error: result.error.message };
  return { success: true, data: (result.data ?? []) as Newsletter[] };
}

export interface NewsletterDetail {
  newsletter: Newsletter;
  sources: NewsletterSource[];
  editions: NewsletterEdition[];
}

export async function getNewsletterDetail(id: string): Promise<ServiceResult<NewsletterDetail>> {
  const [newsletter, sources, editions] = await Promise.all([
    supabase.from("newsletters").select("*").eq("id", id).single(),
    supabase.from("newsletter_sources").select("*").eq("newsletter_id", id).order("priority").order("name"),
    supabase
      .from("newsletter_editions")
      .select("*")
      .eq("newsletter_id", id)
      .order("created_at", { ascending: false })
      .limit(RECENT_EDITIONS_LIMIT),
  ]);

  const error = newsletter.error || sources.error || editions.error;
  if (error || !newsletter.data) return { success: false, error: error?.message ?? "Boletín no encontrado" };

  return {
    success: true,
    data: {
      newsletter: newsletter.data as Newsletter,
      sources: (sources.data ?? []) as NewsletterSource[],
      editions: (editions.data ?? []) as NewsletterEdition[],
    },
  };
}

export async function setSourceActive(sourceId: string, isActive: boolean): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("newsletter_sources")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", sourceId);
  return error ? { success: false, error: error.message } : { success: true, data: null };
}

export async function setNewsletterEnabled(id: string, isEnabled: boolean): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("newsletters")
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  return error ? { success: false, error: error.message } : { success: true, data: null };
}

export interface RunResponse {
  editionId: string | null;
  status: string;
  detail: string;
  problem?: boolean;
}

async function authorizedPost(path: string, body?: unknown): Promise<ServiceResult<RunResponse>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { success: false, error: "Necesitas iniciar sesión con Google (el modo demo no publica)." };

    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return { success: false, error: json.error ?? `Error ${response.status}` };
    return { success: true, data: json as RunResponse };
  } catch (error) {
    return toError(error);
  }
}

export function runNewsletterNow(id: string, publish: boolean): Promise<ServiceResult<RunResponse>> {
  return authorizedPost(`/api/newsletters/${encodeURIComponent(id)}/run`, { publish });
}

export function publishEdition(editionId: string): Promise<ServiceResult<RunResponse>> {
  return authorizedPost(`/api/newsletters/editions/${encodeURIComponent(editionId)}/publish`);
}
