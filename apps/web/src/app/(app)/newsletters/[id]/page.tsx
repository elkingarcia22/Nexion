"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { NewsletterSource } from "@/lib/newsletters/types";
import {
  getNewsletterDetail,
  publishEdition,
  runNewsletterNow,
  setNewsletterEnabled,
  setSourceActive,
  type NewsletterDetail,
} from "@/lib/services/newsletter-client-service";
import { EditionCard } from "@/components/newsletters/EditionCard";
import { SourcesList } from "@/components/newsletters/SourcesList";
import { hasPipeline } from "@/lib/newsletters/pipelines";

type Tab = "ediciones" | "fuentes";
type Action = "preview" | "publish" | null;
interface Feedback {
  tone: "ok" | "error";
  text: string;
}

function NewsletterDetailView({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "fuentes" ? "fuentes" : "ediciones";

  const [detail, setDetail] = useState<NewsletterDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<Action>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback(async () => {
    const result = await getNewsletterDetail(id);
    if (result.success) setDetail(result.data);
    else setLoadError(result.error);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRun = async (publish: boolean) => {
    if (publish && !window.confirm("Se generará y publicará un boletín nuevo en Slack ahora. ¿Continuar?")) return;
    setRunningAction(publish ? "publish" : "preview");
    setFeedback(null);
    const result = await runNewsletterNow(id, publish);
    setFeedback(result.success ? { tone: result.data.status === "failed" || result.data.problem ? "error" : "ok", text: result.data.detail } : { tone: "error", text: result.error });
    setRunningAction(null);
    await load();
  };

  const handlePublish = async (editionId: string) => {
    if (!window.confirm("¿Publicar esta vista previa en Slack?")) return;
    setPublishingId(editionId);
    const result = await publishEdition(editionId);
    setFeedback(result.success ? { tone: "ok", text: result.data.detail } : { tone: "error", text: result.error });
    setPublishingId(null);
    await load();
  };

  const handleToggleSource = async (source: NewsletterSource) => {
    setPendingSourceId(source.id);
    const result = await setSourceActive(source.id, !source.is_active);
    if (result.success && detail) {
      setDetail({
        ...detail,
        sources: detail.sources.map((s) => (s.id === source.id ? { ...s, is_active: !s.is_active } : s)),
      });
    } else if (!result.success) {
      setFeedback({ tone: "error", text: `No se pudo actualizar la fuente: ${result.error}` });
    }
    setPendingSourceId(null);
  };

  const handleToggleEnabled = async () => {
    if (!detail) return;
    const next = !detail.newsletter.is_enabled;
    const result = await setNewsletterEnabled(id, next);
    if (result.success) setDetail({ ...detail, newsletter: { ...detail.newsletter, is_enabled: next } });
    else setFeedback({ tone: "error", text: `No se pudo cambiar el estado: ${result.error}` });
  };

  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
        No se pudo cargar el boletín: {loadError}
      </p>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { newsletter, sources, editions } = detail;
  const activeSources = sources.filter((s) => s.is_active).length;
  const published = editions.filter((e) => e.status === "published").length;
  const isBusy = runningAction !== null;
  const canRun = hasPipeline(newsletter.id);

  return (
    <div className="space-y-6">
      <Link href="/newsletters" className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
        ← Boletines
      </Link>

      <header className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="text-3xl font-black text-white">{newsletter.name}</h1>
          <p className="text-sm text-white/50 mt-1 max-w-xl">{newsletter.description}</p>
        </div>
        {canRun && (
          <>
          <button
            onClick={() => handleRun(false)}
            disabled={isBusy}
            className="px-5 py-3 border border-primary/40 text-bright rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary/10 focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait transition-all"
          >
            {runningAction === "preview" ? "Generando…" : "Generar vista previa"}
          </button>
          <button
            onClick={() => handleRun(true)}
            disabled={isBusy}
            className="px-5 py-3 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-action focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait transition-all"
          >
            {runningAction === "publish" ? "Publicando…" : "Publicar ahora"}
          </button>
          </>
        )}
      </header>

      {!canRun && (
        <p role="note" className="text-sm text-amber-100/80 bg-accent/10 border border-accent/25 rounded-2xl px-5 py-3">
          Este boletín todavía se genera en n8n. Su catálogo de fuentes ya vive aquí y puedes administrarlo; la generación y
          publicación desde Nexión llegan cuando migremos su pipeline.
        </p>
      )}

      {isBusy && (
        <p className="text-xs text-white/50">Leyendo {activeSources} fuentes y redactando con Claude. Puede tardar hasta un minuto…</p>
      )}
      {feedback && (
        <p
          role="status"
          className={`text-sm rounded-2xl px-5 py-3 border ${
            feedback.tone === "ok" ? "text-emerald-200 bg-emerald-500/10 border-emerald-500/20" : "text-red-200 bg-red-500/10 border-red-500/20"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <section aria-label="Resumen" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-2 flex items-center justify-between bg-card/50 border border-white/5 rounded-2xl px-5 py-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Programación</div>
            <div className="text-sm text-white mt-1">{newsletter.schedule_label}</div>
          </div>
          {canRun ? (
            <button
              role="switch"
              aria-checked={newsletter.is_enabled}
              aria-label="Envío automático"
              onClick={handleToggleEnabled}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors focus-visible:outline-none focus-visible:shadow-focus ${
                newsletter.is_enabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/10 text-white/40"
              }`}
            >
              {newsletter.is_enabled ? "Automático activo" : "Pausado"}
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-white/5 border-white/10 text-white/40">
              Corre en n8n
            </span>
          )}
        </div>
        <div className="bg-card/50 border border-white/5 rounded-2xl px-5 py-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Fuentes activas</div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {activeSources}<span className="text-white/30 text-base">/{sources.length}</span>
          </div>
        </div>
        <div className="bg-card/50 border border-white/5 rounded-2xl px-5 py-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Publicados (recientes)</div>
          <div className="text-2xl font-black font-mono text-white mt-1">{published}</div>
        </div>
      </section>

      <nav aria-label="Secciones del boletín" className="flex gap-1 border-b border-white/5">
        {(["ediciones", "fuentes"] as const).map((key) => (
          <button
            key={key}
            onClick={() => router.replace(`/newsletters/${id}${key === "fuentes" ? "?tab=fuentes" : ""}`)}
            aria-current={tab === key ? "page" : undefined}
            className={`px-4 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              tab === key ? "border-primary text-white" : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {key === "ediciones" ? `Ediciones (${editions.length})` : `Fuentes (${sources.length})`}
          </button>
        ))}
      </nav>

      {tab === "ediciones" ? (
        editions.length === 0 ? (
          <p className="text-sm text-white/40 bg-card/50 border border-white/5 rounded-2xl px-5 py-10 text-center">
            Aún no hay ediciones. Genera una vista previa para ver cómo quedaría hoy.
          </p>
        ) : (
          <div className="space-y-3">
            {editions.map((edition) => (
              <EditionCard key={edition.id} edition={edition} isPublishing={publishingId === edition.id} onPublish={handlePublish} />
            ))}
          </div>
        )
      ) : (
        <SourcesList sources={sources} pendingId={pendingSourceId} onToggle={handleToggleSource} />
      )}
    </div>
  );
}

export default function NewsletterDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <NewsletterDetailView id={params.id} />
    </Suspense>
  );
}
