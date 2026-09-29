"use client";

import { useCallback, useEffect, useState } from "react";
import { callSettingsApi, SecretKeyPanel } from "./SecretKeyPanel";

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

interface McpStatus {
  connected: boolean;
  expiresAt: string | null;
  canRefresh: boolean;
  expired: boolean;
  connectedAt: string | null;
  usingEnvFallback: boolean;
}

type Feedback = { tone: "ok" | "error"; text: string } | null;

const MCP_ENDPOINT = "/api/settings/ubits-mcp";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
}

/** Reads (and clears) the result the OAuth callback left in the URL. */
function takeCallbackFeedback(): Feedback {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("mcp_error");
  const connected = params.get("mcp") === "connected";
  if (!error && !connected) return null;
  params.delete("mcp");
  params.delete("mcp_error");
  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  return error ? { tone: "error", text: error } : { tone: "ok", text: "Conectado y verificado con run_query." };
}

/** The Ubits MCP has no static tokens: someone signs in with their Ubits account and Nexión keeps the session. */
export function UbitsMcpSettingsPanel() {
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await callSettingsApi<McpStatus>(MCP_ENDPOINT, "GET"));
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cargar el estado." });
    }
  }, []);

  useEffect(() => {
    setFeedback(takeCallbackFeedback());
    load();
  }, [load]);

  const handleConnect = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const { authorizeUrl } = await callSettingsApi<{ authorizeUrl: string }>(`${MCP_ENDPOINT}/connect`, "POST");
      window.location.assign(authorizeUrl);
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "No se pudo iniciar la conexión." });
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("¿Desconectar el MCP de Ubits? El Pulso quincenal dejará de leer BigQuery.")) return;
    setBusy(true);
    try {
      await callSettingsApi(MCP_ENDPOINT, "DELETE");
      await load();
      setFeedback({ tone: "ok", text: "Desconectado." });
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "No se pudo desconectar." });
    } finally {
      setBusy(false);
    }
  };

  const healthy = status?.connected && !status.expired;

  return (
    <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
      <div className="flex items-center gap-3 mb-6">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2ec6ff" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
        </svg>
        <div>
          <h2 className="text-lg font-semibold text-white">MCP de Ubits (BigQuery)</h2>
          <p className="text-xs text-white/40">Con esta conexión el Pulso quincenal lee NSM, ARR y operación desde BigQuery</p>
        </div>
      </div>

      <div className="space-y-4 max-w-lg">
        <div className="flex items-start gap-2 text-xs">
          <span className={`mt-1 w-2 h-2 shrink-0 rounded-full ${healthy ? "bg-emerald-400" : status?.expired ? "bg-accent" : "bg-white/20"}`} aria-hidden />
          <div className="space-y-0.5">
            {status === null && <span className="text-white/40">Revisando…</span>}
            {status && !status.connected && (
              <span className="text-white/50">
                {status.usingEnvFallback ? "Usando el token del servidor (UBITS_MCP_TOKEN)" : "Sin conectar: el Pulso quincenal no puede leer BigQuery"}
              </span>
            )}
            {status?.connected && (
              <>
                <p className="text-white/70">
                  {status.expired ? "La sesión venció: reconéctala" : "Conectado"}
                  {status.connectedAt && <span className="text-white/40"> · desde {formatDateTime(status.connectedAt)}</span>}
                </p>
                <p className="text-white/40">
                  {status.canRefresh
                    ? "Nexión renueva la sesión sola."
                    : status.expiresAt
                      ? `La sesión vence el ${formatDateTime(status.expiresAt)}; Ubits no permite renovarla sin volver a iniciar sesión.`
                      : "Ubits no indicó cuándo vence la sesión."}
                </p>
              </>
            )}
          </div>
        </div>

        <p className="text-[10px] text-white/30 ml-1">
          Abre el inicio de sesión de <span className="font-mono">ubits-mcp.com</span> con tu correo de Ubits, igual que en Claude Desktop. Al volver,
          Nexión verifica que la herramienta <span className="font-mono">run_query</span> responda. El token queda solo en el servidor.
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleConnect}
            disabled={busy}
            className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
          >
            {busy ? "Abriendo..." : status?.connected ? "Reconectar con Ubits" : "Conectar con Ubits"}
          </button>
          {status?.connected && (
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="px-4 py-2 text-white/40 hover:text-red-300 text-[10px] font-black tracking-widest uppercase rounded-xl transition-colors disabled:opacity-50"
            >
              Desconectar
            </button>
          )}
        </div>

        {feedback && (
          <div
            role="status"
            className={`rounded-xl p-4 border ${feedback.tone === "ok" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
          >
            <p className={`text-xs font-bold ${feedback.tone === "ok" ? "text-green-400" : "text-red-400"}`}>
              {feedback.tone === "ok" ? "✓ " : "Error: "}
              {feedback.text}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
