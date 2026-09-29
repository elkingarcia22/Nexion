import { screenLabel, type RadarConfig } from "./config";
import { num } from "./math";

/**
 * Session recordings worth watching: rank candidate sessions by friction, confirm each recording
 * still exists in PostHog, and keep a varied short list (one per company).
 */
const PRESELECT_TOTAL = 12;
const PRESELECT_PER_COMPANY = 2;
const PRESELECT_PER_CATEGORY = 3;
export const VISIBLE_REPLAYS = 4;
const MIN_ACTIVE_SECONDS = 180;
const LOOKUP_TIMEOUT_MS = 15_000;
const MAX_ROUTE_STEPS = 6;

export interface ReplayCandidate {
  sessionId: string;
  company: string;
  startedAt: string;
  screens: number;
  errors404: number;
  errorsNon404: number;
  deadClicks: number;
  rageClicks: number;
  keyActions: number;
  route: string[];
  category: string;
  categoryLabel: string;
  categoryPriority: number;
  score: number;
}

export interface Replay extends Omit<ReplayCandidate, "route"> {
  priority: "Crítica" | "Alta" | "Media-alta" | "Media";
  activeMinutes: number;
  consoleErrors: number;
  daysUntilExpiry: number | null;
  routeSummary: string;
  url: string;
}

interface Category {
  key: string;
  label: string;
  priority: number;
}

function classify(config: RadarConfig, c: Omit<ReplayCandidate, "category" | "categoryLabel" | "categoryPriority" | "score">): Category {
  if (c.errorsNon404 > 0) return { key: "error_no_404", label: "Error técnico distinto del 404", priority: 1 };
  if (c.route.some((path) => path.includes("/undefined"))) return { key: "ruta_invalida", label: "Ruta o estado inválido", priority: 2 };
  for (const category of config.replayCategories) {
    const inPath = !category.pathFragment || c.route.some((path) => path.includes(category.pathFragment!));
    const rageOk = category.minRageClicks === undefined || c.rageClicks >= category.minRageClicks;
    const deadOk = category.minDeadClicks === undefined || c.deadClicks >= category.minDeadClicks || c.rageClicks >= 2;
    if (inPath && rageOk && deadOk) return category;
  }
  if (c.rageClicks >= 5) return { key: "rage_clicks_altos", label: "Frustración repetida (rage clicks)", priority: 6 };
  if (c.errors404 >= 20) return { key: "error_404_concentrado", label: "Error 404 concentrado", priority: 6 };
  return { key: "esfuerzo_alto", label: "Esfuerzo operativo elevado", priority: 8 };
}

export function toCandidates(rows: Record<string, unknown>[], config: RadarConfig): ReplayCandidate[] {
  return rows
    .filter((row) => typeof row.session_id === "string" && row.session_id)
    .map((row) => {
      const base = {
        sessionId: String(row.session_id),
        company: String(row.empresa || "Empresa no identificada"),
        startedAt: String(row.inicio ?? ""),
        screens: num(row.pantallas),
        errors404: num(row.errores_404),
        errorsNon404: num(row.errores_no_404),
        deadClicks: num(row.dead_clicks),
        rageClicks: num(row.rage_clicks),
        keyActions: num(row.acciones_clave),
        route: Array.isArray(row.recorrido) ? (row.recorrido as unknown[]).map(String) : [],
      };
      const category = classify(config, base);
      const score =
        Math.min(base.rageClicks, 10) * 15 +
        Math.min(base.errorsNon404, 10) * 25 +
        Math.min(base.deadClicks, 100) * 1.2 +
        Math.min(base.errors404, 10) * 2 +
        Math.min(Math.sqrt(base.keyActions) * 7, 55) +
        Math.min(base.screens, 15) * 3 +
        Math.max(0, 30 - category.priority * 3);
      return { ...base, category: category.key, categoryLabel: category.label, categoryPriority: category.priority, score };
    })
    .filter((candidate) => !candidate.company.toLowerCase().includes("comercial ubits"));
}

/** Best of each category first, then by score, with per-company and per-category caps. */
export function pickVaried<T extends { company: string; category: string; score: number; categoryPriority: number }>(
  items: T[],
  total: number,
  perCompany: number,
  perCategory: number
): T[] {
  const sorted = [...items].sort((a, b) => a.categoryPriority - b.categoryPriority || b.score - a.score);
  const picked: T[] = [];
  const count = (key: keyof T, value: unknown) => picked.filter((item) => item[key] === value).length;
  const tryAdd = (item: T) => {
    if (picked.length >= total || picked.includes(item)) return;
    if (count("company", item.company) >= perCompany || count("category", item.category) >= perCategory) return;
    picked.push(item);
  };
  const seenCategories = new Set<string>();
  for (const item of sorted) {
    if (!seenCategories.has(item.category)) {
      seenCategories.add(item.category);
      tryAdd(item);
    }
  }
  [...items].sort((a, b) => b.score - a.score).forEach(tryAdd);
  return picked;
}

function reviewPriority(c: ReplayCandidate, consoleErrorsPerMinute: number): Replay["priority"] {
  if (c.errorsNon404 > 0 || c.category === "ruta_invalida") return "Crítica";
  if (c.rageClicks >= 5 || consoleErrorsPerMinute >= 8) return "Alta";
  if (c.deadClicks >= 50 || c.errors404 >= 20) return "Media-alta";
  return "Media";
}

function routeSummary(config: RadarConfig, route: string[]): string {
  const labels = route.map((path) => screenLabel(config, path)).filter((label, index, all) => all.indexOf(label) === index);
  return labels.slice(0, MAX_ROUTE_STEPS).join(" → ");
}

interface RecordingMeta {
  active_seconds?: number;
  console_error_count?: number;
  expiry_time?: string;
  recording_duration?: number;
}

async function fetchRecording(key: string, projectId: number, sessionId: string): Promise<RecordingMeta | null> {
  const response = await fetch(`https://us.posthog.com/api/projects/${projectId}/session_recordings/${encodeURIComponent(sessionId)}/`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (response.status === 401 || response.status === 403) throw new Error("PostHog no permite leer grabaciones con esta llave (falta session_recording:read).");
  if (!response.ok) return null;
  const body = (await response.json()) as RecordingMeta & { id?: string };
  return body.id && (body.recording_duration ?? 0) > 0 ? body : null;
}

/** Recordings to review this week (available ones only), most urgent first. */
export async function selectReplays(rows: Record<string, unknown>[], config: RadarConfig, posthogKey: string, now = Date.now()): Promise<Replay[]> {
  const preselected = pickVaried(toCandidates(rows, config), PRESELECT_TOTAL, PRESELECT_PER_COMPANY, PRESELECT_PER_CATEGORY);
  const withMeta = await Promise.all(
    preselected.map(async (candidate) => ({ candidate, meta: await fetchRecording(posthogKey, config.posthogProjectId, candidate.sessionId).catch((error) => {
      if (error instanceof Error && error.message.startsWith("PostHog no permite")) throw error;
      return null;
    }) }))
  );

  const replays = withMeta
    .filter((entry): entry is { candidate: ReplayCandidate; meta: RecordingMeta } => entry.meta !== null)
    .map(({ candidate, meta }): Replay => {
      const activeMinutes = Math.round(((meta.active_seconds ?? 0) / 60) * 10) / 10;
      const consoleErrors = meta.console_error_count ?? 0;
      const expiry = meta.expiry_time ? Date.parse(meta.expiry_time) : NaN;
      const { route, ...rest } = candidate;
      return {
        ...rest,
        priority: reviewPriority(candidate, activeMinutes ? consoleErrors / activeMinutes : 0),
        activeMinutes,
        consoleErrors,
        daysUntilExpiry: Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 86_400_000)) : null,
        routeSummary: routeSummary(config, route),
        url: `https://us.posthog.com/project/${config.posthogProjectId}/replay/${candidate.sessionId}`,
        // A long mostly-idle recording is a poor review use of time unless it shows a real error.
        score: candidate.score - ((meta.active_seconds ?? 0) < MIN_ACTIVE_SECONDS && candidate.errorsNon404 === 0 ? 60 : 0),
      };
    });

  const rank = { Crítica: 0, Alta: 1, "Media-alta": 2, Media: 3 } as const;
  return pickVaried(replays, VISIBLE_REPLAYS, 1, VISIBLE_REPLAYS).sort(
    (a, b) => rank[a.priority] - rank[b.priority] || b.score - a.score
  );
}
