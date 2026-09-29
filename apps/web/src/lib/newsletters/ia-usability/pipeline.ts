import { runNewsPipeline } from "../engine/run";
import type { NewsProfile, PipelineDeps, PipelineInput, PipelineResult } from "../engine/types";
import { createValidator } from "../engine/validate";
import { buildTipsPrompt, PILLS_COUNT, rankTips, selectTipShortlist, SHORTLIST_SIZE, shortlistTips } from "./editorial";

export const validateTipsMessage = createValidator({
  headerMarker: ":books:",
  headerPattern: /^:books:\s+\*IA Usability & Prompts/i,
  headerHint: ":books: *IA Usability & Prompts",
  minChars: 450,
  requirePillLabels: true,
  forbidden: [/lista final de fuentes/i, /idea central/i, /la ia redefine el futuro/i],
});

/**
 * IA, Usabilidad y Prompts: 2 weekly practical tips. Nexión drops navigation links, promos and
 * events and offers a varied shortlist; the model picks the 2 most applicable from different pillars.
 */
export const iaUsabilityProfile: NewsProfile = {
  pillsCount: PILLS_COUNT,
  modelPicks: { shortlistSize: SHORTLIST_SIZE },
  shortlist: shortlistTips,
  rank: (articles) => rankTips(articles),
  select: selectTipShortlist,
  buildPrompt: buildTipsPrompt,
  validate: validateTipsMessage,
};

export function runIaUsability(input: PipelineInput, deps: PipelineDeps): Promise<PipelineResult> {
  return runNewsPipeline(iaUsabilityProfile, input, deps);
}
