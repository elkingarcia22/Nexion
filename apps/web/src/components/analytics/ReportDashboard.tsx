"use client";

import type { AnalyticsReport, Dataset } from "@/lib/analytics/types";
import { formatDelta, formatKpiValue } from "@/lib/analytics/format";

const TONE_CLASS = { good: "text-emerald-300", bad: "text-red-300", neutral: "text-white/40" } as const;

function DatasetTable({ dataset }: { dataset: Dataset }) {
  return (
    <section className="bg-card/50 border border-white/5 rounded-2xl overflow-hidden">
      <header className="px-5 py-3 border-b border-white/5">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">{dataset.title}</h3>
        {dataset.reading && <p className="text-xs text-white/50 mt-1">{dataset.reading}</p>}
      </header>
      {dataset.rows.length === 0 ? (
        <p className="px-5 py-4 text-xs text-white/40">Sin datos en este periodo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-white/40">
                {dataset.columns.map((column) => (
                  <th key={column.key} scope="col" className="px-5 py-2 font-semibold whitespace-nowrap">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dataset.rows.map((row, index) => (
                <tr key={index} className="text-white/80">
                  {dataset.columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td key={column.key} className={`px-5 py-2 ${typeof value === "number" ? "font-mono" : ""}`}>
                        {typeof value === "number" ? formatKpiValue(value, column.unit) : value ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface ReportDashboardProps {
  report: AnalyticsReport;
}

/** KPIs, AI reading and datasets of one report, read straight from the stored data (never recomputed). */
export function ReportDashboard({ report }: ReportDashboardProps) {
  const { kpis = [], datasets = [], links = [] } = report.data ?? {};
  const missing = Object.entries(report.coverage ?? {}).filter(([, source]) => !source.ok);
  const analysis = report.analysis;

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <p role="note" className="text-xs text-amber-100/80 bg-accent/10 border border-accent/25 rounded-xl px-4 py-3">
          Reporte parcial. Fuentes sin datos: {missing.map(([name, source]) => `${name}${source.detail ? ` (${source.detail})` : ""}`).join(" · ")}
        </p>
      )}

      {kpis.length > 0 && (
        <section aria-label="Indicadores" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => {
            const delta = formatDelta(kpi);
            return (
              <div key={kpi.key} className="bg-card/50 border border-white/5 rounded-2xl px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40 truncate" title={kpi.label}>
                  {kpi.label}
                </div>
                <div className="text-xl font-black font-mono text-white mt-1">{formatKpiValue(kpi.value, kpi.unit)}</div>
                {delta && <div className={`text-[11px] font-mono mt-0.5 ${TONE_CLASS[delta.tone]}`}>{delta.text}</div>}
              </div>
            );
          })}
        </section>
      )}

      {analysis && (
        <section className="bg-gradient-to-br from-primary/10 to-card/40 border border-primary/20 rounded-2xl px-5 py-4 space-y-3">
          <div>
            <h3 className="text-base font-black text-white">{analysis.headline}</h3>
            <p className="text-sm text-white/70 mt-1">{analysis.summary}</p>
          </div>
          {analysis.insights?.length > 0 && (
            <ul className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <li key={index} className="text-sm">
                  <span className="font-semibold text-white">{insight.title}. </span>
                  <span className="text-white/70">{insight.detail}</span>
                </li>
              ))}
            </ul>
          )}
          {(analysis.hypotheses?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Hipótesis a validar</h4>
              <ul className="list-disc pl-5 text-xs text-white/60 space-y-1">
                {analysis.hypotheses!.map((hypothesis, index) => (
                  <li key={index}>
                    {hypothesis.statement}
                    {hypothesis.how_to_validate && <span className="text-white/40"> — {hypothesis.how_to_validate}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(analysis.watch_next?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">A monitorear</h4>
              <ul className="text-xs text-white/60 space-y-1">
                {analysis.watch_next!.map((item, index) => (
                  <li key={index}>
                    <span className="font-mono text-bright">{item.metric}</span> — {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {datasets.map((dataset) => (
        <DatasetTable key={dataset.key} dataset={dataset} />
      ))}

      {links.length > 0 && (
        <section className="bg-card/50 border border-white/5 rounded-2xl px-5 py-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60 mb-2">Evidencia</h3>
          <ul className="space-y-1 text-sm">
            {links.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-bright hover:underline">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {kpis.length === 0 && datasets.length === 0 && !analysis && (
        <p className="text-sm text-white/40 bg-card/50 border border-white/5 rounded-2xl px-5 py-8 text-center">
          Este reporte no tiene datos estructurados.
        </p>
      )}
    </div>
  );
}
