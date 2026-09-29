"use client";

import { useMemo, useState } from "react";
import type { NewsletterSource, SourcePriority } from "@/lib/newsletters/types";

const PRIORITY_LABEL: Record<SourcePriority, string> = { high: "Alta", medium: "Media", low: "Baja" };
const PRIORITY_ORDER: Record<SourcePriority, number> = { high: 0, medium: 1, low: 2 };
const ALL = "__all__";

type StatusFilter = "all" | "active" | "inactive";

interface SourcesListProps {
  sources: NewsletterSource[];
  pendingId: string | null;
  onToggle: (source: NewsletterSource) => void;
}

function humanize(key: string): string {
  const text = key.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Short context line from newsletter-specific metadata (competitor, processes, language). */
function metadataHint(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const parts: string[] = [];
  if (typeof metadata.competitor === "string") parts.push(metadata.competitor);
  if (Array.isArray(metadata.processes) && metadata.processes.length > 1) {
    parts.push(`${metadata.processes.length} procesos`);
  }
  if (typeof metadata.language === "string") parts.push(metadata.language.toUpperCase());
  return parts.length ? parts.join(" · ") : null;
}

export function SourcesList({ sources, pendingId, onToggle }: SourcesListProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [status, setStatus] = useState<StatusFilter>("all");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const source of sources) counts.set(source.category, (counts.get(source.category) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [sources]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources
      .filter((s) => category === ALL || s.category === category)
      .filter((s) => status === "all" || (status === "active" ? s.is_active : !s.is_active))
      .filter((s) => !q || `${s.name} ${s.url} ${s.notes ?? ""}`.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(b.is_active) - Number(a.is_active) ||
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          a.name.localeCompare(b.name)
      );
  }, [sources, query, category, status]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <span className="sr-only">Buscar fuente</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, URL o nota…"
            className="w-full px-4 py-2.5 bg-card/50 border border-white/5 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/40"
          />
        </label>
        <div role="group" aria-label="Estado" className="flex rounded-xl border border-white/5 overflow-hidden">
          {(["all", "active", "inactive"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              aria-pressed={status === value}
              className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                status === value ? "bg-primary text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {value === "all" ? "Todas" : value === "active" ? "Activas" : "Inactivas"}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 1 && (
        <div role="group" aria-label="Categoría" className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory(ALL)}
            aria-pressed={category === ALL}
            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-colors ${
              category === ALL ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/40 hover:text-white/70"
            }`}
          >
            Todas <span className="font-mono">{sources.length}</span>
          </button>
          {categories.map(([key, count]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
              className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-colors ${
                category === key ? "bg-primary/15 border-primary/40 text-bright" : "border-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              {humanize(key)} <span className="font-mono">{count}</span>
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-white/40 bg-card/50 border border-white/5 rounded-2xl px-5 py-8 text-center">
          Ninguna fuente coincide con los filtros.
        </p>
      ) : (
        <ul className="bg-card/50 border border-white/5 rounded-2xl divide-y divide-white/5">
          {visible.map((source) => {
            const hint = metadataHint(source.metadata);
            return (
              <li key={source.id} className={`flex items-center gap-4 px-5 py-3 ${source.is_active ? "" : "opacity-50"}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-white truncate hover:text-bright"
                    >
                      {source.name}
                    </a>
                    <span className="shrink-0 text-[10px] text-white/30 uppercase tracking-widest">{source.source_type}</span>
                    {hint && <span className="shrink-0 text-[10px] text-white/40">{hint}</span>}
                  </div>
                  {source.notes && <p className="text-xs text-white/40 truncate">{source.notes}</p>}
                </div>
                <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-white/40 w-12">
                  {PRIORITY_LABEL[source.priority]}
                </span>
                <span
                  className="hidden sm:block font-mono text-xs text-white/40 w-10 text-right"
                  title="Máximo de noticias por fuente"
                >
                  {source.max_items}
                </span>
                <button
                  role="switch"
                  aria-checked={source.is_active}
                  aria-label={`${source.is_active ? "Desactivar" : "Activar"} ${source.name}`}
                  disabled={pendingId === source.id}
                  onClick={() => onToggle(source)}
                  className={`relative shrink-0 w-10 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-50 ${
                    source.is_active ? "bg-primary" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      source.is_active ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
