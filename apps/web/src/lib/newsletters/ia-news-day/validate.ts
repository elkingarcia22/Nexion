import { canonicalUrl } from "../text";

const MIN_MESSAGE_CHARS = 500;
const HEADER = ":robot_face:";
const FORBIDDEN_PHRASES = [/lista final de fuentes/i, /visión del día/i, /esto redefine el futuro/i];

export type ValidationResult = { ok: true; message: string } | { ok: false; error: string };

/** Strip code fences and anything the model wrote before the header. */
export function normalizeMessage(raw: string): string {
  let text = raw
    .replace(/ /g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/```(?:markdown|md|text)?/gi, "")
    .trim();

  const headerIndex = text.indexOf(HEADER);
  if (headerIndex > 0) text = text.slice(headerIndex);

  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}

function readMoreUrls(message: string): string[] {
  return Array.from(message.matchAll(/<([^|>]+)\|([^>]+)>/g))
    .filter((match) => /Leer más/i.test(match[2]))
    .map((match) => canonicalUrl(match[1]));
}

/**
 * Check the model output follows the format and links exactly the selected stories,
 * so a hallucinated or malformed bulletin never reaches Slack.
 */
export function validateMessage(raw: string, expectedUrls: string[]): ValidationResult {
  const message = normalizeMessage(raw);
  const fail = (error: string): ValidationResult => ({ ok: false, error });

  if (message.length < MIN_MESSAGE_CHARS) return fail(`El boletín quedó demasiado corto (${message.length} caracteres).`);
  if (!/^:robot_face:\s+\*IA News Day/i.test(message)) return fail('El boletín no inicia con ":robot_face: *IA News Day".');

  for (const pill of [1, 2]) {
    const count = (message.match(new RegExp(`PILL\\s*${pill}\\b`, "gi")) || []).length;
    if (count !== 1) return fail(`Debe haber exactamente una PILL ${pill} (hay ${count}).`);
  }

  const found = readMoreUrls(message);
  if (found.length !== expectedUrls.length) {
    return fail(`Debe haber ${expectedUrls.length} links "Leer más ↗" (hay ${found.length}).`);
  }
  const missing = expectedUrls.map(canonicalUrl).filter((url) => !found.includes(url));
  if (missing.length) return fail(`El boletín no usó las URLs seleccionadas: ${missing.join(" | ")}`);

  const forbidden = FORBIDDEN_PHRASES.find((pattern) => pattern.test(message));
  if (forbidden) return fail(`El boletín contiene una frase prohibida (${forbidden.source}).`);

  return { ok: true, message };
}
