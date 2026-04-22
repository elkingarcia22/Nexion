"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createSource } from "@/lib/services/source-service";
import { getUserWorkspace } from "@/lib/services/workspace-service";

const SOURCE_TYPES = [
  { value: "google_doc", label: "Google Doc", serviceType: "document" },
  { value: "google_sheet", label: "Google Sheet", serviceType: "document" },
  { value: "drive_resource", label: "Recurso de Drive", serviceType: "document" },
  { value: "transcription", label: "Transcripción", serviceType: "meeting" },
  { value: "meeting_note", label: "Nota de reunión", serviceType: "meeting" },
  { value: "feedback_meeting", label: "Reunión de feedback", serviceType: "feedback" },
  { value: "gemini_note", label: "Nota de Gemini", serviceType: "manual" },
  { value: "other", label: "Otro", serviceType: "manual" },
];

interface AddSourceDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (source?: { name: string; url: string; type: string }) => void;
  sourceDate?: Date;
}

export function AddSourceDrawer({ open, onClose, onAdd, sourceDate }: AddSourceDrawerProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [urlError, setUrlError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setName("");
      setUrl("");
      setType("");
      setUrlError("");
      setGeneralError("");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const validateUrl = (val: string) => {
    if (!val) return "La URL es obligatoria.";
    try {
      new URL(val);
      return "";
    } catch {
      return "Ingresa una URL válida (ej: https://docs.google.com/…)";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    const err = validateUrl(url);
    if (err) { setUrlError(err); return; }
    if (!type) return;

    setSubmitting(true);

    try {
      // 1. Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setGeneralError("Debes iniciar sesión para añadir fuentes.");
        setSubmitting(false);
        return;
      }

      // 2. Get workspace
      const { data: workspace, error: wsError } = await getUserWorkspace(session.user.id);
      if (wsError || !workspace) {
        setGeneralError("No se pudo encontrar tu workspace.");
        setSubmitting(false);
        return;
      }

      // 3. Map type and call service
      const selectedType = SOURCE_TYPES.find(t => t.value === type);
      const serviceType = (selectedType?.serviceType || "manual") as any;

      const result = await createSource({
        title: name || url,
        url: url,
        type: serviceType,
        workspaceId: workspace.id,
        createdBy: session.user.id,
        sourceDate: sourceDate?.toISOString()
      });

      if (!result.success) {
        setGeneralError(result.error || "Error al registrar la fuente.");
        setSubmitting(false);
        return;
      }

      // 4. Success callback
      onAdd({ name: name || url, url, type });
      setSubmitting(false);
      onClose();
    } catch (err) {
      console.error("Submission error:", err);
      setGeneralError("Error inesperado. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  const selectedTypeLabel = SOURCE_TYPES.find((t) => t.value === type)?.label ?? "";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-navy/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-screen w-[420px] bg-white z-50 flex flex-col shadow-hard transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
          <div>
            <h2 className="text-base font-bold text-navy">Añadir fuente</h2>
            <p className="text-xs text-navy/50 mt-0.5">
              Pega la URL del recurso que quieres analizar
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-navy/40 hover:bg-gray-100 hover:text-navy transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          {/* Info box */}
          <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <svg className="text-primary flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-primary/80 leading-relaxed">
              Nexión detecta automáticamente recursos desde tu cuenta de Google. Usa este formulario para añadir fuentes externas o URLs específicas que quieras analizar manualmente.
            </p>
          </div>

          {/* URL field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-navy/70 uppercase tracking-wider">
              URL del recurso <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
              onBlur={() => setUrlError(validateUrl(url))}
              placeholder="https://docs.google.com/document/d/..."
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                urlError
                  ? "border-red-300 bg-red-50 focus:border-red-400"
                  : "border-border/30 bg-gray-50 focus:border-primary focus:bg-white"
              }`}
            />
            {urlError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                {urlError}
              </p>
            )}
          </div>

          {/* Type field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-navy/70 uppercase tracking-wider">
              Tipo de recurso <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    type === t.value
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border/20 bg-gray-50 text-navy/60 hover:border-border/50 hover:text-navy"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {!type && (
              <p className="text-xs text-navy/40">Selecciona el tipo de recurso</p>
            )}
          </div>

          {/* Name field (optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-navy/70 uppercase tracking-wider">
              Nombre{" "}
              <span className="text-navy/30 normal-case tracking-normal font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Minuta reunión SteelCore 24 Oct"
              className="w-full px-4 py-3 rounded-xl border border-border/30 bg-gray-50 text-sm outline-none focus:border-primary focus:bg-white transition-all"
            />
            <p className="text-xs text-navy/40">
              Si no lo completás, se usará la URL como identificador.
            </p>
          </div>

          {/* Preview */}
          {(url || type) && (
            <div className="p-4 rounded-xl bg-bg border border-border/20 space-y-2">
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Vista previa</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{name || url || "Sin nombre"}</p>
                  {selectedTypeLabel && (
                    <span className="text-[10px] font-bold tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                      {selectedTypeLabel.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="ml-auto text-[10px] font-bold tracking-widest px-2 py-1 rounded-md bg-yellow-50 text-yellow-600 flex-shrink-0">
                  PENDIENTE
                </span>
              </div>
            </div>
          )}
        </form>

        {/* General Error */}
        {generalError && (
          <div className="px-6 mb-2">
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {generalError}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border/20 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-border/30 text-sm font-semibold text-navy/60 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url || !type || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                </svg>
                Añadir fuente
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
