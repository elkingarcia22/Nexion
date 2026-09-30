import type { PulseConfig } from "./config";
import type { PulseWindow } from "./sql";

/**
 * Customer cases and feedback kept in Slack Lists (the ones the n8n flows downloaded as CSV).
 * Needs the bot's files:read scope. People's e-mails (assignee columns) are never read.
 */
const TIMEOUT_MS = 20_000;
const MAX_LISTED = 6;
const RESOLVED = ["resuelto", "resuleto", "hecho", "cerrado", "finalizado", "done", "completado"];

export interface CustomerCase {
  client: string;
  title: string;
  detail: string | null;
  type: string;
  status: string;
  resolved: boolean;
  date: string | null;
  priority: number | null;
}

export interface PulseCases {
  /** Newest case date in the list, so a stale list is not read as current. */
  latestDate: string | null;
  createdInPeriod: number;
  resolvedInPeriod: number;
  pending: number;
  pendingTop: CustomerCase[];
  byType: Record<string, number>;
}

/** RFC 4180 CSV (quoted cells, doubled quotes, newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows.filter((r) => r.some((value) => value.trim()));
}

/** First column present among the aliases (lists name the same field differently). */
function pick(record: Record<string, string>, ...names: string[]): string {
  for (const name of names) if (record[name]?.trim()) return record[name].trim();
  return "";
}

export function toCases(csv: string, productValue?: string): CustomerCase[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const records = rows.map((row) => Object.fromEntries(header.map((name, index) => [name.trim(), row[index] ?? ""])));
  return records
    .filter((record) => !productValue || pick(record, "Producto").toLowerCase() === productValue.toLowerCase())
    .map((record): CustomerCase => {
      const status = pick(record, "Estado", "Status");
      const completed = pick(record, "Completado", "Completed").toLowerCase() === "true";
      const priority = Number(pick(record, "Prioridad", "Priority"));
      const date = pick(record, "Fecha del caso", "Fecha", "Date");
      return {
        client: pick(record, "Cliente", "Cuenta") || "Sin cliente",
        title: pick(record, "Caso", "Case", "Título"),
        detail: pick(record, "Específico", "Detalle", "Descripción") || null,
        type: pick(record, "Tipo", "Type") || "Sin tipo",
        status: status || (completed ? "Resuelto" : "Pendiente"),
        resolved: completed || RESOLVED.includes(status.toLowerCase()),
        date: /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : null,
        priority: Number.isFinite(priority) && priority > 0 ? priority : null,
      };
    })
    .filter((item) => item.title);
}

export function summarizeCases(cases: CustomerCase[], w: PulseWindow): PulseCases {
  const inPeriod = (date: string | null) => Boolean(date) && date! >= w.start && date! <= w.end;
  const pending = cases.filter((item) => !item.resolved);
  const dates = cases.map((item) => item.date).filter((date): date is string => Boolean(date)).sort();
  return {
    latestDate: dates[dates.length - 1] ?? null,
    createdInPeriod: cases.filter((item) => inPeriod(item.date)).length,
    resolvedInPeriod: cases.filter((item) => item.resolved && inPeriod(item.date)).length,
    pending: pending.length,
    // Lower priority number first (1 = most urgent), then the most recent.
    pendingTop: [...pending].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99) || (b.date ?? "").localeCompare(a.date ?? "")).slice(0, MAX_LISTED),
    byType: cases.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.type]: (counts[item.type] ?? 0) + 1 }), {}),
  };
}

/** Downloads a Slack List as CSV through files.info → list_csv_download_url. */
export async function fetchSlackListCsv(fileId: string, token: string): Promise<string> {
  const info = await fetch(`https://slack.com/api/files.info?file=${encodeURIComponent(fileId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).then((r) => r.json());
  if (!info.ok) {
    throw new Error(info.error === "missing_scope" ? "El bot de Slack no tiene el permiso files:read." : `Slack no entregó la lista: ${info.error}`);
  }
  const url = info.file?.list_csv_download_url ?? info.file?.url_private_download;
  if (!url) throw new Error("La lista de Slack no tiene descarga en CSV.");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Slack respondió ${response.status} al descargar la lista.`);
  return response.text();
}

export async function fetchPulseCases(config: PulseConfig, token: string, w: PulseWindow): Promise<PulseCases | null> {
  if (!config.slackList) return null;
  const csv = await fetchSlackListCsv(config.slackList.fileId, token);
  return summarizeCases(toCases(csv, config.slackList.productValue), w);
}
