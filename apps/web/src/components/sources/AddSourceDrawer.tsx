"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createSource, updateSource } from "@/lib/services/source-service";
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
  editMode?: boolean;
  onEditData?: {
    id: string;
    title: string;
    url: string | null;
    sourceType: string;
    sourceOrigin: string;
    metadata: any;
  } | null;
}

export function AddSourceDrawer(props: AddSourceDrawerProps) {
  const { open, onClose, onAdd, sourceDate, editMode, onEditData } = props;
  const [sourceMode, setSourceMode] = useState<"url" | "manual">("url");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualFiles, setManualFiles] = useState<File[]>([]);
  const [urlError, setUrlError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");

useEffect(() => {
    if (editMode && onEditData) {
      setName(onEditData.title || "");
      setUrl(onEditData.url || "");
      const slackMessages = onEditData.metadata?.messages;
      const slackPreview = onEditData.metadata?.preview;
      if (slackMessages || slackPreview) {
        setManualContent(slackPreview || JSON.stringify(slackMessages, null, 2));
      } else {
        setManualContent(onEditData.metadata?.content || "");
      }
      if (!onEditData.url) {
        setSourceMode("manual");
      } else {
        setSourceMode("url");
      }
      if (onEditData.sourceType) {
        const found = SOURCE_TYPES.find(t => t.serviceType === onEditData.sourceType || t.value === onEditData.sourceType);
        if (found) setType(found.value);
        else setType(onEditData.sourceType as any);
      }
    }
  }, [editMode, onEditData]);

  useEffect(() => {
    if (open && !editMode) {
      setName("");
      setUrl("");
      setType("");
      setManualContent("");
      setManualFiles([]);
      setUrlError("");
      setGeneralError("");
      setSourceMode("url");
    }
  }, [open, editMode]);

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
      return "Ingresa una URL válida";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    console.log("[AddSourceDrawer.handleSubmit] Starting - sourceMode:", sourceMode, "editMode:", editMode);
    console.log("[AddSourceDrawer.handleSubmit] name:", name, "url:", url, "type:", type);

    if (sourceMode === "manual") {
      if (!name.trim()) {
        setGeneralError("Añade un nombre para la fuente.");
        console.warn("[AddSourceDrawer.handleSubmit] Manual mode but no name");
        return;
      }
    } else {
      const err = validateUrl(url);
      if (err) {
        setUrlError(err);
        console.warn("[AddSourceDrawer.handleSubmit] URL validation error:", err);
        return;
      }
    }

    if (!type) {
      console.warn("[AddSourceDrawer.handleSubmit] No type selected");
      return;
    }

    setSubmitting(true);

    try {
      const selectedType = SOURCE_TYPES.find(t => t.value === type);
      const serviceType = (selectedType?.serviceType || "manual") as any;

      console.log("[AddSourceDrawer.handleSubmit] Selected type:", selectedType, "serviceType:", serviceType);

      let metadata: any = {};

      if (editMode && onEditData?.metadata) {
        metadata = { ...onEditData.metadata };
      }

      if (sourceMode === "manual") {
        if (manualContent) metadata.content = manualContent;
        if (manualFiles.length > 0) metadata.fileNames = manualFiles.map(f => f.name);
        metadata.isManual = true;
      }

      if (editMode && onEditData?.id) {
        console.log("[AddSourceDrawer.handleSubmit] Updating existing source:", onEditData.id);
        const result = await updateSource({
          id: onEditData.id,
          title: name,
          url: sourceMode === "url" ? url : undefined,
          type: serviceType,
          metadata
        });

        console.log("[AddSourceDrawer.handleSubmit] Update result:", result);

        if (!result.success) {
          setGeneralError(result.error || "Error al actualizar.");
          setSubmitting(false);
          console.error("[AddSourceDrawer.handleSubmit] Update error:", result.error);
          return;
        }

        onAdd({ name: name, url: sourceMode === "url" ? url : "", type });
      } else {
        console.log("[AddSourceDrawer.handleSubmit] Creating new source");
        const { data: { session } } = await supabase.auth.getSession();

        console.log("[AddSourceDrawer.handleSubmit] Session user:", session?.user?.id);

        if (!session?.user) {
          setGeneralError("Debes iniciar sesión.");
          setSubmitting(false);
          console.error("[AddSourceDrawer.handleSubmit] No session");
          return;
        }

        const { data: workspace, error: wsError } = await getUserWorkspace(session.user.id);

        console.log("[AddSourceDrawer.handleSubmit] Workspace:", workspace, "error:", wsError);

        if (wsError || !workspace) {
          setGeneralError("No se pudo encontrar workspace.");
          setSubmitting(false);
          console.error("[AddSourceDrawer.handleSubmit] Workspace error:", wsError);
          return;
        }

        console.log("[AddSourceDrawer.handleSubmit] About to create source with:", {
          title: name || (sourceMode === "url" ? url : "Fuente manual"),
          url: sourceMode === "url" ? url : undefined,
          type: serviceType,
          workspaceId: workspace.id,
          createdBy: session.user.id,
        });

        const result = await createSource({
          title: name || (sourceMode === "url" ? url : "Fuente manual"),
          url: sourceMode === "url" ? url : undefined,
          type: serviceType,
          workspaceId: workspace.id,
          createdBy: session.user.id,
          sourceDate: sourceDate?.toISOString(),
          metadata
        });

        console.log("[AddSourceDrawer.handleSubmit] Create result:", result);

        if (!result.success) {
          setGeneralError(result.error || "Error al registrar.");
          setSubmitting(false);
          console.error("[AddSourceDrawer.handleSubmit] Create error:", result.error);
          return;
        }

        console.log("[AddSourceDrawer.handleSubmit] Source created successfully, calling onAdd");
        onAdd({
          name: name || (sourceMode === "url" ? url : "Fuente manual"),
          url: sourceMode === "url" ? url : "",
          type
        });
      }

      setSubmitting(false);
      onClose();
    } catch (err) {
      console.error("[AddSourceDrawer.handleSubmit] Unexpected error:", err);
      setGeneralError("Error inesperado.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 h-screen w-[420px] bg-[#161927] z-50 flex flex-col shadow-hard transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/20">
          <div>
            <h2 className="text-base font-bold text-white">
              {editMode ? "Editar fuente" : "Añadir fuente"}
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              {sourceMode === "url" ? "Pega la URL del recurso" : "Crea una fuente manual"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSourceMode("url")}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium ${sourceMode === "url" ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/60"}`}
            >
              Enlace
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("manual")}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium ${sourceMode === "manual" ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/60"}`}
            >
              Manual
            </button>
          </div>

          {sourceMode === "url" ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/70">URL <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                onBlur={() => setUrlError(validateUrl(url))}
                placeholder="https://..."
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${urlError ? "border-red-500" : "border-white/10 bg-[#161927] focus:border-primary"}`}
              />
              {urlError && <p className="text-xs text-red-500">{urlError}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/70">Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Minuta reunión"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#161927] text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-white/70">Tipo <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium ${type === t.value ? "border-primary bg-primary/10 text-primary" : "border-white/20 bg-[#161927] text-white/60"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {sourceMode === "manual" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/70">Contenido (opcional)</label>
              <textarea
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="Pega el contenido..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#161927] text-sm outline-none focus:border-primary resize-none"
              />
            </div>
          )}

          {generalError && <p className="text-xs text-red-500">{generalError}</p>}

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-sm font-semibold text-white/60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={(sourceMode === "url" ? !url : !name) || !type || submitting}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
            >
              {submitting ? "Guardando..." : editMode ? "Guardar cambios" : "Añadir fuente"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
