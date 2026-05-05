"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateWorkspace } from "@/lib/services/workspace-service";
import {
  createSource,
  getSourcesByWorkspace,
  deleteSource,
} from "@/lib/services/source-service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AddSourceDrawer } from "@/components/sources/AddSourceDrawer";

// Using any for source to match service return type
type Source = any;

export default function DaySourcesPage() {
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<Source[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);

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

  const handleEditSource = (source: Source) => {
    console.log("handleEditSource called for:", source.title, source.id);
    setDrawerOpen(true);
  };

  const getEditData = () => {
    console.log("getEditData called, editingSource:", editingSource, "drawerOpen:", drawerOpen);
    if (!drawerOpen || !editingSource) return null;
    const data = {
      id: editingSource.id,
      title: editingSource.title,
      url: editingSource.original_url,
      sourceType: editingSource.source_type,
      sourceOrigin: editingSource.source_origin,
      metadata: editingSource.metadata,
    };
    console.log("getEditData returning:", data);
    return data;
  };

  const handleAddSourceCallback = () => {
    setDrawerOpen(false);
    setEditingSource(null);
    // Reload sources
    window.location.reload();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "pending" as const;
      case "processing":
        return "processing" as const;
      case "processed":
        return "processed" as const;
      case "error":
        return "error" as const;
      default:
        return "default" as const;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Fuentes</h1>
        <p className="text-white/60">Manage and monitor your information sources</p>
      </div>

      {/* Add Source Card */}
      <div className="bg-card rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Añadir Nueva Fuente</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
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
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm placeholder-gray-400 transition-colors focus:outline-none focus:border-primary focus:ring-1 focus:ring-light disabled:opacity-50"
          />
          <input
            type="url"
            placeholder="URL (opcional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm placeholder-gray-400 transition-colors focus:outline-none focus:border-primary focus:ring-1 focus:ring-light disabled:opacity-50"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm transition-colors focus:outline-none focus:border-primary focus:ring-1 focus:ring-light disabled:opacity-50"
          >
            <option value="">Tipo de fuente</option>
            <option value="document">Documento</option>
            <option value="meeting">Reunión</option>
            <option value="email">Email</option>
            <option value="feedback">Feedback</option>
            <option value="manual">Manual</option>
          </select>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "Añadiendo..." : "Añadir Fuente"}
          </Button>
        </form>
      </div>

      {/* Sources List */}
      <div className="bg-card rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Tus Fuentes</h2>
        {sources.length === 0 ? (
          <p className="text-white/60 text-sm">
            No hay fuentes aún. Empieza por añadir una.
          </p>
        ) : (
          <div className="space-y-4">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-start justify-between p-4 rounded-lg bg-card hover:bg-white/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{source.title}</h3>
                    <Badge variant={getStatusVariant(source.current_status)}>
                      {source.current_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/60 mt-1">{source.source_type}</p>
                  {source.original_url && (
                    <a
                      href={source.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline mt-2 inline-block truncate"
                    >
                      {source.original_url}
                    </a>
                  )}
                  <p className="text-xs text-white/40 mt-2">
                    {new Date(source.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => console.log("BUTTON CLICKED") || handleEditSource(source)}
                  className="ml-2 flex-shrink-0 text-white/60 hover:text-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSource(source.id)}
                  className="ml-2 flex-shrink-0"
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddSourceDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); }}
        onAdd={() => {
          setDrawerOpen(false);
        }}
        editMode={drawerOpen && !!editingSource}
        onEditData={getEditData()}
      />
    </div>
  );
}
