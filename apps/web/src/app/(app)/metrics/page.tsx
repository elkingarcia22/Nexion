'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { getOrCreateWorkspace } from '@/lib/services/workspace-service';
import { getMetrics, getMetricDailyLogs, getMetricsConfig, Metric, MetricDailyLog, MetricsConfig } from '@/lib/services/metric-service';

const CATEGORY_COLORS = [
  { border: "border-l-[#2ec6ff]", text: "text-[#2ec6ff]", bg: "bg-[#2ec6ff]/10", hex: "#2ec6ff" },
  { border: "border-l-[#f49e04]", text: "text-[#f49e04]", bg: "bg-[#f49e04]/10", hex: "#f49e04" },
  { border: "border-l-[#8b5cf6]", text: "text-[#8b5cf6]", bg: "bg-[#8b5cf6]/10", hex: "#8b5cf6" },
  { border: "border-l-[#10b981]", text: "text-[#10b981]", bg: "bg-[#10b981]/10", hex: "#10b981" },
  { border: "border-l-[#ec4899]", text: "text-[#ec4899]", bg: "bg-[#ec4899]/10", hex: "#ec4899" },
  { border: "border-l-[#06b6d4]", text: "text-[#06b6d4]", bg: "bg-[#06b6d4]/10", hex: "#06b6d4" },
  { border: "border-l-[#f97316]", text: "text-[#f97316]", bg: "bg-[#f97316]/10", hex: "#f97316" },
  { border: "border-l-[#6366f1]", text: "text-[#6366f1]", bg: "bg-[#6366f1]/10", hex: "#6366f1" },
];

const GENERAL_COLOR = { border: "border-l-primary", text: "text-primary", bg: "bg-primary/10", hex: "#1a6bff" };

function getCatStyle(category: string, index: number) {
  if (category === "general") return GENERAL_COLOR;
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

const CATEGORY_LABELS: Record<string, string> = {
  objetivos: "Objetivos",
  "360": "360",
  encuestas: "Encuestas",
  matrix: "Matriz de Talento",
  learning: "Aprendizaje",
  learning_map: "Learning Map",
  creator: "Creator",
  hiring: "Contratación",
  pyt: "PYT",
  core: "Core",
  asx: "ASX",
  planes_tareas: "Planes y Tareas",
  general: "General",
};

const PRODUCT_GROUPS = [
  { key: "objetivos", label: "Objetivos", icon: "○", category: "objetivos", color: "#2ec6ff" },
  { key: "360", label: "360", icon: "◎", category: "360", color: "#2ec6ff" },
  { key: "encuestas", label: "Encuestas", icon: "□", category: "encuestas", color: "#2ec6ff" },
  { key: "matrix", label: "Matriz de Talento", icon: "◇", category: "matrix", color: "#2ec6ff" },
  { key: "learning", label: "Aprendizaje", icon: "△", category: "learning", color: "#2ec6ff" },
  { key: "learning_map", label: "Learning Map", icon: "♢", category: "learning_map", color: "#2ec6ff" },
  { key: "creator", label: "Creator", icon: "♤", category: "creator", color: "#2ec6ff" },
  { key: "hiring", label: "Contratación", icon: "▽", category: "hiring", color: "#f49e04" },
  { key: "pyt", label: "PYT", icon: "◈", category: "pyt", color: "#ec4899" },
  { key: "core", label: "Core", icon: "◆", category: "core", color: "#10b981" },
  { key: "asx", label: "ASX", icon: "⬡", category: "asx", color: "#8b5cf6" },
  { key: "planes_tareas", label: "Planes y Tareas", icon: "⬢", category: "planes_tareas", color: "#8b5cf6" },
  { key: "general", label: "General", icon: "⬟", category: "general", color: "#1a6bff" },
];

function formatMetricValue(val: number, unit: string = "USD"): string {
  if (unit === "USD") {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toLocaleString()}`;
  }
  if (unit === "percent" || unit === "%") return `${val}%`;
  if (unit === "hours") {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K h`;
    return `${val} h`;
  }
  if (unit === "points") return `${val}`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toLocaleString();
}

function FunnelChart({ stages }: { stages: { label: string; value: number; rate?: number }[] }) {
  if (!stages || stages.length === 0) return null;
  const maxVal = Math.max(...stages.map(s => s.value));
  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const pct = (stage.value / maxVal) * 100;
        const barColor = i === stages.length - 1 ? "#1a6bff" : i === 0 ? "#2ec6ff" : "#1a6bff";

        return (
          <div key={stage.label} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-white/60">{stage.label}</span>
                <span className="text-[10px] font-bold text-white font-mono">{stage.value.toLocaleString()}</span>
              </div>
              <div className="relative h-5">
                <div className="absolute inset-0 rounded bg-white/5" />
                <div
                  className="absolute inset-y-0 left-0 rounded transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    opacity: 0.3 + (i / stages.length) * 0.4,
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded border-r-2 border-white/30 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {stage.rate != null && i > 0 && (
              <span className="text-[9px] font-bold text-white/40 font-mono w-10 text-right">
                {(stage.rate * 100).toFixed(0)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
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

function LogsDrawer({ open, onClose, metricName, logs, unit }: { open: boolean; onClose: () => void; metricName: string; logs: MetricDailyLog[]; unit: string }) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[100] w-full max-w-[500px] bg-[#0A0C14] shadow-2xl border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161927]/50">
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest">Actualizaciones</span>
            <h3 className="text-sm font-bold text-white mt-0.5">{metricName}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs text-white/30">Sin actualizaciones aún</p>
              <p className="text-[10px] text-white/20 mt-1">Los análisis diarios de Gemini registrarán cambios aquí</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-[#161927]/50 border border-white/5 rounded-2xl p-4 border-l-2 border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/40 font-mono">{new Date(log.created_at).toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                  {log.value != null && (
                    <span className={`text-xs font-bold font-mono ${log.delta && log.delta > 0 ? "text-green-400" : log.delta && log.delta < 0 ? "text-red-400" : "text-white/60"}`}>
                      {formatMetricValue(log.value, unit)} {log.delta != null && (log.delta > 0 ? `↑+${formatMetricValue(log.delta, unit)}` : log.delta < 0 ? `↓${formatMetricValue(log.delta, unit)}` : "")}
                    </span>
                  )}
                </div>
                {log.context_text && (
                  <p className="text-xs text-white/70 leading-relaxed">{log.context_text}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function MetricCard({ metric, logs, catIndex }: { metric: Metric; logs: MetricDailyLog[]; catIndex: number }) {
  const [logsOpen, setLogsOpen] = useState(false);
  const style = getCatStyle(metric.category, catIndex);
  const isFunnel = !!(metric.metadata as any)?.funnel;
  const funnelStages = isFunnel ? (metric.metadata as any)?.stages : null;
  const isNsm = !!(metric.metadata as any)?.nsm;

  return (
    <div className={`bg-[#161927]/50 border border-white/5 rounded-2xl p-5 border-l-4 ${style.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest ${style.text}`}>
              {metric.category}
            </span>
            {metric.subcategory && (
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{metric.subcategory.replace(/_/g, " ")}</span>
            )}
            {isFunnel && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Embudo</span>}
            {isNsm && <span className="text-[9px] bg-[#f49e04]/20 text-[#f49e04] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">NSM</span>}
          </div>
          <h3 className="text-sm font-bold text-white truncate">{metric.name}</h3>
        </div>
        <div className="text-right ml-4">
          <div className="text-lg font-black text-white font-mono">{formatMetricValue(metric.current_value || 0, metric.unit)}</div>
          {metric.target_value && (
            <div className="text-[10px] text-white/40">Meta: {formatMetricValue(metric.target_value, metric.unit)}</div>
          )}
        </div>
      </div>

      {isFunnel && funnelStages && (
        <div className="mb-3 pb-3 border-b border-white/5">
          <FunnelChart stages={funnelStages} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/[0.02] rounded-xl px-3 py-2">
            <div className="text-[9px] text-white/40">Actual</div>
            <div className="text-xs font-bold text-white font-mono">{formatMetricValue(metric.current_value || 0, metric.unit)}</div>
          </div>
          {metric.target_value && (
            <div className="bg-white/[0.02] rounded-xl px-3 py-2">
              <div className="text-[9px] text-white/40">Meta</div>
              <div className="text-xs font-bold text-white font-mono">{formatMetricValue(metric.target_value, metric.unit)}</div>
            </div>
          )}
          {metric.previous_value && (
            <div className="bg-white/[0.02] rounded-xl px-3 py-2">
              <div className="text-[9px] text-white/40">Anterior</div>
              <div className="text-xs font-bold text-white font-mono">{formatMetricValue(metric.previous_value, metric.unit)}</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setLogsOpen(true)}
          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Actualizaciones
          {logs.length > 0 && <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[8px]">{logs.length}</span>}
        </button>
      </div>

      <LogsDrawer open={logsOpen} onClose={() => setLogsOpen(false)} metricName={metric.name} logs={logs} unit={metric.unit} />
    </div>
  );
}

function getCategoryIndex(categories: string[], cat: string): number {
  const idx = categories.indexOf(cat);
  return idx >= 0 ? idx : 0;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [logsByMetric, setLogsByMetric] = useState<Record<string, MetricDailyLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("General");
  const [period, setPeriod] = useState("Q2 2026");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{ date: string; source: string } | null>(null);
  const [metricsConfig, setMetricsConfig] = useState<MetricsConfig>({ selected_categories: [] });

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        const ws = await getOrCreateWorkspace(user.id, user.email || "");
        if (ws.data?.id) {
          setWorkspaceId(ws.data.id);
          const configResult = await getMetricsConfig(ws.data.id);
          if (configResult.success && configResult.data) {
            setMetricsConfig(configResult.data);
          }
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);

    (async () => {
      try {
        const result = await getMetrics(workspaceId, undefined, period);
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

        const { data: recentLog } = await supabase
          .from("metric_daily_logs")
          .select("created_at, source")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (recentLog) {
          setLastUpdate({
            date: new Date(recentLog.created_at).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            source: recentLog.source,
          });
        } else {
          setLastUpdate(null);
        }
      } catch (e) {
        console.error("[Metrics] Error loading metrics:", e);
      }
      setLoading(false);
    })();
  }, [workspaceId, period]);

  const nonGeneralCategories = useMemo(() => {
    return [...new Set(metrics.filter(m => m.category !== "general").map(m => m.category))].sort();
  }, [metrics]);

  const tabs = useMemo(() => {
    const base = [{ key: "General", label: "General", desc: "Métricas generales de la empresa" }];
    const cats = metricsConfig.selected_categories;
    let displayCats: string[];
    if (cats.length > 0) {
      displayCats = cats.filter(c => nonGeneralCategories.includes(c));
    } else {
      displayCats = nonGeneralCategories;
    }
    return [...base, ...displayCats.map(c => ({
      key: c.charAt(0).toUpperCase() + c.slice(1),
      label: CATEGORY_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1),
      desc: "Detalle por producto",
    }))];
  }, [metricsConfig, nonGeneralCategories]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs, activeTab]);

  const arrMetrics = metrics.filter(m => m.unit === "USD");
  const nsmMetrics = metrics.filter(m => (m.metadata as any)?.nsm);
  const funnelMetrics = metrics.filter(m => (m.metadata as any)?.funnel);

  const totalArr = arrMetrics.reduce((sum, m) => sum + (m.current_value || 0), 0);

  // Compute ARR by category for the General tab overview
  const categoryArr = useMemo(() => {
    const result: Record<string, { arr: number; count: number }> = {};
    for (const cat of nonGeneralCategories) {
      const catArrMetrics = arrMetrics.filter(m => m.category === cat);
      const arr = catArrMetrics.reduce((sum, m) => sum + (m.current_value || 0), 0);
      const count = metrics.filter(m => m.category === cat).length;
      result[cat] = { arr, count };
    }
    return result;
  }, [arrMetrics, metrics, nonGeneralCategories]);

  const filteredByTeam = activeTab === "General"
    ? metrics
    : metrics.filter(m => m.category === activeTab.toLowerCase());

  const groupedByProduct = useMemo(() => {
    if (activeTab === "General") return [];
    const cat = activeTab.toLowerCase();
    const catMetrics = metrics.filter(m => m.category === cat);
    if (catMetrics.length === 0) return [];

    const pg = PRODUCT_GROUPS.find(p => p.category === cat);
    if (pg) {
      return [{ ...pg, metrics: catMetrics }];
    }
    return [{
      key: cat,
      label: CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
      icon: "○",
      category: cat,
      color: "#2ec6ff",
      metrics: catMetrics,
    }];
  }, [metrics, activeTab]);

  const wau = metrics.find(m => m.name.includes("semanales"))?.current_value;
  const mau = metrics.find(m => m.name.includes("mensuales"))?.current_value;
  const nps = metrics.find(m => m.name === "NPS")?.current_value;

  const seedMetrics = async () => {
    if (!workspaceId) return;
    setSeeding(true);

    const today = new Date().toISOString().split("T")[0];

    const q1Data = [
      { name: "ARR Total Empresas", category: "general", current_value: 9800000, target_value: 12000000, previous_value: 9500000, unit: "USD", sort_order: 0, metadata: {} },
      { name: "ARR Objetivos", category: "objetivos", current_value: 105000, target_value: 150000, previous_value: 98000, unit: "USD", sort_order: 1, metadata: {} },
      { name: "ARR 360", category: "360", current_value: 118000, target_value: 160000, previous_value: 112000, unit: "USD", sort_order: 2, metadata: {} },
      { name: "ARR Encuestas", category: "encuestas", current_value: 68000, target_value: 90000, previous_value: 62000, unit: "USD", sort_order: 3, metadata: {} },
      { name: "ARR Matriz de Talento", category: "matrix", current_value: 39000, target_value: 60000, previous_value: 35000, unit: "USD", sort_order: 4, metadata: {} },
      { name: "ARR Contratación", category: "hiring", current_value: 7200, target_value: 15000, previous_value: 6500, unit: "USD", sort_order: 5, metadata: {} },
      { name: "ARR ASX", category: "asx", current_value: 45000, target_value: 70000, previous_value: 42000, unit: "USD", sort_order: 6, metadata: {} },
      { name: "ARR PYT", category: "pyt", current_value: 28000, target_value: 50000, previous_value: 25000, unit: "USD", sort_order: 7, metadata: {} },
      { name: "ARR Core", category: "core", current_value: 85000, target_value: 120000, previous_value: 80000, unit: "USD", sort_order: 8, metadata: {} },
      { name: "ARR Planes y Tareas", category: "planes_tareas", current_value: 15000, target_value: 30000, previous_value: 12000, unit: "USD", sort_order: 9, metadata: {} },
      { name: "ARR Learning Map", category: "learning_map", current_value: 25000, target_value: 40000, previous_value: 22000, unit: "USD", sort_order: 10, metadata: {} },
      { name: "ARR Creator", category: "creator", current_value: 12000, target_value: 25000, previous_value: 10000, unit: "USD", sort_order: 11, metadata: {} },
      { name: "NSM Learning - Horas de aprendizaje", category: "learning", current_value: 11200, target_value: 15000, previous_value: 10500, unit: "hours", sort_order: 20, metadata: { nsm: true } },
      { name: "NSM Objetivos - OKRs actualizados", category: "objetivos", current_value: 280, target_value: 500, previous_value: 250, unit: "number", sort_order: 21, metadata: { nsm: true } },
      { name: "NSM Encuestas - Tasa de respuesta", category: "encuestas", current_value: 74, target_value: 85, previous_value: 70, unit: "percent", sort_order: 22, metadata: { nsm: true } },
      { name: "NSM Matriz - Mapas actualizados", category: "matrix", current_value: 10, target_value: 24, previous_value: 8, unit: "number", sort_order: 23, metadata: { nsm: true } },
      { name: "NSM 360 - Evaluaciones completadas", category: "360", current_value: 420, target_value: 500, previous_value: 380, unit: "number", sort_order: 24, metadata: { nsm: true } },
      { name: "NSM Learning Map - Mapas publicados", category: "learning_map", current_value: 450, target_value: 800, previous_value: 380, unit: "number", sort_order: 25, metadata: { nsm: true } },
      { name: "NSM Creator - Cursos publicados", category: "creator", current_value: 220, target_value: 400, previous_value: 180, unit: "number", sort_order: 26, metadata: { nsm: true } },
      { name: "Usuarios activos semanales (WAU)", category: "general", current_value: 2500, target_value: 4000, previous_value: 2300, unit: "number", sort_order: 30, metadata: {} },
      { name: "Usuarios activos mensuales (MAU)", category: "general", current_value: 3900, target_value: 6000, previous_value: 3600, unit: "number", sort_order: 31, metadata: {} },
      { name: "Tasa de retención mensual", category: "general", current_value: 90, target_value: 95, previous_value: 88, unit: "percent", sort_order: 32, metadata: {} },
      { name: "NPS", category: "general", current_value: 65, target_value: 75, previous_value: 62, unit: "points", sort_order: 33, metadata: {} },
      { name: "Tasa de adopción semanal", category: "general", current_value: 68, target_value: 85, previous_value: 65, unit: "percent", sort_order: 34, metadata: {} },
    ];

    const q2Data = [
      { name: "ARR Total Empresas", category: "general", current_value: 10200000, target_value: 12000000, previous_value: 9800000, unit: "USD", sort_order: 0, metadata: {} },
      { name: "ARR Objetivos", category: "objetivos", current_value: 117100, target_value: 150000, previous_value: 105000, unit: "USD", sort_order: 1, metadata: {} },
      { name: "ARR 360", category: "360", current_value: 127600, target_value: 160000, previous_value: 118000, unit: "USD", sort_order: 2, metadata: {} },
      { name: "ARR Encuestas", category: "encuestas", current_value: 74300, target_value: 90000, previous_value: 68000, unit: "USD", sort_order: 3, metadata: {} },
      { name: "ARR Matriz de Talento", category: "matrix", current_value: 43100, target_value: 60000, previous_value: 39000, unit: "USD", sort_order: 4, metadata: {} },
      { name: "ARR Contratación", category: "hiring", current_value: 8200, target_value: 15000, previous_value: 7200, unit: "USD", sort_order: 5, metadata: {} },
      { name: "ARR ASX", category: "asx", current_value: 48000, target_value: 70000, previous_value: 45000, unit: "USD", sort_order: 6, metadata: {} },
      { name: "ARR PYT", category: "pyt", current_value: 31000, target_value: 50000, previous_value: 28000, unit: "USD", sort_order: 7, metadata: {} },
      { name: "ARR Core", category: "core", current_value: 92000, target_value: 120000, previous_value: 85000, unit: "USD", sort_order: 8, metadata: {} },
      { name: "ARR Planes y Tareas", category: "planes_tareas", current_value: 18000, target_value: 30000, previous_value: 15000, unit: "USD", sort_order: 9, metadata: {} },
      { name: "ARR Learning Map", category: "learning_map", current_value: 28000, target_value: 40000, previous_value: 25000, unit: "USD", sort_order: 10, metadata: {} },
      { name: "ARR Creator", category: "creator", current_value: 14000, target_value: 25000, previous_value: 12000, unit: "USD", sort_order: 11, metadata: {} },
      { name: "NSM Learning - Horas de aprendizaje", category: "learning", current_value: 12400, target_value: 15000, previous_value: 11200, unit: "hours", sort_order: 20, metadata: { nsm: true } },
      { name: "NSM Objetivos - OKRs actualizados", category: "objetivos", current_value: 320, target_value: 500, previous_value: 280, unit: "number", sort_order: 21, metadata: { nsm: true } },
      { name: "NSM Encuestas - Tasa de respuesta", category: "encuestas", current_value: 78, target_value: 85, previous_value: 74, unit: "percent", sort_order: 22, metadata: { nsm: true } },
      { name: "NSM Matriz - Mapas actualizados", category: "matrix", current_value: 12, target_value: 24, previous_value: 10, unit: "number", sort_order: 23, metadata: { nsm: true } },
      { name: "NSM 360 - Evaluaciones completadas", category: "360", current_value: 450, target_value: 500, previous_value: 420, unit: "number", sort_order: 24, metadata: { nsm: true } },
      { name: "NSM Learning Map - Mapas publicados", category: "learning_map", current_value: 500, target_value: 800, previous_value: 450, unit: "number", sort_order: 25, metadata: { nsm: true } },
      { name: "NSM Creator - Cursos publicados", category: "creator", current_value: 260, target_value: 400, previous_value: 220, unit: "number", sort_order: 26, metadata: { nsm: true } },
      { name: "Usuarios activos semanales (WAU)", category: "general", current_value: 2800, target_value: 4000, previous_value: 2500, unit: "number", sort_order: 30, metadata: {} },
      { name: "Usuarios activos mensuales (MAU)", category: "general", current_value: 4300, target_value: 6000, previous_value: 3900, unit: "number", sort_order: 31, metadata: {} },
      { name: "Tasa de retención mensual", category: "general", current_value: 92, target_value: 95, previous_value: 90, unit: "percent", sort_order: 32, metadata: {} },
      { name: "NPS", category: "general", current_value: 68, target_value: 75, previous_value: 65, unit: "points", sort_order: 33, metadata: {} },
      { name: "Tasa de adopción semanal", category: "general", current_value: 72, target_value: 85, previous_value: 68, unit: "percent", sort_order: 34, metadata: {} },
    ];

    const sharedData = [
      { name: "Embudo Aprendizaje", category: "learning", current_value: 2100, unit: "number", description: "Usuarios que completan cursos cada mes", sort_order: 10, metadata: { funnel: true, stages: [
        { label: "Visitantes plataforma", value: 10000, rate: 1.0 },
        { label: "Cursos iniciados", value: 5200, rate: 0.52 },
        { label: "Lecciones completadas", value: 3800, rate: 0.73 },
        { label: "Cursos finalizados", value: 2100, rate: 0.55 },
        { label: "Certificaciones obtenidas", value: 850, rate: 0.40 },
      ]}},
      { name: "Embudo Contratación", category: "hiring", current_value: 85, unit: "number", description: "Contrataciones cerradas por mes", sort_order: 11, metadata: { funnel: true, stages: [
        { label: "Vacantes activas", value: 45, rate: 1.0 },
        { label: "Postulaciones recibidas", value: 320, rate: 1.0 },
        { label: "Screening completado", value: 280, rate: 0.88 },
        { label: "Entrevistas realizadas", value: 190, rate: 0.68 },
        { label: "Ofertas enviadas", value: 120, rate: 0.63 },
        { label: "Contrataciones cerradas", value: 85, rate: 0.71 },
      ]}},
      { name: "Embudo Evaluaciones 360", category: "360", current_value: 420, unit: "number", description: "Evaluaciones completadas por ciclo", sort_order: 12, metadata: { funnel: true, stages: [
        { label: "Evaluaciones iniciadas", value: 580, rate: 1.0 },
        { label: "Evaluaciones completadas", value: 420, rate: 0.72 },
      ]}},
      { name: "Embudo Objetivos", category: "objetivos", current_value: 185, unit: "number", description: "OKRs completados por trimestre", sort_order: 13, metadata: { funnel: true, stages: [
        { label: "OKRs definidos", value: 320, rate: 1.0 },
        { label: "OKRs en seguimiento", value: 280, rate: 0.88 },
        { label: "OKRs actualizados", value: 240, rate: 0.86 },
        { label: "OKRs completados", value: 185, rate: 0.77 },
      ]}},
      { name: "Embudo Encuestas", category: "encuestas", current_value: 3400, unit: "number", description: "Encuestas completadas por mes", sort_order: 14, metadata: { funnel: true, stages: [
        { label: "Encuestas enviadas", value: 8500, rate: 1.0 },
        { label: "Encuestas iniciadas", value: 5200, rate: 0.61 },
        { label: "Encuestas completadas", value: 3400, rate: 0.65 },
        { label: "Reportes generados", value: 1200, rate: 0.35 },
      ]}},
      { name: "Embudo Matriz de Talento", category: "matrix", current_value: 180, unit: "number", description: "Mapas de talento actualizados por mes", sort_order: 15, metadata: { funnel: true, stages: [
        { label: "Colaboradores mapeados", value: 450, rate: 1.0 },
        { label: "Evaluaciones realizadas", value: 380, rate: 0.84 },
        { label: "Mapas actualizados", value: 280, rate: 0.74 },
        { label: "Planes de acción", value: 180, rate: 0.64 },
      ]}},
      { name: "Embudo ASX", category: "asx", current_value: 890, unit: "number", description: "Encuestas de experiencia completadas", sort_order: 16, metadata: { funnel: true, stages: [
        { label: "Encuestas enviadas", value: 3200, rate: 1.0 },
        { label: "Participaciones", value: 2100, rate: 0.66 },
        { label: "Insights generados", value: 1500, rate: 0.71 },
        { label: "Acciones tomadas", value: 890, rate: 0.59 },
      ]}},
      { name: "Embudo PYT", category: "pyt", current_value: 320, unit: "number", description: "Evaluaciones de desempeño completadas", sort_order: 17, metadata: { funnel: true, stages: [
        { label: "Evaluaciones iniciadas", value: 640, rate: 1.0 },
        { label: "Autoevaluaciones", value: 580, rate: 0.91 },
        { label: "Evaluaciones pares", value: 480, rate: 0.83 },
        { label: "Feedback entregado", value: 400, rate: 0.83 },
        { label: "Metas actualizadas", value: 320, rate: 0.80 },
      ]}},
      { name: "Embudo Aprendizaje - Learning Map", category: "learning_map", current_value: 450, unit: "number", description: "Mapas de aprendizaje creados", sort_order: 18, metadata: { funnel: true, stages: [
        { label: "Usuarios activos", value: 1200, rate: 1.0 },
        { label: "Mapas iniciados", value: 850, rate: 0.71 },
        { label: "Mapas completados", value: 620, rate: 0.73 },
        { label: "Mapas publicados", value: 450, rate: 0.73 },
      ]}},
      { name: "Embudo Creator", category: "creator", current_value: 180, unit: "number", description: "Contenido creado por mes", sort_order: 19, metadata: { funnel: true, stages: [
        { label: "Creadores activos", value: 340, rate: 1.0 },
        { label: "Cursos iniciados", value: 280, rate: 0.82 },
        { label: "Cursos publicados", value: 220, rate: 0.79 },
        { label: "Cursos certificados", value: 180, rate: 0.82 },
      ]}},
      { name: "Embudo Core", category: "core", current_value: 1200, unit: "number", description: "Empresas activas en Core", sort_order: 20, metadata: { funnel: true, stages: [
        { label: "Empresas registradas", value: 2400, rate: 1.0 },
        { label: "API activa", value: 1800, rate: 0.75 },
        { label: "Personalización completa", value: 1500, rate: 0.83 },
        { label: "Gestión activa", value: 1200, rate: 0.80 },
      ]}},
    ];

    const toRow = (m: any, period: string) => ({
      name: m.name,
      category: m.category,
      subcategory: m.subcategory || null,
      current_value: m.current_value,
      target_value: m.target_value || null,
      previous_value: m.previous_value || null,
      unit: m.unit,
      description: m.description || (m.subcategory ? `Métrica de ${m.category} - ${m.subcategory.replace(/_/g, " ")}` : "Métrica general"),
      workspace_id: workspaceId,
      source: "pdf_seed",
      source_date: today,
      period,
      sort_order: m.sort_order,
      metadata: m.metadata || {},
    });

    try {
      const { error: delErr } = await supabase
        .from("metrics")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("source", "pdf_seed");
      if (delErr) console.warn("[Seed] Delete existing warning:", delErr);

      const allInserts = [
        ...q1Data.map(m => toRow(m, "Q1 2026")),
        ...q2Data.map(m => toRow(m, "Q2 2026")),
        ...sharedData.map(m => ({ ...toRow(m, "Q1 2026"), current_value: m.current_value, metadata: m.metadata })),
        ...sharedData.map(m => ({ ...toRow(m, "Q2 2026"), current_value: m.current_value, metadata: m.metadata })),
      ];

      const { error } = await supabase.from("metrics").insert(allInserts);
      if (error) {
        console.error("[Seed] Error:", error);
        alert("Error al sembrar métricas: " + error.message);
      } else {
        const result = await getMetrics(workspaceId, undefined, period);
        if (result.success && result.data) setMetrics(result.data);
      }
    } catch (e: any) {
      console.error("[Seed] Exception:", e);
      alert("Error al sembrar métricas: " + (e.message || "desconocido"));
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
          {lastUpdate && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#161927]/50 border border-white/5 rounded-xl">
              <span className={`w-1.5 h-1.5 rounded-full ${lastUpdate.source === "gemini_analysis" ? "bg-[#2ec6ff]" : lastUpdate.source === "pdf_seed" ? "bg-[#f49e04]" : "bg-white/20"}`} />
              <span className="text-[9px] text-white/40">
                {lastUpdate.source === "gemini_analysis" ? "Análisis automático" : lastUpdate.source === "pdf_seed" ? "Datos semilla" : lastUpdate.source}
              </span>
              <span className="text-[9px] text-white/20 font-mono">{lastUpdate.date}</span>
            </div>
          )}
          {metrics.length > 0 && (
            <button
              onClick={() => seedMetrics()}
              disabled={seeding}
              className="px-4 py-3 bg-[#161927]/80 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-primary/30 transition-all disabled:opacity-50"
            >
              {seeding ? "Sembrando..." : "Re-sembrar métricas"}
            </button>
          )}
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-[#161927]/50 border border-white/5 rounded-2xl p-1 w-max">
        {["Q1 2026", "Q2 2026"].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
              period === p
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-1 bg-[#161927]/50 border border-white/5 rounded-2xl p-1" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
              <span className="block text-[8px] font-normal normal-case tracking-normal mt-0.5 opacity-60">{tab.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {activeTab === "General" ? (
          <>
            <div className="bg-gradient-to-br from-[#1a6bff]/10 to-transparent border border-primary/20 rounded-2xl p-5">
              <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">ARR Total</div>
              <div className="text-2xl font-black text-white font-mono">{formatMetricValue(totalArr, "USD")}</div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[9px] text-white/30">{metrics.length} métricas</span>
                {funnelMetrics.length > 0 && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">{funnelMetrics.length} embudos</span>}
                {nsmMetrics.length > 0 && <span className="text-[9px] bg-[#f49e04]/20 text-[#f49e04] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">{nsmMetrics.length} NSM</span>}
              </div>
            </div>
            {Object.entries(categoryArr).slice(0, 2).map(([cat, { arr, count }], idx) => {
              const style = getCatStyle(cat, idx);
              return (
                <div key={cat} className={`bg-gradient-to-br from-[${style.hex}]/10 to-transparent border border-[${style.hex}]/20 rounded-2xl p-5`}>
                  <div className={`text-[10px] ${style.text} font-black uppercase tracking-widest mb-1`}>ARR {CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
                  <div className="text-2xl font-black text-white font-mono">{formatMetricValue(arr, "USD")}</div>
                  <div className="text-[10px] text-white/30 mt-1">{count} métricas</div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="bg-gradient-to-br from-[#1a6bff]/10 to-transparent border border-primary/20 rounded-2xl p-5">
              <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">ARR {activeTab}</div>
              <div className="text-2xl font-black text-white font-mono">{formatMetricValue(
                arrMetrics.filter(m => m.category === activeTab.toLowerCase()).reduce((sum, m) => sum + (m.current_value || 0), 0),
                "USD"
              )}</div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[9px] text-white/30">{filteredByTeam.length} métricas</span>
                {funnelMetrics.filter(m => m.category === activeTab.toLowerCase()).length > 0 && (
                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                    {funnelMetrics.filter(m => m.category === activeTab.toLowerCase()).length} embudos
                  </span>
                )}
                {nsmMetrics.filter(m => m.category === activeTab.toLowerCase()).length > 0 && (
                  <span className="text-[9px] bg-[#f49e04]/20 text-[#f49e04] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                    {nsmMetrics.filter(m => m.category === activeTab.toLowerCase()).length} NSM
                  </span>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2ec6ff]/10 to-transparent border border-[#2ec6ff]/20 rounded-2xl p-5">
              <div className="text-[10px] text-[#2ec6ff] font-black uppercase tracking-widest mb-1">Productos</div>
              <div className="text-2xl font-black text-white font-mono">{groupedByProduct.length}</div>
              <div className="text-[10px] text-white/30 mt-1">{groupedByProduct.map(g => g.label).join(" · ")}</div>
            </div>
            <div className="bg-gradient-to-br from-[#10b981]/10 to-transparent border border-[#10b981]/20 rounded-2xl p-5">
              <div className="text-[10px] text-[#10b981] font-black uppercase tracking-widest mb-1">Usuarios Activos</div>
              <div className="text-2xl font-black text-white font-mono">{formatMetricValue(mau ?? 0, "number")}</div>
              <div className="text-[10px] text-white/30 mt-1">
                {wau != null ? `${formatMetricValue(wau, "number")} semanales` : ""}
                {nps != null ? ` · NPS ${nps}` : ""}
              </div>
            </div>
          </>
        )}
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
      ) : activeTab === "General" ? (
        <div className="space-y-4">
          {/* Engagement row */}
          {(() => {
            const engMetrics = metrics.filter(m => m.category === "general" && !m.name.startsWith("ARR"));
            if (engMetrics.length === 0) return null;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {engMetrics.slice(0, 2).map(m => (
                    <div key={m.id} className="bg-[#161927]/50 border border-white/5 rounded-2xl p-4">
                      <div className="text-[9px] text-white/40 uppercase tracking-wider truncate mb-1">{m.name}</div>
                      <div className="text-lg font-black text-white font-mono">{formatMetricValue(m.current_value || 0, m.unit)}</div>
                      {m.target_value && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${Math.min((m.current_value || 0) / m.target_value * 100, 100)}%` }} />
                          </div>
                          <span className="text-[9px] text-white/30">{Math.round((m.current_value || 0) / m.target_value * 100)}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {engMetrics.slice(2).map(m => (
                    <div key={m.id} className="bg-[#161927]/50 border border-white/5 rounded-2xl p-4">
                      <div className="text-[9px] text-white/40 uppercase tracking-wider truncate mb-1">{m.name}</div>
                      <div className="text-lg font-black text-white font-mono">{formatMetricValue(m.current_value || 0, m.unit)}</div>
                      {m.target_value && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${Math.min((m.current_value || 0) / m.target_value * 100, 100)}%` }} />
                          </div>
                          <span className="text-[9px] text-white/30">{Math.round((m.current_value || 0) / m.target_value * 100)}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Product grid - 3 columns dashboard style */}
          {(() => {
            const productCards = PRODUCT_GROUPS
              .filter(pg => pg.key !== "general")
              .map(pg => {
                const productMetrics = metrics.filter(m => m.category === pg.key);
                if (productMetrics.length === 0) return null;
                const arr = productMetrics.find(m => m.unit === "USD");
                const nsm = productMetrics.find(m => (m.metadata as any)?.nsm);
                const funnel = productMetrics.find(m => (m.metadata as any)?.funnel);
                const funnelStages = funnel ? (funnel.metadata as any)?.stages : null;
                return { pg, arr, nsm, funnelStages, total: productMetrics.length };
              })
              .filter(Boolean);

            if (productCards.length === 0) return null;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {productCards.map(card => card && (
                  <div key={card.pg.key} className="bg-[#161927]/50 border border-white/5 rounded-2xl p-4" style={{ borderTop: `3px solid ${card.pg.color}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm" style={{ color: card.pg.color }}>{card.pg.icon}</span>
                      <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: card.pg.color }}>{card.pg.label}</h3>
                    </div>
                    <div className="space-y-1.5">
                      {card.arr && (
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-white/40">ARR</span>
                          <span className="text-xs font-bold text-white font-mono">{formatMetricValue(card.arr.current_value || 0, "USD")}</span>
                        </div>
                      )}
                      {card.nsm && (
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-white/40">NSM</span>
                          <span className="text-xs font-bold text-white font-mono">{formatMetricValue(card.nsm.current_value || 0, card.nsm.unit)}</span>
                        </div>
                      )}
                      {card.funnelStages && card.funnelStages.length >= 2 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-white/40">Conversión</span>
                          <span className="text-[10px] text-white/70 font-mono">
                            {(card.funnelStages[card.funnelStages.length - 1].value / card.funnelStages[0].value * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {card.arr && card.arr.target_value && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min((card.arr.current_value || 0) / card.arr.target_value * 100, 100)}%`, backgroundColor: card.pg.color }} />
                          </div>
                          <span className="text-[8px] text-white/30">{Math.round((card.arr.current_value || 0) / card.arr.target_value * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="space-y-10">
          {groupedByProduct.map(pg => (
            <div key={pg.key}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm" style={{ color: pg.color }}>{pg.icon}</span>
                <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: pg.color }}>
                  {pg.label}
                </h2>
                <span className="text-[10px] text-white/20 font-mono">{pg.metrics.length} métricas</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pg.metrics.map((m: Metric) => (
                  <MetricCard key={m.id} metric={m} logs={logsByMetric[m.id] || []} catIndex={getCategoryIndex(nonGeneralCategories, activeTab.toLowerCase())} />
                ))}
              </div>
            </div>
          ))}

          {/* Always show General metrics at the bottom */}
          {(() => {
            const genMetrics = metrics.filter(m => m.category === "general");
            if (genMetrics.length === 0) return null;
            return (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-[#1a6bff]">⬡</span>
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#1a6bff]">General</h2>
                  <span className="text-[10px] text-white/20 font-mono">{genMetrics.length} métricas</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {genMetrics.map(m => (
                    <MetricCard key={m.id} metric={m} logs={logsByMetric[m.id] || []} catIndex={-1} />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
