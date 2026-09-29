"use client";

import { useEffect, useState } from "react";
import { periodContaining, REPORT_TYPE_LABELS, type ReportType } from "@/lib/analytics/periods";
import type { AnalyticsReport, Health } from "@/lib/analytics/types";
import { getAnalyticsReportsByIds } from "@/lib/services/analytics-client-service";
import { SlackMessagePreview } from "@/components/newsletters/SlackMessagePreview";
import { ReportDashboard } from "./ReportDashboard";

const HEALTH_LABEL: Record<Health, { text: string; className: string }> = {
  green: { text: "En verde", className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
  yellow: { text: "En observación", className: "bg-accent/10 border-accent/30 text-amber-200" },
  red: { text: "En riesgo", className: "bg-red-500/10 border-red-500/30 text-red-300" },
};

type View = "dashboard" | "slack";

interface ReportViewerProps {
  report: AnalyticsReport;
  onOpenChild: (report: AnalyticsReport) => void;
  /** Present when the report is a preview that can be posted to Slack. */
  onPublish?: () => void;
  publishing?: boolean;
}

/** One report: its Slack message as published, its dashboard, and the lower-level reports it rolls up. */
export function ReportViewer({ report, onOpenChild, onPublish, publishing }: ReportViewerProps) {
  const [view, setView] = useState<View>("dashboard");
  const [children, setChildren] = useState<AnalyticsReport[]>([]);
  const period = periodContaining(report.report_type as ReportType, new Date(`${report.period_start}T00:00:00Z`));

  useEffect(() => {
    getAnalyticsReportsByIds(report.child_report_ids ?? []).then((result) => setChildren(result.success ? result.data : []));
  }, [report.child_report_ids]);

  return (
    <article className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/40">{REPORT_TYPE_LABELS[report.report_type as ReportType]}</div>
          <h2 className="text-2xl font-black text-white">{period.label}</h2>
        </div>
        {report.health && (
          <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${HEALTH_LABEL[report.health].className}`}>
            {HEALTH_LABEL[report.health].text}
          </span>
        )}
        {onPublish && report.status === "preview" && report.message && (
          <button
            onClick={onPublish}
            disabled={publishing}
            className="px-3 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            {publishing ? "Publicando..." : "Publicar en Slack"}
          </button>
        )}
        <div role="tablist" aria-label="Vista del reporte" className="flex rounded-xl border border-white/10 overflow-hidden">
          {(["dashboard", "slack"] as const).map((option) => (
            <button
              key={option}
              role="tab"
              aria-selected={view === option}
              onClick={() => setView(option)}
              className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                view === option ? "bg-primary text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {option === "dashboard" ? "Tablero" : "Como en Slack"}
            </button>
          ))}
        </div>
      </header>

      {report.error && (
        <p role="alert" className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {report.error}
        </p>
      )}

      {view === "dashboard" ? (
        <ReportDashboard report={report} />
      ) : report.message ? (
        <div className="bg-card/50 border border-white/5 rounded-2xl px-5 py-4 border-l-2 border-l-primary/40">
          <SlackMessagePreview message={report.message} />
        </div>
      ) : (
        <p className="text-sm text-white/40 bg-card/50 border border-white/5 rounded-2xl px-5 py-8 text-center">
          Este reporte no tiene mensaje de Slack.
        </p>
      )}

      {children.length > 0 && (
        <section aria-label="Periodos que lo componen" className="bg-card/50 border border-white/5 rounded-2xl px-5 py-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60 mb-2">
            Construido con {children.length} {REPORT_TYPE_LABELS[children[0].report_type as ReportType].toLowerCase()}
            {children.length > 1 ? "s" : ""}
          </h3>
          <div className="flex flex-wrap gap-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => onOpenChild(child)}
                className="px-3 py-1.5 rounded-full border border-white/10 text-xs text-white/70 hover:border-primary/40 hover:text-white transition-colors"
              >
                {periodContaining(child.report_type as ReportType, new Date(`${child.period_start}T00:00:00Z`)).label} →
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
