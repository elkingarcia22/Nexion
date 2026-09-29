import { runNewsPipeline } from "../engine/run";
import type { NewsProfile, PipelineDeps, PipelineInput, PipelineResult } from "../engine/types";
import { createValidator } from "../engine/validate";
import {
  buildProductPrompt,
  PILLS_COUNT,
  rankProductUpdates,
  selectProductShortlist,
  SHORTLIST_SIZE,
  shortlistProductUpdates,
} from "./editorial";

export const validateProductMessage = createValidator({
  headerMarker: ":dart:",
  headerPattern: /^:dart:\s+\*Radar de Producto/i,
  headerHint: ":dart: *Radar de Producto",
  minChars: 350,
  requirePillLabels: false,
  forbidden: [/lista final de fuentes/i, /NO_PUBLICAR/, /por qué importa para UBITS/i],
});

/**
 * Radar de Producto: 2 weekly pills on what HR-tech competitors shipped. Nexión filters hubs,
 * docs, events and corporate noise and offers a shortlist with one story per competitor; the
 * model picks the 2 most relevant for Ubits and writes them.
 */
export const radarProductoProfile: NewsProfile = {
  pillsCount: PILLS_COUNT,
  modelPicks: { shortlistSize: SHORTLIST_SIZE },
  shortlist: shortlistProductUpdates,
  rank: (articles) => rankProductUpdates(articles),
  select: selectProductShortlist,
  buildPrompt: buildProductPrompt,
  validate: validateProductMessage,
};

export function runRadarProducto(input: PipelineInput, deps: PipelineDeps): Promise<PipelineResult> {
  return runNewsPipeline(radarProductoProfile, input, deps);
}
