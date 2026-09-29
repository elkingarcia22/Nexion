/**
 * Newsletters whose pipeline already runs in Nexión. The rest have their catalog here but still
 * run in n8n until migrated. Client-safe (no server imports) so the UI can hide run actions.
 */
export const PIPELINE_READY_IDS = ["ia-news-day", "hr-radar", "radar-producto"] as const;

export type PipelineId = (typeof PIPELINE_READY_IDS)[number];

export function hasPipeline(id: string): id is PipelineId {
  return (PIPELINE_READY_IDS as readonly string[]).includes(id);
}
