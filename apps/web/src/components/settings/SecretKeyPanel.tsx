"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface SecretStatus {
  configured: boolean;
  last4: string | null;
  usingEnvFallback?: boolean;
}

type Feedback = { tone: "ok" | "error"; text: string } | null;

export interface SecretKeyPanelProps {
  /** API route that stores the secret, e.g. "/api/settings/claude". */
  endpoint: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  inputLabel: string;
  placeholder: string;
  /** Shown before the last 4 characters of a saved value, e.g. "sk-ant-". */
  maskPrefix: string;
  help: ReactNode;
  envFallbackLabel: string;
  missingLabel: string;
  removeConfirm: string;
}

/** Authenticated call to a /api/settings/* route with the user's Supabase session. */
export async function callSettingsApi<T = SecretStatus>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Inicia sesión con Google para administrar esta clave (el modo demo no puede).");

  const response = await fetch(endpoint, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? `Error ${response.status}`);
  return json as T;
}

/** Write-only field for an organization secret: shows only whether it is set and its last 4 characters. */
export function SecretKeyPanel(props: SecretKeyPanelProps) {
  const { endpoint } = props;
  const inputId = `secret-${endpoint.split("/").pop()}`;
  const [status, setStatus] = useState<SecretStatus | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await callSettingsApi(endpoint, "GET"));
    } catch (error) {
      setStatus({ configured: false, last4: null });
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cargar el estado." });
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<SecretStatus>, successText: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      setStatus(await action());
      setValue("");
      setFeedback({ tone: "ok", text: successText });
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => run(() => callSettingsApi(endpoint, "PUT", { value }), "Verificado y guardado.");
  const handleRemove = () => {
    if (!window.confirm(props.removeConfirm)) return;
    run(() => callSettingsApi(endpoint, "DELETE"), "Eliminado.");
  };

  const isSet = status?.configured || status?.usingEnvFallback;

  return (
    <section className="bg-card rounded-xl border border-white/20 shadow-soft p-6">
      <div className="flex items-center gap-3 mb-6">
        {props.icon}
        <div>
          <h2 className="text-lg font-semibold text-white">{props.title}</h2>
          <p className="text-xs text-white/40">{props.subtitle}</p>
        </div>
      </div>

      <div className="space-y-4 max-w-lg">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isSet ? "bg-emerald-400" : "bg-white/20"}`} aria-hidden />
          {status === null && <span className="text-white/40">Revisando…</span>}
          {status?.configured && (
            <span className="text-white/70">
              Guardado <span className="font-mono text-white/40">{props.maskPrefix}…{status.last4}</span>
            </span>
          )}
          {status && !status.configured && status.usingEnvFallback && (
            <span className="text-white/70">{props.envFallbackLabel}</span>
          )}
          {status && !status.configured && !status.usingEnvFallback && (
            <span className="text-white/50">{props.missingLabel}</span>
          )}
        </div>

        <div>
          <label htmlFor={inputId} className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
            {status?.configured ? "Reemplazar" : props.inputLabel}
          </label>
          <input
            id={inputId}
            type="password"
            autoComplete="off"
            placeholder={props.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary mt-1 font-mono"
          />
          <p className="text-[10px] text-white/30 mt-2 ml-1">{props.help}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={busy || !value.trim()}
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
