"use client";

import { SecretKeyPanel } from "./SecretKeyPanel";

export function SlackBotSettingsPanel() {
  return (
    <SecretKeyPanel
      endpoint="/api/settings/slack"
      title="Slack bot"
      subtitle="Token con el que los Boletines publican mensajes en Slack"
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2ec6ff" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M4 9h16M4 15h16M9 4l-2 16M17 4l-2 16" />
        </svg>
      }
      inputLabel="Bot User OAuth Token"
      placeholder="xoxb-..."
      maskPrefix="xoxb-"
      help={
        <>
          En{" "}
          <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            api.slack.com/apps
          </a>{" "}
          → OAuth &amp; Permissions. Necesita el permiso <span className="font-mono">chat:write</span>; se comprueba al guardar. El bot debe estar
          invitado al canal del boletín.
        </>
      }
      envFallbackLabel="Usando el token del servidor (SLACK_BOT_TOKEN)"
      missingLabel="Sin token: los boletines no se pueden publicar"
      removeConfirm="¿Eliminar el token de Slack? Los boletines dejarán de publicarse hasta que agregues otro."
    />
  );
}
