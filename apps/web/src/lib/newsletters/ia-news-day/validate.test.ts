import { describe, expect, it } from "vitest";
import { normalizeMessage, validateMessage } from "./validate";

const URLS = ["https://openai.com/index/a", "https://techcrunch.com/b"];
const FILLER = "Texto de la pill con suficiente contexto para que el equipo entienda la señal y actúe. ".repeat(3);

function bulletin(urls = URLS, extra = ""): string {
  return `:robot_face: *IA News Day · 29/09/2026*
Lo más útil de mirar hoy.

:zap: *PILL 1 · Agentes en producción*
${FILLER}
:point_right: Prueben un agente interno.
:link: <${urls[0]}|Leer más ↗>

:art: *PILL 2 · Precios de IA*
${FILLER}
:point_right: Revisen costos.
:link: <${urls[1]}|Leer más ↗>
${extra}`;
}

describe("validateMessage", () => {
  it("accepts a well-formed bulletin", () => {
    const result = validateMessage(bulletin(), URLS);
    expect(result.ok).toBe(true);
  });

  it("strips code fences and any preamble before the header", () => {
    const result = validateMessage("Claro, aquí va:\n```markdown\n" + bulletin() + "\n```", URLS);
    expect(result).toEqual({ ok: true, message: normalizeMessage(bulletin()) });
  });

  it("rejects a bulletin linking a URL that was not selected", () => {
    const result = validateMessage(bulletin([URLS[0], "https://invented.com/x"]), URLS);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("techcrunch.com/b");
  });

  it("rejects a bulletin that is too short or missing the header", () => {
    expect(validateMessage("hola", URLS).ok).toBe(false);
    expect(validateMessage(bulletin().replace(":robot_face:", ":fire:"), URLS).ok).toBe(false);
  });

  it("rejects hype phrases", () => {
    const result = validateMessage(bulletin(URLS, "Esto redefine el futuro."), URLS);
    expect(result.ok).toBe(false);
  });
});
