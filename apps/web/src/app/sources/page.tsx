"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateWorkspace } from "@/lib/services/workspace-service";
import {
  createSource,
  getSourcesByWorkspace,
  deleteSource,
  type Source,
} from "@/lib/services/source-service";
import {
  fetchGoogleDriveFiles,
  DriveFile,
  DriveFilter,
  getMimeTypeLabel,
  getMimeTypeIcon,
} from "@/lib/services/google-drive-service";

const FILTER_TABS: { key: DriveFilter; label: string; icon: string; desc: string }[] = [
  { key: "gemini", label: "Gemini / Meet", icon: "✨", desc: "Transcripciones y notas de reuniones con Gemini" },
  { key: "docs", label: "Google Docs", icon: "📝", desc: "Todos tus documentos de Google Docs" },
  { key: "all", label: "Todo", icon: "🗂️", desc: "Todos los archivos de Drive (Docs, Sheets, PDFs)" },
];

export default function Sources() {
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");

  // Drive import panel
  const [driveFilter, setDriveFilter] = useState<DriveFilter>("gemini");
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState("");
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [showDrivePanel, setShowDrivePanel] = useState(false);

  // Manual add form
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        window.location.href = "/auth/login";
        return;
      }
      setUser(sessionData.session.user);

      const workspaceResult = await getOrCreateWorkspace(
        sessionData.session.user.id,
        sessionData.session.user.email || ""
      );

      if (!workspaceResult.success || !workspaceResult.data) {
        setError(`Error cargando workspace: ${workspaceResult.error || "Error desconocido"}`);
        setLoading(false);
        return;
      }

      setWorkspace(workspaceResult.data);

      const sourcesResult = await getSourcesByWorkspace(workspaceResult.data.id);
      if (sourcesResult.success && sourcesResult.data) {
        setSources(sourcesResult.data);
      }

      setLoading(false);
    };

    initialize();
  }, []);

  const loadDriveFiles = async (filter: DriveFilter) => {
    setDriveLoading(true);
    setDriveError("");
    setDriveFiles([]);

    const result = await fetchGoogleDriveFiles(filter);
    if (result.success) {
      setDriveFiles(result.files || []);
    } else {
      setDriveError(result.error || "Error al cargar archivos de Drive");
    }
    setDriveLoading(false);
  };

  const handleOpenDrivePanel = () => {
    setShowDrivePanel(true);
    loadDriveFiles(driveFilter);
  };

  const handleFilterChange = (filter: DriveFilter) => {
    setDriveFilter(filter);
    loadDriveFiles(filter);
  };

  const handleImportDriveFile = async (file: DriveFile) => {
    if (importingIds.has(file.id) || importedIds.has(file.id)) return;

    setImportingIds((prev) => new Set(prev).add(file.id));

    const sourceType =
      file.mimeType.includes("spreadsheet") ? "document" : "meeting";

    const result = await createSource({
      title: file.name,
      url: file.webViewLink,
      type: sourceType,
      workspaceId: workspace.id,
      createdBy: user.id,
    });

    setImportingIds((prev) => {
      const next = new Set(prev);
      next.delete(file.id);
      return next;
    });

    if (result.success && result.data) {
      setSources((prev) => [result.data!, ...prev]);
      setImportedIds((prev) => new Set(prev).add(file.id));
    } else {
      setError(result.error || "Error al importar el archivo");
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !type) {
      setError("Título y tipo son requeridos");
      return;
    }
    setSubmitting(true);
    const result = await createSource({
      title: title.trim(),
      url: url.trim() || undefined,
      type: type as any,
      workspaceId: workspace.id,
      createdBy: user.id,
    });
    if (!result.success) {
      setError(result.error || "Error al añadir fuente");
    } else if (result.data) {
      setSources([result.data, ...sources]);
      setTitle("");
      setUrl("");
      setType("");
    }
    setSubmitting(false);
  };

  const handleDeleteSource = async (sourceId: string) => {
    const result = await deleteSource(sourceId);
    if (result.success) {
      setSources(sources.filter((s) => s.id !== sourceId));
    } else {
      setError(result.error || "Error al eliminar fuente");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">Fuentes</h1>
            <p className="text-sm text-navy/50 mt-1">
              Conecta tus documentos y reuniones de Google para analizarlos con Nexión
            </p>
          </div>
          <button
            onClick={handleOpenDrivePanel}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.5 2C8.36 2 5 5.36 5 9.5c0 2.38.94 4.55 2.46 6.14L2 21.09l.91.91 5.45-5.45C9.95 18.06 11.17 18.5 12.5 18.5c4.14 0 7.5-3.36 7.5-7.5S16.64 2 12.5 2zm0 13.5c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
            </svg>
            Importar desde Google Drive
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Drive Import Panel */}
        {showDrivePanel && (
          <div className="mb-8 bg-white rounded-2xl border border-border/40 shadow-soft overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 bg-[#f8f9fe]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-soft">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="#4285F4" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M3 7l9 5m0 0l9-5m-9 5v10" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-navy text-sm">Google Drive</p>
                  <p className="text-xs text-navy/50">Selecciona los archivos a importar como fuentes</p>
                </div>
              </div>
              <button
                onClick={() => setShowDrivePanel(false)}
                className="text-navy/30 hover:text-navy/60 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-6 py-3 border-b border-border/10">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleFilterChange(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    driveFilter === tab.key
                      ? "bg-primary text-white"
                      : "text-navy/50 hover:bg-bg hover:text-navy"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
              <button
                onClick={() => loadDriveFiles(driveFilter)}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-navy/40 hover:text-navy hover:bg-bg transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.1"/>
                </svg>
                Actualizar
              </button>
            </div>

            {/* File list */}
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {driveLoading && (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <span className="ml-3 text-sm text-navy/60">Buscando en tu Drive...</span>
                </div>
              )}

              {driveError && !driveLoading && (
                <div className="py-8 text-center">
                  <p className="text-red-600 text-sm mb-3">{driveError}</p>
                  {driveError.includes("token") && (
                    <p className="text-xs text-navy/50">
                      Cierra sesión y vuelve a entrar con Google para actualizar los permisos.
                    </p>
                  )}
                </div>
              )}

              {!driveLoading && !driveError && driveFiles.length === 0 && (
                <div className="py-10 text-center text-navy/40 text-sm">
                  No se encontraron archivos con este filtro.
                  <br />
                  <span className="text-xs">
                    Prueba con otro tipo de filtro o verifica que tienes documentos en tu Drive.
                  </span>
                </div>
              )}

              {!driveLoading && driveFiles.length > 0 && (
                <div className="space-y-1.5">
                  {driveFiles.map((file) => {
                    const isImporting = importingIds.has(file.id);
                    const isImported = importedIds.has(file.id);
                    return (
                      <div
                        key={file.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isImported
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-border/20 hover:border-border/50"
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{getMimeTypeIcon(file.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy truncate">{file.name}</p>
                          <p className="text-xs text-navy/40">
                            {getMimeTypeLabel(file.mimeType)} ·{" "}
                            {new Date(file.modifiedTime).toLocaleDateString("es-ES", {
                              day: "numeric", month: "short", year: "numeric"
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-navy/30 hover:text-primary transition-colors"
                            title="Abrir en Google Drive"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          </a>
                          <button
                            onClick={() => handleImportDriveFile(file)}
                            disabled={isImporting || isImported}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isImported
                                ? "bg-green-100 text-green-700 cursor-default"
                                : isImporting
                                ? "bg-primary/20 text-primary cursor-wait"
                                : "bg-primary text-white hover:bg-primary/90"
                            }`}
                          >
                            {isImported ? "✓ Importado" : isImporting ? "Importando..." : "Importar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fuentes existentes */}
        <div className="grid grid-cols-1 gap-4">
          {sources.length === 0 && !showDrivePanel && (
            <div className="bg-white rounded-2xl border border-dashed border-border/40 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <p className="font-semibold text-navy mb-1">Aún no tienes fuentes</p>
              <p className="text-sm text-navy/50 mb-5">
                Importa transcripciones de Google Meet, notas de Gemini o cualquier documento de Drive
              </p>
              <button
                onClick={handleOpenDrivePanel}
                className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                Importar desde Google Drive
              </button>
            </div>
          )}

          {sources.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-xl border border-border/30 px-5 py-4 flex items-start justify-between gap-4 hover:border-border/60 transition-all"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-xl mt-0.5 flex-shrink-0">
                  {source.source_type === "meeting" ? "🎙️" : source.source_type === "document" ? "📄" : "📁"}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-navy text-sm truncate">{source.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        source.current_status === "processed"
                          ? "bg-green-100 text-green-700"
                          : source.current_status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-navy/5 text-navy/50"
                      }`}
                    >
                      {source.current_status === "processed"
                        ? "✓ Procesado"
                        : source.current_status === "error"
                        ? "Error"
                        : source.current_status === "processing"
                        ? "⏳ Procesando"
                        : "Pendiente"}
                    </span>
                    <span className="text-xs text-navy/30">
                      {new Date(source.created_at).toLocaleDateString("es-ES", {
                        day: "numeric", month: "short"
                      })}
                    </span>
                  </div>
                  {source.original_url && (
                    <a
                      href={source.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block truncate max-w-sm"
                    >
                      {source.original_url}
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDeleteSource(source.id)}
                className="flex-shrink-0 p-1.5 text-navy/20 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                title="Eliminar fuente"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Manual add form - collapsible */}
        <details className="mt-6 group">
          <summary className="cursor-pointer text-xs text-navy/40 hover:text-navy/70 transition-colors flex items-center gap-1 select-none">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-open:rotate-90 transition-transform">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Añadir fuente manualmente
          </summary>
          <div className="mt-4 bg-white rounded-xl border border-border/30 p-5">
            <form onSubmit={handleAddSource} className="space-y-3">
              <input
                type="text"
                placeholder="Título de la fuente"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 text-sm border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="url"
                placeholder="URL (opcional)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 text-sm border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 text-sm border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Tipo de fuente</option>
                <option value="document">Documento</option>
                <option value="meeting">Reunión</option>
                <option value="email">Email</option>
                <option value="feedback">Feedback</option>
                <option value="manual">Manual</option>
              </select>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 bg-navy text-white text-sm rounded-lg font-semibold hover:bg-navy/90 transition-all disabled:opacity-50"
              >
                {submitting ? "Añadiendo..." : "Añadir fuente"}
              </button>
            </form>
          </div>
        </details>
      </div>
    </div>
  );
}
