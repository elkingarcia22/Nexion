/** PostHog (US cloud) access for the product reports: HogQL queries and session recordings. */
export const POSTHOG_API = "https://us.posthog.com/api";
const TIMEOUT_MS = 45_000;

/** Checks a personal API key without needing a project id. */
export async function verifyPosthogKey(key: string): Promise<string | null> {
  const response = await fetch(`${POSTHOG_API}/users/@me/`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.ok) return null;
  if (response.status === 401 || response.status === 403) {
    return "PostHog rechazó la llave. Usa una Personal API Key con permisos de lectura (query y session recordings).";
  }
  return `PostHog respondió ${response.status}.`;
}

export interface HogQLResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

/** Runs a HogQL query and returns rows as objects keyed by column name. */
export async function runHogQL(key: string, projectId: string | number, query: string, name: string): Promise<HogQLResult> {
  const response = await fetch(`${POSTHOG_API}/projects/${projectId}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query }, name }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`PostHog (${name}) respondió ${response.status}: ${data?.detail ?? "error"}`);

  const columns: string[] = data.columns ?? [];
  const rows = ((data.results ?? []) as unknown[][]).map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]]))
  );
  return { columns, rows };
}
