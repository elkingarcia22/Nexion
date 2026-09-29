import { canonicalUrl } from "../text";
import type { ValidationResult } from "./types";

export interface MessageFormat {
  /** Text the message must start with, e.g. ":robot_face:". Anything before it is discarded. */
  headerMarker: string;
  /** Full header check, e.g. /^:robot_face:\s+\*IA News Day/i. */
  headerPattern: RegExp;
  headerHint: string;
  minChars: number;
  /** When true, each pill must be labelled "PILL 1", "PILL 2"… exactly once. */
  requirePillLabels: boolean;
  forbidden: RegExp[];
}

/** Strip code fences and anything the model wrote before the header. */
export function normalizeMessage(raw: string, headerMarker: string): string {
  let text = raw
    .replace(/ /g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/```(?:markdown|md|text)?/gi, "")
    .trim();

  const headerIndex = text.indexOf(headerMarker);
  if (headerIndex > 0) text = text.slice(headerIndex);

  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}

/** URLs of the `<url|Leer más ↗>` links, in order. */
export function readMoreUrls(message: string): string[] {
  return Array.from(message.matchAll(/<([^|>]+)\|([^>]+)>/g))
    .filter((match) => /Leer más/i.test(match[2]))
    .map((match) => canonicalUrl(match[1]));
}

/**
 * Builds a validator that checks the model output follows the format and links exactly the
 * selected stories (as `<url|Leer más ↗>`), so a hallucinated or malformed bulletin never reaches Slack.
 */
export function createValidator(format: MessageFormat) {
  return function validate(raw: string, urls: string[], pick?: number): ValidationResult {
    const message = normalizeMessage(raw, format.headerMarker);
    const fail = (error: string): ValidationResult => ({ ok: false, error });

    if (message.length < format.minChars) return fail(`El boletín quedó demasiado corto (${message.length} caracteres).`);
    if (!format.headerPattern.test(message)) return fail(`El boletín no inicia con "${format.headerHint}".`);

    const pillCount = pick ?? urls.length;
    if (format.requirePillLabels) {
      for (let pill = 1; pill <= pillCount; pill++) {
        const count = (message.match(new RegExp(`PILL\\s*${pill}\\b`, "gi")) || []).length;
        if (count !== 1) return fail(`Debe haber exactamente una PILL ${pill} (hay ${count}).`);
      }
    }

    const found = readMoreUrls(message);
    if (found.length !== pillCount) {
      return fail(`Debe haber ${pillCount} links "Leer más ↗" (hay ${found.length}).`);
    }
    const allowed = urls.map(canonicalUrl);
    if (pick === undefined) {
      const missing = allowed.filter((url) => !found.includes(url));
      if (missing.length) return fail(`El boletín no usó las URLs seleccionadas: ${missing.join(" | ")}`);
    } else {
      const outside = found.filter((url) => !allowed.includes(url));
      if (outside.length) return fail(`El boletín usó URLs que no estaban en la lista: ${outside.join(" | ")}`);
      if (new Set(found).size !== found.length) return fail("El boletín repitió la misma fuente en dos pills.");
    }

    const forbidden = format.forbidden.find((pattern) => pattern.test(message));
    if (forbidden) return fail(`El boletín contiene una frase prohibida (${forbidden.source}).`);

    return { ok: true, message };
  };
}
