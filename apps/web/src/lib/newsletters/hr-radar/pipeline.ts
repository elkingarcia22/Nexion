import { runNewsPipeline } from "../engine/run";
import type { NewsProfile, PipelineDeps, PipelineInput, PipelineResult } from "../engine/types";
import { createValidator } from "../engine/validate";
import { buildHrPrompt, PILLS_COUNT, rankHrArticles, selectHrPills, SHORTLIST_SIZE, shortlistHr } from "./editorial";

export const validateHrMessage = createValidator({
  headerMarker: ":busts_in_silhouette:",
  headerPattern: /^:busts_in_silhouette:\s+\*HR Radar/i,
  headerHint: ":busts_in_silhouette: *HR Radar",
  minChars: 500,
  requirePillLabels: false,
  forbidden: [
    /lista final de fuentes/i,
    // Section headings the prompt forbids (the word "tendencias" alone is fine inside a sentence).
    /^\s*\*?(panorama general|tendencias|implicaciones|acciones sugeridas)\*?\s*:?\s*$/im,
  ],
});

/**
 * HR Radar: 2 weekly pills on HR and HR tech. Nexión filters noise and offers a varied shortlist;
 * the model picks the 2 most valuable stories from different pillars and writes them.
 */
export const hrRadarProfile: NewsProfile = {
  pillsCount: PILLS_COUNT,
  modelPicks: { shortlistSize: SHORTLIST_SIZE },
  shortlist: shortlistHr,
  rank: (articles) => rankHrArticles(articles),
  select: selectHrPills,
  buildPrompt: buildHrPrompt,
  validate: validateHrMessage,
};

export function runHrRadar(input: PipelineInput, deps: PipelineDeps): Promise<PipelineResult> {
  return runNewsPipeline(hrRadarProfile, input, deps);
}
