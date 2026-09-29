import { createValidator, normalizeMessage as normalizeWithHeader } from "../engine/validate";

export type { ValidationResult } from "../engine/types";

const HEADER = ":robot_face:";

/** Strip code fences and anything the model wrote before the header. */
export function normalizeMessage(raw: string): string {
  return normalizeWithHeader(raw, HEADER);
}

/**
 * Check the model output follows the format and links exactly the selected stories,
 * so a hallucinated or malformed bulletin never reaches Slack.
 */
export const validateMessage = createValidator({
  headerMarker: HEADER,
  headerPattern: /^:robot_face:\s+\*IA News Day/i,
  headerHint: ":robot_face: *IA News Day",
  minChars: 500,
  requirePillLabels: true,
  forbidden: [/lista final de fuentes/i, /visión del día/i, /esto redefine el futuro/i],
});
