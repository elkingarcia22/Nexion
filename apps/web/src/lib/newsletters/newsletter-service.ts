import type { EditionStatus, EditionTrigger } from "./types";
import { callClaude, fetchSourceBody, postToSlack } from "./clients";
import { runIaNewsDay } from "./ia-news-day/pipeline";
import { runHrRadar } from "./hr-radar/pipeline";
import { hasPipeline, type PipelineId } from "./pipelines";
import { resolveAnthropicKey, resolveSlackToken } from "@/lib/secrets";
import {
  createServiceClient,
  getActiveSources,
  getEdition,
  getLastPublishedMessage,
  getNewsletter,
  getSeenItems,
  hasPublishedSince,
  markEditionPublished,
  markSeen,
  saveEdition,
} from "./repository";

const BOGOTA_UTC_OFFSET_HOURS = 5;

export interface RunOptions {
  trigger: EditionTrigger;
  /** false generates a preview that is stored but not sent to Slack. */
  publish: boolean;
}

export interface RunOutcome {
  editionId: string | null;
  status: EditionStatus | "already_published";
  detail: string;
  /** true when something needs attention even though an edition was saved. */
  problem?: boolean;
}

/** Every id in PIPELINE_READY_IDS must register its runner here (enforced by the Record type). */
const RUNNERS: Record<PipelineId, typeof runIaNewsDay> = {
  "ia-news-day": runIaNewsDay,
  "hr-radar": runHrRadar,
};
type NewsletterId = PipelineId;

export function isKnownNewsletter(id: string): id is NewsletterId {
  return hasPipeline(id);
}

function startOfBogotaDay(now: Date): Date {
  const bogota = new Date(now.getTime() - BOGOTA_UTC_OFFSET_HOURS * 3_600_000);
  return new Date(
    Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate(), BOGOTA_UTC_OFFSET_HOURS)
  );
}

export async function runNewsletter(id: NewsletterId, options: RunOptions): Promise<RunOutcome> {
  const db = createServiceClient();
  const newsletter = await getNewsletter(db, id);

  if (options.trigger === "cron") {
    if (!newsletter.is_enabled) return { editionId: null, status: "skipped", detail: "El boletín está pausado." };
    if (await hasPublishedSince(db, id, startOfBogotaDay(new Date()))) {
      return { editionId: null, status: "already_published", detail: "Ya se publicó la edición de hoy." };
    }
  }

  const [sources, seen, previousMessage, anthropicKey] = await Promise.all([
    getActiveSources(db, id),
    getSeenItems(db, id),
    getLastPublishedMessage(db, id),
    resolveAnthropicKey(db),
  ]);
  const result = await RUNNERS[id](
    { sources, seen, previousMessage },
    {
      fetchBody: fetchSourceBody,
      generate: (prompt) => callClaude(prompt, newsletter.model, anthropicKey),
      now: () => new Date(),
    }
  );

  const base = {
    newsletterId: id,
    trigger: options.trigger,
    pills: result.pills,
    stats: { ...result.stats },
    model: newsletter.model,
  };

  if (result.status !== "ready") {
    const detail = result.status === "skipped" ? result.reason : result.error;
    const editionId = await saveEdition(db, {
      ...base,
      status: result.status,
      message: null,
      error: detail,
      usage: null,
      slackTs: null,
    });
    return { editionId, status: result.status, detail };
  }

  let slackTs: string | null = null;
  let slackError: string | null = null;
  if (options.publish) {
    try {
      slackTs = await postToSlack(newsletter.slack_channel_id, result.message, await resolveSlackToken(db));
    } catch (error) {
      slackError = error instanceof Error ? error.message : String(error);
    }
  }

  // If Slack failed, keep the generated bulletin as a preview so it can be re-sent without paying for Claude again.
  const published = options.publish && !slackError;
  const editionId = await saveEdition(db, {
    ...base,
    status: published ? "published" : "preview",
    message: result.message,
    error: slackError,
    usage: result.usage,
    slackTs,
  });
  if (published) await markSeen(db, id, editionId, result.pills);

  if (slackError) {
    return {
      editionId,
      status: "preview",
      detail: `No se publicó en Slack. ${slackError} La edición quedó como vista previa para reintentar.`,
      problem: true,
    };
  }
  return {
    editionId,
    status: published ? "published" : "preview",
    detail: published ? "Publicado en Slack." : "Vista previa generada.",
  };
}

/** Send a stored preview to Slack as-is. */
export async function publishPreview(editionId: string): Promise<RunOutcome> {
  const db = createServiceClient();
  const edition = await getEdition(db, editionId);
  if (edition.status !== "preview" || !edition.message) {
    throw new Error("Solo se pueden publicar ediciones en vista previa.");
  }

  const newsletter = await getNewsletter(db, edition.newsletter_id);
  const slackTs = await postToSlack(newsletter.slack_channel_id, edition.message, await resolveSlackToken(db));
  await markEditionPublished(db, editionId, slackTs);
  await markSeen(db, edition.newsletter_id, editionId, edition.pills);
  return { editionId, status: "published", detail: "Publicado en Slack." };
}
