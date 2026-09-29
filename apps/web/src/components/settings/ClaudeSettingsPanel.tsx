"use client";

import { SecretKeyPanel } from "./SecretKeyPanel";

export function ClaudeSettingsPanel() {
  return (
    <SecretKeyPanel
      endpoint="/api/settings/claude"
      title="Claude AI"
      subtitle="Clave de Anthropic que usan los Boletines para redactar las pills"
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f49e04" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
        </svg>
      }
      inputLabel="Anthropic API Key"
      placeholder="sk-ant-..."
      maskPrefix="sk-ant-"
      help={
        <>
          Créala en{" "}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            console.anthropic.com
          </a>
          . Se verifica antes de guardarse y nunca vuelve a mostrarse completa.
        </>
      }
      envFallbackLabel="Usando la clave del servidor (ANTHROPIC_API_KEY)"
      missingLabel="Sin clave: los boletines no se pueden generar"
      removeConfirm="¿Eliminar la clave de Claude? Los boletines dejarán de generarse hasta que agregues otra."
    />
  );
}
