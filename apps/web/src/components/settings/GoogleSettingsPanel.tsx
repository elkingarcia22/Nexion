"use client";

import { useCallback, useEffect, useState } from "react";
import { callSettingsApi } from "./SecretKeyPanel";

const ENDPOINT = "/api/settings/google";

interface GoogleStatus {
  configured: boolean;
  clientId: string | null;
  last4: string | null;
  usingEnvFallback?: boolean;
}

type Feedback = { tone: "ok" | "error"; text: string } | null;

const INPUT_CLASS =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary mt-1 font-mono";
const LABEL_CLASS = "text-[10px] font-black text-white/40 uppercase tracking-widest ml-1";

/** OAuth client (ID + secret) used to refresh Google Drive, Calendar and Sheets tokens. */
export function GoogleSettingsPanel() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await callSettingsApi<GoogleStatus>(ENDPOINT, "GET"));
    } catch (error) {
      setStatus({ configured: false, clientId: null, last4: null });
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cargar el estado." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<GoogleStatus>, successText: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      setStatus(await action());
      setClientId("");
      setClientSecret("");
      setFeedback({ tone: "ok", text: successText });
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () =>
    run(() => callSettingsApi<GoogleStatus>(ENDPOINT, "PUT", { clientId, clientSecret }), "Cliente OAuth verificado y guardado.");
  const handleRemove = () => {
    if (!window.confirm("¿Eliminar el cliente OAuth de Google? Drive, Calendar y Sheets dejarán de renovar su acceso.")) return;
    run(() => callSettingsApi<GoogleStatus>(ENDPOINT, "DELETE"), "Eliminado.");
  };

  const isSet = status?.configured || status?.usingEnvFallback;

  return (
    <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
      <div className="flex items-center gap-3 mb-6">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2ec6ff" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12h8M12 3a9 9 0 0 1 8 5" />
        </svg>
        <div>
          <h2 className="text-lg font-semibold text-white">Google</h2>
          <p className="text-xs text-white/40">Cliente OAuth con el que Nexión renueva el acceso a Drive, Calendar y Sheets</p>
        </div>
      </div>

      <div className="space-y-4 max-w-lg">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isSet ? "bg-emerald-400" : "bg-white/20"}`} aria-hidden />
          {status === null && <span className="text-white/40">Revisando…</span>}
          {status?.configured && (
            <span className="text-white/70 truncate">
              Guardado <span className="font-mono text-white/40">{status.clientId?.split("-")[0]}… · secret …{status.last4}</span>
            </span>
          )}
          {status && !status.configured && status.usingEnvFallback && (
            <span className="text-white/70">Usando el cliente del servidor (GOOGLE_CLIENT_ID)</span>
          )}
          {status && !status.configured && !status.usingEnvFallback && (
            <span className="text-white/50">Sin configurar: Drive, Calendar y Sheets no podrán renovar su acceso</span>
          )}
        </div>

        <div>
          <label htmlFor="google-client-id" className={LABEL_CLASS}>Client ID</label>
          <input
            id="google-client-id"
            type="text"
            autoComplete="off"
            placeholder="123456789-abc.apps.googleusercontent.com"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="google-client-secret" className={LABEL_CLASS}>Client Secret</label>
          <input
            id="google-client-secret"
            type="password"
            autoComplete="off"
            placeholder="GOCSPX-..."
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className={INPUT_CLASS}
          />
          <p className="text-[10px] text-white/30 mt-2 ml-1">
            En{" "}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Google Cloud → Credenciales
            </a>
            , el mismo cliente OAuth configurado en Supabase Auth. Se verifica con Google antes de guardarse.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={busy || !clientId.trim() || !clientSecret.trim()}
            className="px-4 py-2 bg-primary text-white text-[10px] font-black tracking-widest uppercase rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50"
          >
            {busy ? "Verificando..." : "Guardar"}
          </button>
          {status?.configured && (
            <button
              onClick={handleRemove}
              disabled={busy}
              className="px-4 py-2 text-white/40 hover:text-red-300 text-[10px] font-black tracking-widest uppercase rounded-xl transition-colors disabled:opacity-50"
            >
              Eliminar
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
