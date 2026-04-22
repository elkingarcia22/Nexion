"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateWorkspace } from "@/lib/services/workspace-service";
import {
  createSource,
  getSourcesByWorkspace,
  deleteSource,
} from "@/lib/services/source-service";
import Link from "next/link";

interface Source {
  id: string;
  workspace_id: string;
  title: string;
  url: string | null;
  type: string;
  status: "pending" | "processing" | "processed" | "error";
  created_at: string;
}

export default function Sources() {
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<Source[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const initializeWorkspace = async () => {
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
        setError(`Error loading workspace: ${workspaceResult.error || "Unknown error"}`);
        setLoading(false);
        return;
      }

      setWorkspace(workspaceResult.data);

      // Load sources for this workspace
      const sourcesResult = await getSourcesByWorkspace(workspaceResult.data.id);
      if (sourcesResult.success && sourcesResult.data) {
        setSources(sourcesResult.data);
      }

      setLoading(false);
    };

    initializeWorkspace();
  }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!type) {
      setError("Source type is required");
      return;
    }

    setSubmitting(true);

    const result = await createSource({
      title: title.trim(),
      url: url.trim() || undefined,
      type: type as "document" | "meeting" | "email" | "feedback" | "manual",
      workspaceId: workspace.id,
      createdBy: user.id,
    });

    if (!result.success) {
      setError(result.error || "Error adding source");
      setSubmitting(false);
      return;
    }

    // Add to sources list
    if (result.data) {
      setSources([result.data, ...sources]);
    }

    // Reset form
    setTitle("");
    setUrl("");
    setType("");
    setSubmitting(false);
  };

  const handleDeleteSource = async (sourceId: string) => {
    const result = await deleteSource(sourceId);
    if (result.success) {
      setSources(sources.filter((s) => s.id !== sourceId));
    } else {
      setError(result.error || "Error deleting source");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-navy">Fuentes</h1>
          <Link href="/" className="btn-secondary">
            Volver
          </Link>
        </div>

        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-navy mb-4">
            Añadir Nueva Fuente
          </h2>
          {error && (
            <div className="mb-4 p-3 bg-accent/10 border border-accent text-accent rounded-lg">
              {error}
            </div>
          )}
          <form onSubmit={handleAddSource} className="space-y-4">
            <input
              type="text"
              placeholder="Título de la fuente"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <input
              type="url"
              placeholder="URL (opcional)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
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
              className="btn-primary w-full disabled:opacity-50"
            >
              {submitting ? "Añadiendo..." : "Añadir Fuente"}
            </button>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-navy mb-4">
            Tus Fuentes
          </h2>
          {sources.length === 0 ? (
            <p className="text-navy/60">
              No hay fuentes aún. Empieza por añadir una.
            </p>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="border-b border-border pb-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-navy">{source.title}</h3>
                    <p className="text-sm text-navy/60">
                      {source.type}
                      {source.status && ` • ${source.status}`}
                    </p>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline mt-1 inline-block"
                      >
                        {source.url}
                      </a>
                    )}
                    <p className="text-xs text-navy/40 mt-2">
                      {new Date(source.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className="ml-4 px-3 py-1 text-sm bg-accent/10 text-accent hover:bg-accent/20 rounded transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
