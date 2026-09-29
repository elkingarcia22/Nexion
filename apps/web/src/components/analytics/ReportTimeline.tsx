"use client";

import { periodContaining, type ReportType } from "@/lib/analytics/periods";
import type { AnalyticsReport, Health, ReportStatus } from "@/lib/analytics/types";

const HEALTH_DOT: Record<Health, string> = { green: "bg-emerald-400", yellow: "bg-accent", red: "bg-red-400" };
const STATUS_LABEL: Record<ReportStatus, string> = {
  published: "Publicado",
  preview: "Vista previa",
  partial: "Parcial",
  failed: "Falló",
};

function labelFor(report: AnalyticsReport): string {
  return periodContaining(report.report_type as ReportType, new Date(`${report.period_start}T00:00:00Z`)).label;
}

interface ReportTimelineProps {
  reports: AnalyticsReport[];
  selectedId: string | null;
  onSelect: (report: AnalyticsReport) => void;
  /** YYYY-MM of the month to jump to; empty shows the latest. */
  jumpTo: string;
  onJump: (month: string) => void;
}

/** Periods of one level, newest first and grouped by year, with a month picker to jump back in time. */
export function ReportTimeline({ reports, selectedId, onSelect, jumpTo, onJump }: ReportTimelineProps) {
  const byYear = reports.reduce<Record<string, AnalyticsReport[]>>((groups, report) => {
    const year = report.period_start.slice(0, 4);
    return { ...groups, [year]: [...(groups[year] ?? []), report] };
  }, {});
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  return (
    <nav aria-label="Periodos" className="space-y-3">
      <label className="block">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Ir a una fecha</span>
        <div className="flex gap-2 mt-1">
          <input
            type="month"
            value={jumpTo}
            onChange={(e) => onJump(e.target.value)}
            className="flex-1 px-3 py-2 bg-card/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary/50 [color-scheme:dark]"
          />
          {jumpTo && (
            <button
              onClick={() => onJump("")}
              className="px-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
      </label>

      {reports.length === 0 ? (
        <p className="text-xs text-white/40 bg-card/50 border border-white/5 rounded-2xl px-4 py-6 text-center">
          Aún no hay reportes de este nivel{jumpTo ? " hasta esa fecha" : ""}.
        </p>
      ) : (
        years.map((year) => (
          <div key={year}>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 px-1">{year}</h3>
            <ul className="space-y-1">
              {byYear[year].map((report) => {
                const selected = report.id === selectedId;
                return (
                  <li key={report.id}>
                    <button
                      onClick={() => onSelect(report)}
                      aria-current={selected ? "true" : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:shadow-focus ${
                        selected ? "bg-primary/15 border border-primary/40" : "border border-transparent hover:bg-white/5"
                      }`}
                    >
                      <span className={`w-2 h-2 shrink-0 rounded-full ${report.health ? HEALTH_DOT[report.health] : "bg-white/20"}`} aria-hidden />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-white truncate">{labelFor(report)}</span>
                        <span className="block text-[10px] text-white/40">{STATUS_LABEL[report.status]}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </nav>
  );
}
