"use client";

import { SecretKeyPanel } from "./SecretKeyPanel";

export function PosthogSettingsPanel() {
  return (
    <SecretKeyPanel
      endpoint="/api/settings/posthog"
      title="PostHog"
      subtitle="Llave con la que Analítica de producto consulta uso, funnels, fricción y grabaciones"
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f49e04" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M3 20h18M6 16l4-5 4 3 5-7" />
        </svg>
      }
      inputLabel="Personal API Key"
      placeholder="phx_..."
      maskPrefix="phx_"
      help={
        <>
          En{" "}
          <a href="https://us.posthog.com/settings/user-api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            PostHog → Personal API keys
          </a>
          , con permisos de lectura de <span className="font-mono">query</span> y{" "}
          <span className="font-mono">session_recording</span>. Se verifica antes de guardarse.
        </>
      }
      envFallbackLabel="Usando la llave del servidor (POSTHOG_API_KEY)"
      missingLabel="Sin llave: el Radar semanal no puede consultar PostHog"
      removeConfirm="¿Eliminar la llave de PostHog? El Radar semanal dejará de generarse."
    />
  );
}

export function UbitsMcpSettingsPanel() {
  return (
    <SecretKeyPanel
      endpoint="/api/settings/ubits-mcp"
      title="MCP de Ubits (BigQuery)"
      subtitle="Token con el que el Pulso quincenal lee NSM, ARR y operación desde BigQuery"
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2ec6ff" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
        </svg>
      }
      inputLabel="Token del servidor"
      placeholder="Token de ubits-mcp.com"
      maskPrefix=""
      help={
        <>
          Token de servidor de <span className="font-mono">ubits-mcp.com</span> con acceso a la herramienta{" "}
          <span className="font-mono">run_query</span>. Al guardar, Nexión abre una sesión con el MCP para verificarlo.
        </>
      }
      envFallbackLabel="Usando el token del servidor (UBITS_MCP_TOKEN)"
      missingLabel="Sin token: el Pulso quincenal no puede leer BigQuery"
      removeConfirm="¿Eliminar el token del MCP de Ubits? El Pulso quincenal dejará de generarse."
    />
  );
}
