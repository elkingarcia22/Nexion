"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Newsletter } from "@/lib/newsletters/types";
import { listNewsletters } from "@/lib/services/newsletter-client-service";
import { hasPipeline } from "@/lib/newsletters/pipelines";

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNewsletters().then((result) => {
      if (result.success) setNewsletters(result.data);
      else setError(result.error);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-white">Boletines</h1>
        <p className="text-xs text-white/40 mt-1">Pills automáticas que Nexión arma con fuentes de calidad y publica en Slack</p>
      </header>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
          No se pudieron cargar los boletines: {error}
        </p>
      )}

      {!loading && !error && newsletters.length === 0 && (
        <p className="text-sm text-white/40 bg-card/50 border border-white/5 rounded-2xl px-5 py-8 text-center">
          Aún no hay boletines configurados.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {newsletters.map((newsletter) => (
          <Link
            key={newsletter.id}
            href={`/newsletters/${newsletter.id}`}
            className="group relative overflow-hidden bg-gradient-to-br from-primary/15 via-card/60 to-card/40 border border-primary/20 rounded-2xl p-6 hover:border-primary/50 focus-visible:outline-none focus-visible:shadow-focus transition-all"
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-bright/10 blur-2xl group-hover:bg-bright/20 transition-colors" aria-hidden />
            <div className="flex items-center gap-2 mb-3">
              {hasPipeline(newsletter.id) ? (
                <>
                  <span className={`w-2 h-2 rounded-full ${newsletter.is_enabled ? "bg-emerald-400" : "bg-white/20"}`} aria-hidden />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    {newsletter.is_enabled ? "Activo" : "Pausado"}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent/80">Corre en n8n</span>
                </>
              )}
            </div>
            <h2 className="text-xl font-black text-white">{newsletter.name}</h2>
            <p className="text-sm text-white/60 mt-2 max-w-sm">{newsletter.description}</p>
            <p className="text-[11px] text-bright mt-5 font-semibold">{newsletter.schedule_label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
