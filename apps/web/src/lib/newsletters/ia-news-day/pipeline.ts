import { runNewsPipeline } from "../engine/run";
import type { NewsProfile, PipelineDeps, PipelineInput, PipelineResult } from "../engine/types";
import { balanceCandidates } from "./candidates";
import { buildPrompt, rankArticles, selectPills } from "./editorial";
import { validateMessage } from "./validate";

export type { PipelineDeps, PipelineInput, PipelineResult, PipelineStats } from "../engine/types";

export const REQUIRED_PILLS = 2;

/** IA News Day: 2 current AI stories from different angles, every weekday. */
export const iaNewsDayProfile: NewsProfile = {
  pillsCount: REQUIRED_PILLS,
  shortlist: balanceCandidates,
  rank: rankArticles,
  select: selectPills,
  buildPrompt: (pills, context) => buildPrompt(pills, context.dateLabel),
  validate: validateMessage,
};

/** Fetch sources, pick 2 unseen stories, and have the model write a validated Slack message. */
export function runIaNewsDay(input: PipelineInput, deps: PipelineDeps): Promise<PipelineResult> {
  return runNewsPipeline(iaNewsDayProfile, input, deps);
}
