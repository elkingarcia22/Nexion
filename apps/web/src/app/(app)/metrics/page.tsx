'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateWorkspace } from '@/lib/services/workspace-service';
import { getMetrics, getMetricDailyLogs, Metric, MetricDailyLog } from '@/lib/services/metric-service';

const TEAMS = ['Todas', 'Talent', 'Hiring', 'General'];

const CustomSelect = ({
  value, onChange, options, placeholder = "Selecciona...", className = ""
}: {
  value: string; onChange: (val: string) => void; options: string[]; placeholder?: string; className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className={`relative ${className}`} ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between px-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:border-primary/40 transition-all text-left whitespace-nowrap">
        <span className="truncate">{value || placeholder}</span>
        <svg className={`w-3 h-3 text-white/20 transition-transform ml-2 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-[150] bg-[#161927] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-60 overflow-y-auto min-w-max">
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest text-left transition-colors ${value === opt ? "bg-primary text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function formatUSD(val: number): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toLocaleString()}`;
}

function MiniSparkline({ logs }: { logs: MetricDailyLog[] }) {
  if (!logs || logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const values = sorted.map(l => l.value).filter((v): v is number => v != null);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 160;
  const h = 32;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`);
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline fill="none" stroke="#1a6bff" strokeWidth="1.5" points={points.join(" ")} />
    </svg>
  );
}

function MetricCard({ metric, logs }: { metric: Metric; logs: MetricDailyLog[] }) {
  const [expanded, setExpanded] = useState(false);
  const catColor = metric.category === "talent" ? "border-l-[#2ec6ff]" : metric.category === "hiring" ? "border-l-[#f49e04]" : "border-l-primary";

  return (
    <div className={`bg-[#161927]/50 border border-white/5 rounded-2xl p-5 border-l-4 ${catColor} transition-all`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest ${metric.category === "talent" ? "text-[#2ec6ff]" : metric.category === "hiring" ? "text-[#f49e04]" : "text-primary"}`}>
              {metric.category}
            </span>
            {metric.subcategory && (
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{metric.subcategory.replace(/_/g, " ")}</span>
            )}
          </div>
          <h3 className="text-sm font-bold text-white truncate">{metric.name}</h3>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <div className="text-right">
            <div className="text-lg font-black text-white font-mono">{formatUSD(metric.current_value || 0)}</div>
            {metric.target_value && (
              <div className="text-[10px] text-white/40">Meta: {formatUSD(metric.target_value)}</div>
            )}
          </div>
          <MiniSparkline logs={logs} />
          <svg className={`w-4 h-4 text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] rounded-xl p-3">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Actual</div>
              <div className="text-sm font-bold text-white font-mono">{formatUSD(metric.current_value || 0)}</div>
            </div>
            {metric.target_value && (
              <div className="bg-white/[0.02] rounded-xl p-3">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Meta</div>
                <div className="text-sm font-bold text-white font-mono">{formatUSD(metric.target_value)}</div>
              </div>
            )}
            {metric.previous_value && (
              <div className="bg-white/[0.02] rounded-xl p-3">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Anterior</div>
                <div className="text-sm font-bold text-white font-mono">{formatUSD(metric.previous_value)}</div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-white/60 mb-2">Actualizaciones del análisis diario</h4>
            {logs.length === 0 ? (
              <p className="text-xs text-white/30 italic">Sin actualizaciones aún</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="bg-white/[0.02] rounded-xl p-3 border-l-2 border-primary/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40 font-mono">{new Date(log.created_at).toLocaleDateString("es-CO")}</span>
                      {log.value != null && (
                        <span className={`text-[11px] font-bold font-mono ${log.delta && log.delta > 0 ? "text-green-400" : log.delta && log.delta < 0 ? "text-red-400" : "text-white/60"}`}>
                          {formatUSD(log.value)} {log.delta != null && (log.delta > 0 ? `↑+${formatUSD(log.delta)}` : log.delta < 0 ? `↓${formatUSD(log.delta)}` : "")}
                        </span>
                      )}
                    </div>
                    {log.context_text && (
                      <p className="text-xs text-white/70 leading-relaxed">{log.context_text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [logsByMetric, setLogsByMetric] = useState<Record<string, MetricDailyLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState("Todas");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        const ws = await getOrCreateWorkspace(user.id, user.email || "");
        if (ws.data?.id) setWorkspaceId(ws.data.id);
      }
    })();
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);

    const cat = teamFilter === "Todas" ? undefined : teamFilter.toLowerCase();

    (async () => {
      try {
        const result = await getMetrics(workspaceId, cat);
        if (!result.success || !result.data) {
          console.warn("[Metrics] No data:", result.error);
          setLoading(false);
          return;
        }
        setMetrics(result.data);
        const logsMap: Record<string, MetricDailyLog[]> = {};
        await Promise.all(
          result.data.map(async (m) => {
            const logsResult = await getMetricDailyLogs(m.id);
            if (logsResult.success && logsResult.data) {
              logsMap[m.id] = logsResult.data;
            }
          })
        );
        setLogsByMetric(logsMap);
      } catch (e) {
        console.error("[Metrics] Error loading metrics:", e);
      }
      setLoading(false);
    })();
  }, [workspaceId, teamFilter]);

  const talentMetrics = metrics.filter(m => m.category === "talent");
  const hiringMetrics = metrics.filter(m => m.category === "hiring");
  const generalMetrics = metrics.filter(m => m.category === "general");

  const totalArr = metrics.reduce((sum, m) => sum + (m.current_value || 0), 0);
  const talentArr = talentMetrics.reduce((sum, m) => sum + (m.current_value || 0), 0);
  const hiringArr = hiringMetrics.reduce((sum, m) => sum + (m.current_value || 0), 0);

  const seedMetrics = async () => {
    if (!workspaceId) return;
    setSeeding(true);
    try {
      await fetch("/api/seed-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const result = await getMetrics(workspaceId);
      if (result.success && result.data) setMetrics(result.data);
    } catch (e) {
      console.error("Error seeding metrics:", e);
    }
    setSeeding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Métricas</h1>
          <p className="text-xs text-white/40 mt-1">Indicadores clave de producto</p>
        </div>
        <div className="flex items-center gap-3">
          <CustomSelect value={teamFilter} onChange={setTeamFilter} options={TEAMS} placeholder="Filtrar por equipo" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#1a6bff]/10 to-transparent border border-primary/20 rounded-2xl p-5">
          <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">ARR Total</div>
          <div className="text-2xl font-black text-white font-mono">{formatUSD(totalArr)}</div>
          <div className="text-[10px] text-white/30 mt-1">Todas las métricas</div>
        </div>
        <div className="bg-gradient-to-br from-[#2ec6ff]/10 to-transparent border border-[#2ec6ff]/20 rounded-2xl p-5">
          <div className="text-[10px] text-[#2ec6ff] font-black uppercase tracking-widest mb-1">ARR Talent</div>
          <div className="text-2xl font-black text-white font-mono">{formatUSD(talentArr)}</div>
          <div className="text-[10px] text-white/30 mt-1">{talentMetrics.length} métricas</div>
        </div>
        <div className="bg-gradient-to-br from-[#f49e04]/10 to-transparent border border-[#f49e04]/20 rounded-2xl p-5">
          <div className="text-[10px] text-[#f49e04] font-black uppercase tracking-widest mb-1">ARR Hiring</div>
          <div className="text-2xl font-black text-white font-mono">{formatUSD(hiringArr)}</div>
          <div className="text-[10px] text-white/30 mt-1">{hiringMetrics.length} métricas</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/40 mt-3">Cargando métricas...</p>
        </div>
      ) : metrics.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-sm text-white/40">No hay métricas configuradas aún.</p>
          <p className="text-xs text-white/20">Puedes sembrar las métricas iniciales desde el PDF de Product Analytics.</p>
          <button
            onClick={() => seedMetrics()}
            disabled={seeding}
            className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/80 transition-all disabled:opacity-50"
          >
            {seeding ? "Sembrando..." : "Sembrar métricas desde PDF"}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Talent section */}
          {talentMetrics.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-[#2ec6ff] uppercase tracking-widest mb-4">
                Talent <span className="text-white/20 font-normal normal-case">— {talentMetrics.length} métricas</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {talentMetrics.map(m => (
                  <MetricCard key={m.id} metric={m} logs={logsByMetric[m.id] || []} />
                ))}
              </div>
            </div>
          )}

          {/* Hiring section */}
          {hiringMetrics.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-[#f49e04] uppercase tracking-widest mb-4">
                Hiring <span className="text-white/20 font-normal normal-case">— {hiringMetrics.length} métricas</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {hiringMetrics.map(m => (
                  <MetricCard key={m.id} metric={m} logs={logsByMetric[m.id] || []} />
                ))}
              </div>
            </div>
          )}

          {/* General section */}
          {generalMetrics.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-4">
                General <span className="text-white/20 font-normal normal-case">— {generalMetrics.length} métricas</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {generalMetrics.map(m => (
                  <MetricCard key={m.id} metric={m} logs={logsByMetric[m.id] || []} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
