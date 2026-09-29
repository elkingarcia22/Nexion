import type { TokenUsage } from "./types";

const FEED_TIMEOUT_MS = 10_000;
const CLAUDE_TIMEOUT_MS = 30_000;
const CLAUDE_MAX_TOKENS = 2048;
const ANTHROPIC_VERSION = "2023-06-01";

const FEED_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; NexionNewsletters/1.0)",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
};

export async function fetchSourceBody(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: FEED_HEADERS,
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

export interface ClaudeResult {
  text: string;
  usage: TokenUsage;
}

export interface ClaudeOptions {
  maxTokens?: number;
  timeoutMs?: number;
}

export async function callClaude(prompt: string, model: string, apiKey: string, options: ClaudeOptions = {}): Promise<ClaudeResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? CLAUDE_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? CLAUDE_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Claude respondió ${response.status}: ${data?.error?.message ?? "error desconocido"}`);
  }

  const text = (data.content ?? [])
    .filter((part: { type?: string }) => part.type === "text")
    .map((part: { text: string }) => part.text)
    .join("\n");

  return {
    text,
    usage: {
      inputTokens: Number(data.usage?.input_tokens ?? 0),
      outputTokens: Number(data.usage?.output_tokens ?? 0),
    },
  };
}

/** Cheap authenticated call used to check a key before saving it. */
export async function verifyAnthropicKey(apiKey: string): Promise<boolean> {
  const response = await fetch("https://api.anthropic.com/v1/models?limit=1", {
    headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
    signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
  });
  return response.ok;
}

const SLACK_TIMEOUT_MS = 15_000;
const SLACK_ERROR_HINTS: Record<string, string> = {
  missing_scope: 'El token de Slack no tiene el permiso "chat:write". Agrégalo en api.slack.com/apps → OAuth & Permissions → Bot Token Scopes, reinstala la app y actualiza el token.',
  not_in_channel: "El bot no está en el canal. En Slack escribe /invite @NombreDelBot en el canal del boletín.",
  channel_not_found: "Slack no encontró el canal configurado para este boletín.",
  invalid_auth: "El token de Slack es inválido o fue revocado.",
  token_revoked: "El token de Slack fue revocado.",
  is_archived: "El canal del boletín está archivado.",
};

/** Post a message (optionally as Block Kit blocks, with `text` as the notification fallback) and return its timestamp. */
export async function postToSlack(channel: string, text: string, token: string, blocks?: unknown[]): Promise<string> {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel, text, unfurl_links: false, unfurl_media: false, ...(blocks ? { blocks } : {}) }),
    signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(SLACK_ERROR_HINTS[data.error] ?? `Slack rechazó el mensaje: ${data.error}`);
  return data.ts as string;
}

export type SlackTokenCheck = { ok: true; team: string; bot: string } | { ok: false; error: string };

/** Confirms the token is valid and can post messages (`chat:write`) before it is saved. */
export async function verifySlackToken(token: string): Promise<SlackTokenCheck> {
  const response = await fetch("https://slack.com/api/auth.test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));
  if (!data.ok) {
    return { ok: false, error: SLACK_ERROR_HINTS[data.error] ?? `Slack rechazó el token: ${data.error ?? response.status}` };
  }

  const scopes = (response.headers.get("x-oauth-scopes") ?? "").split(",").map((scope) => scope.trim());
  if (!scopes.includes("chat:write")) return { ok: false, error: SLACK_ERROR_HINTS.missing_scope };

  return { ok: true, team: String(data.team ?? ""), bot: String(data.user ?? "") };
}
