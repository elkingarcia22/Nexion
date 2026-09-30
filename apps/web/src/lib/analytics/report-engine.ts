import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaude, postToSlack } from "@/lib/newsletters/clients";
import { resolveSlackToken } from "@/lib/secrets";
import { updateReport } from "./repository";
import { toSlackBlocks } from "./slack-blocks";
import type { AnalyticsReport, SourceCoverage } from "./types";

/** Pieces every report pipeline shares: source gathering, the AI reading loop and Slack posting. */
export const ANALYSIS_MODEL = "claude-sonnet-5-5";
export const SECTION_SEPARATOR = "\n\n━━━━━━━━━━━━━━━━━━\n\n";
const ANALYSIS_ATTEMPTS = 2;
const ANALYSIS_MAX_TOKENS = 10_000;
const ANALYSIS_TIMEOUT_MS = 120_000;

export type Usage = { inputTokens: number; outputTokens: number };
type Parsed<T> = { ok: true; analysis: T } | { ok: false; error: string };

/** Runs every source in parallel; a failing one is recorded in coverage instead of failing the report. */
export async function settleSources<T extends Record<string, Promise<unknown>>>(
  sources: T
): Promise<{ values: { [K in keyof T]: Awaited<T[K]> | null }; coverage: SourceCoverage }> {
  const names = Object.keys(sources) as Array<keyof T>;
  const settled = await Promise.allSettled(names.map((name) => sources[name]));
  const coverage: SourceCoverage = {};
  const values = {} as { [K in keyof T]: Awaited<T[K]> | null };
  names.forEach((name, index) => {
    const result = settled[index];
    coverage[name as string] =
      result.status === "fulfilled" ? { ok: true } : { ok: false, detail: result.reason instanceof Error ? result.reason.message.slice(0, 240) : "error" };
    values[name] = result.status === "fulfilled" ? (result.value as Awaited<T[typeof name]>) : null;
  });
  return { values, coverage };
}

/** Asks Claude for the reading, retrying once with the reason the first answer was rejected. */
export async function runAnalysis<T>(
  buildPrompt: (feedback?: string) => string,
  parse: (text: string) => Parsed<T>,
  apiKey: string
): Promise<{ analysis: T | null; usage: Usage; error?: string }> {
  let feedback: string | undefined;
  let usage: Usage = { inputTokens: 0, outputTokens: 0 };
  for (let attempt = 1; attempt <= ANALYSIS_ATTEMPTS; attempt++) {
    try {
      const result = await callClaude(buildPrompt(feedback), ANALYSIS_MODEL, apiKey, { maxTokens: ANALYSIS_MAX_TOKENS, timeoutMs: ANALYSIS_TIMEOUT_MS });
      usage = { inputTokens: usage.inputTokens + result.usage.inputTokens, outputTokens: usage.outputTokens + result.usage.outputTokens };
      const parsed = parse(result.text);
      if (parsed.ok) return { analysis: parsed.analysis, usage };
      feedback = parsed.error;
    } catch (error) {
      feedback = error instanceof Error ? error.message : "error desconocido";
    }
  }
  return { analysis: null, usage, error: `El análisis con IA falló: ${feedback}` };
}

export function appUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  return process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;
}

export function reportUrl(productId: string, level: string): string | undefined {
  const base = appUrl();
  return base ? `${base}/analytics?product=${productId}&level=${level}` : undefined;
}

/** Posts a stored report to its product channel; keeps it as a preview if Slack refuses. */
export async function publishReport(db: SupabaseClient, report: AnalyticsReport, channelId: string | null): Promise<{ report: AnalyticsReport; slackError?: string }> {
  if (!report.message) return { report, slackError: "El reporte no tiene mensaje para Slack." };
  if (!channelId) return { report, slackError: "El producto no tiene canal de Slack conectado." };
  try {
    const token = await resolveSlackToken(db);
    const fallback = report.analysis?.headline ?? "Reporte de producto";
    const ts = await postToSlack(channelId, fallback, token, toSlackBlocks(report.message, SECTION_SEPARATOR));
    await updateReport(db, report.id, { status: "published", slack_ts: ts, error: null });
    return { report: { ...report, status: "published", slack_ts: ts, error: null } };
  } catch (error) {
    const slackError = error instanceof Error ? error.message : "Slack rechazó el mensaje.";
    await updateReport(db, report.id, { error: `No se publicó en Slack: ${slackError}` });
    return { report: { ...report, error: `No se publicó en Slack: ${slackError}` }, slackError };
  }
}
