"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateWorkspace } from "@/lib/services/workspace-service";
import {
  createSource,
  getSourcesByWorkspace,
  deleteSource,
} from "@/lib/services/source-service";
import { syncSlackSourcesForDay, getSlackSourcesByWorkspace, verifyPrivateChannel, addPrivateChannelToSync } from "@/lib/services/slack-service";
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
  const [slackSources, setSlackSources] = useState<Source[]>([]);
  const [slackSyncing, setSlackSyncing] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [channelIdInput, setChannelIdInput] = useState("");
  const [connectingPrivate, setConnectingPrivate] = useState(false);
  const [privateChannelError, setPrivateChannelError] = useState("");
  const [privateChannelSuccess, setPrivateChannelSuccess] = useState("");

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

      // Load manual sources for this workspace
      const sourcesResult = await getSourcesByWorkspace(workspaceResult.data.id);
      if (sourcesResult.success && sourcesResult.data) {
        setSources(sourcesResult.data);
      }

      // Sync Slack sources for today
      const today = new Date();
      setSlackSyncing(true);
      console.log("[DaySourcesPage] Starting Slack sync...");
      const slackResult = await syncSlackSourcesForDay(workspaceResult.data.id, today);
      console.log("[DaySourcesPage] Slack sync result:", slackResult);
      if (slackResult.success) {
        console.log("[DaySourcesPage] Fetching Slack sources from DB...");
        const slackSourcesResult = await getSlackSourcesByWorkspace(workspaceResult.data.id, today);
        console.log("[DaySourcesPage] Slack sources from DB:", slackSourcesResult);
        if (slackSourcesResult.success && slackSourcesResult.data) {
          console.log(`[DaySourcesPage] Setting ${slackSourcesResult.data.length} Slack sources in state`);
          setSlackSources(slackSourcesResult.data);
        }
      } else {
        console.error("[DaySourcesPage] Slack sync failed:", slackResult.error);
      }
      setSlackSyncing(false);
      setLoading(false);
    };

    initializeWorkspace();
  }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    console.log("[handleAddSource] Starting - title:", title, "type:", type, "url:", url);

    if (!title.trim()) {
      setError("Title is required");
      console.warn("[handleAddSource] Title is empty");
      return;
    }

    if (!type) {
      setError("Source type is required");
      console.warn("[handleAddSource] Type is empty");
      return;
    }

    setSubmitting(true);
    console.log("[handleAddSource] Submitting with workspace:", workspace.id, "user:", user.id);

    const result = await createSource({
      title: title.trim(),
      url: url.trim() || undefined,
      type: type as "document" | "meeting" | "email" | "feedback" | "manual",
      workspaceId: workspace.id,
      createdBy: user.id,
    });

    console.log("[handleAddSource] Result from createSource:", result);

    if (!result.success) {
      setError(result.error || "Error adding source");
      setSubmitting(false);
      console.error("[handleAddSource] Error:", result.error);
      return;
    }

    // Add to sources list
    if (result.data) {
      console.log("[handleAddSource] Adding new source to list:", result.data);
      setSources([result.data, ...sources]);
    } else {
      console.warn("[handleAddSource] No data returned from createSource");
    }

    // Reset form
    setTitle("");
    setUrl("");
    setType("");
    setSubmitting(false);
    console.log("[handleAddSource] Source added successfully");
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

  const handleConnectPrivateChannel = async () => {
    if (!workspace || !channelIdInput.trim()) return;
    setConnectingPrivate(true);
    setPrivateChannelError("");
    setPrivateChannelSuccess("");

    const result = await addPrivateChannelToSync(workspace.id, channelIdInput.trim());

    if (!result.success) {
      setPrivateChannelError(result.error || "Error al conectar canal");
      setConnectingPrivate(false);
      return;
    }

    setPrivateChannelSuccess(`Canal #${result.channel?.name} conectado exitosamente`);
    setChannelIdInput("");

    // Re-sync Slack sources
    const syncResult = await syncSlackSourcesForDay(workspace.id, new Date());
    if (syncResult.success) {
      const slackSourcesResult = await getSlackSourcesByWorkspace(workspace.id, new Date());
      if (slackSourcesResult.success && slackSourcesResult.data) {
        setSlackSources(slackSourcesResult.data);
      }
    }

    setConnectingPrivate(false);
  };

  const handleAddSourceCallback = () => {
    setDrawerOpen(false);
    setEditingSource(null);
    // Reload sources
    window.location.reload();
  };

  const loadSources = async () => {
    if (!workspace) return;
    console.log("[loadSources] Reloading sources for workspace:", workspace.id);
    const sourcesResult = await getSourcesByWorkspace(workspace.id);
    if (sourcesResult.success && sourcesResult.data) {
      console.log("[loadSources] Loaded sources count:", sourcesResult.data.length);
      setSources(sourcesResult.data);
    } else {
      console.error("[loadSources] Error loading sources:", sourcesResult.error);
    }
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

      {/* Slack Sources */}
      <div className="bg-card rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Slack</h2>
            <p className="text-xs text-white/40">Canales monitoreados por Nexión hoy</p>
          </div>
          <button
            onClick={async () => {
              if (!workspace) return;
              setSlackSyncing(true);
              const result = await syncSlackSourcesForDay(workspace.id, new Date());
              if (result.success) {
                const slackResult = await getSlackSourcesByWorkspace(workspace.id, new Date());
                if (slackResult.success && slackResult.data) {
                  setSlackSources(slackResult.data);
                }
              }
              setSlackSyncing(false);
            }}
            disabled={slackSyncing}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" /></svg>
            {slackSyncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
        {slackSources.length === 0 ? (
          <div className="flex items-center gap-3 py-6">
            {slackSyncing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#E01E5A" className="opacity-30">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.521-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.522 2.522v6.312zM15.166 18.956a2.528 2.528 0 0 1 2.522 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.166 17.688a2.527 2.527 0 0 1-2.52-2.52 2.526 2.526 0 0 1 2.52-2.522h6.312A2.527 2.527 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.522h-6.312z"/>
              </svg>
            )}
            <p className="text-sm text-white/40">{slackSyncing ? "Sincronizando canales..." : "No hay mensajes de Slack hoy"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slackSources.map((source) => (
              <div key={source.id} className="flex items-start justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border-l-4 border-l-[#E01E5A]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#E01E5A">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.521-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.522 2.522v6.312zM15.166 18.956a2.528 2.528 0 0 1 2.522 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.166 17.688a2.527 2.527 0 0 1-2.52-2.52 2.526 2.526 0 0 1 2.52-2.522h6.312A2.527 2.527 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.522h-6.312z"/>
                    </svg>
                    <h3 className="font-semibold text-white text-sm">{source.title}</h3>
                    <Badge variant="default" className="bg-[#E01E5A]/20 text-[#E01E5A] border-0 text-[9px]">
                      SLACK
                    </Badge>
                  </div>
                  {source.metadata?.preview && (
                    <p className="text-xs text-white/50 mt-1.5 line-clamp-2">{source.metadata.preview}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-white/30 font-mono">
                      {source.metadata?.channelName ? `#${source.metadata.channelName}` : ""}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {source.metadata?.messageCount || 0} mensajes
                    </span>
                    <span className="text-[10px] text-white/20">
                      {new Date(source.source_date).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Private Slack Channel Connector */}
      <div className="bg-card rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#E01E5A">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.521-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
          </svg>
          <h2 className="text-lg font-semibold text-white">Conectar Canal Privado</h2>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Invita al bot <code className="text-primary">@Nexion</code> al canal privado en Slack, luego pega el ID del canal aquí.
          Para obtener el ID: abre el canal en Slack, ve a <strong>Acerca de</strong> y copia el ID (ej: C084AP7K4Q2).
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="ID del canal privado (C...)"
            value={channelIdInput}
            onChange={(e) => setChannelIdInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleConnectPrivateChannel}
            disabled={connectingPrivate}
          >
            {connectingPrivate ? "Verificando..." : "Conectar"}
          </Button>
        </div>
        {privateChannelError && (
          <p className="text-xs text-red-400 mt-2">{privateChannelError}</p>
        )}
        {privateChannelSuccess && (
          <p className="text-xs text-green-400 mt-2">{privateChannelSuccess}</p>
        )}
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
                  onClick={() => handleEditSource(source)}
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
          console.log("[DaySourcesPage] AddSourceDrawer onAdd triggered");
          setDrawerOpen(false);
          setEditingSource(null);
          loadSources();
        }}
        editMode={drawerOpen && !!editingSource}
        onEditData={getEditData()}
      />
    </div>
  );
}
