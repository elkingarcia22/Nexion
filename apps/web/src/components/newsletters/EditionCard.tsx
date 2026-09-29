"use client";

import { useState } from "react";
import type { EditionStatus, NewsletterEdition } from "@/lib/newsletters/types";
import { SlackMessagePreview } from "./SlackMessagePreview";

const STATUS_STYLES: Record<EditionStatus, { label: string; className: string }> = {
  published: { label: "Publicado", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  preview: { label: "Vista previa", className: "bg-primary/10 text-bright border-primary/30" },
  skipped: { label: "Omitido", className: "bg-white/5 text-white/50 border-white/10" },
  failed: { label: "Falló", className: "bg-red-500/10 text-red-300 border-red-500/30" },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
}

interface EditionCardProps {
  edition: NewsletterEdition;
  isPublishing: boolean;
  onPublish: (editionId: string) => void;
}

export function EditionCard({ edition, isPublishing, onPublish }: EditionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const status = STATUS_STYLES[edition.status];
  const stats = edition.stats as { newCandidates?: number; articlesParsed?: number; sourceErrors?: unknown[] };

  return (
    <article className="bg-card/50 border border-white/5 rounded-2xl overflow-hidden">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${status.className}`}>
          {status.label}
        </span>
        <span className="text-xs text-white/60 capitalize">{formatDateTime(edition.created_at)}</span>
        <span className="text-[10px] text-white/30 uppercase tracking-widest">
          {edition.trigger === "cron" ? "Automático" : "Manual"}
        </span>
        {edition.status === "preview" && (
          <button
            onClick={() => onPublish(edition.id)}
            disabled={isPublishing}
            className="ml-auto px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-action focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait transition-all"
          >
            {isPublishing ? "Publicando…" : "Publicar en Slack"}
          </button>
        )}
      </header>

      <div className="px-5 py-4">
        {edition.message ? (
          <div className="border-l-2 border-primary/40 pl-4">
            <SlackMessagePreview message={edition.message} />
          </div>
        ) : (
          <p className="text-sm text-white/50">{edition.error ?? "Sin mensaje."}</p>
        )}
        {edition.message && edition.error && <p className="mt-3 text-xs text-red-300">{edition.error}</p>}
      </div>

      <footer className="px-5 pb-4">
        <button
          onClick={() => setShowDetails((open) => !open)}
          aria-expanded={showDetails}
          className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/70 transition-colors"
        >
          {showDetails ? "Ocultar detalle" : "Ver detalle"}
        </button>
        {showDetails && (
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <dt className="text-white/30">Noticias leídas</dt>
              <dd className="font-mono text-white">{stats.articlesParsed ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-white/30">Nuevas y de IA</dt>
              <dd className="font-mono text-white">{stats.newCandidates ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-white/30">Fuentes con error</dt>
              <dd className="font-mono text-white">{stats.sourceErrors?.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-white/30">Tokens</dt>
              <dd className="font-mono text-white">
                {edition.usage ? edition.usage.inputTokens + edition.usage.outputTokens : "—"}
              </dd>
            </div>
            {edition.pills.map((pill, index) => (
              <div key={pill.url} className="col-span-2 sm:col-span-4 flex gap-2">
                <span className="font-mono text-primary">{index + 1}</span>
                <a href={pill.url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-bright truncate">
                  {pill.title}
                </a>
                <span className="ml-auto shrink-0 text-white/30">{pill.angle}</span>
              </div>
            ))}
          </dl>
        )}
      </footer>
    </article>
  );
}
