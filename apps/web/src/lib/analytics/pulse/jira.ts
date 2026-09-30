import type { SupabaseClient } from "@supabase/supabase-js";
import type { PulseConfig } from "./config";
import type { PulseWindow } from "./sql";

/**
 * Support tickets of the Talent products (PTG epic PTG-1389, as the n8n flows used), split by
 * product with keyword rules. Credentials come from the Jira connection saved in Configuración.
 */
const JQL = "project = PTG AND parent = PTG-1389 ORDER BY updated DESC";
const MAX_RESULTS = 100;
const TIMEOUT_MS = 20_000;
const MAX_LISTED = 8;
const DONE_STATUSES = ["finalizada", "done", "closed", "cerrado", "resuelto", "discarted", "discarded", "cancelado"];

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  done: boolean;
  priority: string | null;
  created: string;
  updated: string;
  url: string;
}

export interface PulseTickets {
  active: JiraTicket[];
  resolvedInPeriod: JiraTicket[];
  createdInPeriod: number;
  createdPrevious: number;
}

/** A ticket plus the lowercased text its product is matched on (not exposed in reports). */
export type TaggedTicket = JiraTicket & { searchText: string };

interface JiraConfig {
  siteUrl: string;
  email: string;
  apiToken: string;
}

export async function resolveJiraConfig(db: SupabaseClient): Promise<JiraConfig | null> {
  const { data, error } = await db.from("workspaces").select("jira_config").not("jira_config", "is", null);
  if (error) throw new Error(`No se pudo leer la conexión de Jira: ${error.message}`);
  const found = (data ?? []).map((row) => row.jira_config as Partial<JiraConfig> | null).find((c) => c?.siteUrl && c.email && c.apiToken);
  return found ? { siteUrl: found.siteUrl!.replace(/\/$/, ""), email: found.email!, apiToken: found.apiToken! } : null;
}

interface RawIssue {
  key: string;
  fields: {
    summary?: string;
    status?: { name?: string; statusCategory?: { key?: string } };
    priority?: { name?: string } | null;
    created?: string;
    updated?: string;
    labels?: string[];
    components?: Array<{ name?: string }>;
  };
}

/** All tickets of the Talent epic (one call shared by every product's pulse). */
export async function fetchTalentTickets(config: JiraConfig): Promise<TaggedTicket[]> {
  const response = await fetch(`${config.siteUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ jql: JQL, maxResults: MAX_RESULTS, fields: ["summary", "status", "priority", "created", "updated", "labels", "components"] }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 401 || response.status === 403) throw new Error("Jira rechazó las credenciales guardadas en Configuración → Jira.");
  if (!response.ok) throw new Error(`Jira respondió ${response.status}.`);
  const data = (await response.json()) as { issues?: RawIssue[] };
  return (data.issues ?? []).map((issue) => toTicket(issue, config.siteUrl));
}

function toTicket(issue: RawIssue, siteUrl: string): TaggedTicket {
  const status = issue.fields.status?.name ?? "";
  const text = [issue.fields.summary, ...(issue.fields.labels ?? []), ...(issue.fields.components ?? []).map((c) => c.name)].join(" ").toLowerCase();
  return {
    key: issue.key,
    summary: issue.fields.summary ?? "",
    status,
    done: issue.fields.status?.statusCategory?.key === "done" || DONE_STATUSES.includes(status.toLowerCase()),
    priority: issue.fields.priority?.name ?? null,
    created: (issue.fields.created ?? "").slice(0, 10),
    updated: (issue.fields.updated ?? "").slice(0, 10),
    url: `${siteUrl}/browse/${issue.key}`,
    searchText: text,
  };
}

/** A ticket is the product's when it mentions one of its terms, unless it is about another product and not its main term. */
function belongsTo(ticket: TaggedTicket, config: PulseConfig): boolean {
  const text = ticket.searchText;
  if (!config.jiraTerms.some((term) => text.includes(term))) return false;
  const aboutOther = config.jiraExcludeTerms.some((term) => text.includes(term));
  return !aboutOther || text.includes(config.jiraTerms[0]);
}

const inRange = (date: string, start: string, end: string) => date >= start && date <= end;

export function ticketsForProduct(tickets: TaggedTicket[], config: PulseConfig, w: PulseWindow): PulseTickets {
  const mine = tickets.filter((ticket) => belongsTo(ticket, config));
  const strip = ({ searchText: _s, ...ticket }: TaggedTicket): JiraTicket => ticket;
  return {
    active: mine.filter((t) => !t.done).slice(0, MAX_LISTED).map(strip),
    resolvedInPeriod: mine.filter((t) => t.done && inRange(t.updated, w.start, w.end)).slice(0, MAX_LISTED).map(strip),
    createdInPeriod: mine.filter((t) => inRange(t.created, w.start, w.end)).length,
    createdPrevious: mine.filter((t) => inRange(t.created, w.previousStart, w.previousEnd)).length,
  };
}
