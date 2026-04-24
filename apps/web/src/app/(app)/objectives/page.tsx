"use client";

import { useState } from "react";

/* ─── Types ────────────────────────────────────────────────────── */

type ObjType = "Business Outcome" | "Product Outcome" | "Output";
type Priority = "critica" | "alta" | "media" | "baja";
type Status = "en_curso" | "completado" | "pausado";

interface KeyResult {
  id: string;
  description: string;
  meta: string;
  avance: number; // 0-100
}

interface Objective {
  id: string;
  name: string;
  tipo: ObjType;
  priority: Priority;
  status: Status;
  peso: number; // % weight
  keyResults: KeyResult[];
  comentarios?: string;
  fechaCumplimiento?: string;
}

/* ─── Mock data (from UBITS OKRs sheet) ────────────────────────── */

const OBJECTIVES: Objective[] = [
  {
    id: "1",
    name: "Incrementar el ARR",
    tipo: "Business Outcome",
    priority: "critica",
    status: "en_curso",
    peso: 40,
    fechaCumplimiento: "2026-12-31",
    keyResults: [
      { id: "1-1", description: "Incrementar el ARR anual", meta: "ARR $2.5M", avance: 62 },
    ],
    comentarios: "El crecimiento de ARR es el principal indicador de salud del negocio. Se enfoca en expansión de clientes existentes y nuevas adquisiciones enterprise.",
  },
  {
    id: "2",
    name: "Incrementar la retención de nuestros clientes",
    tipo: "Business Outcome",
    priority: "alta",
    status: "en_curso",
    peso: 25,
    fechaCumplimiento: "2026-09-30",
    keyResults: [
      { id: "2-1", description: "Incrementar Revenue Retention", meta: "RR > 110%", avance: 85 },
    ],
    comentarios: "Reducir el churn e incrementar el NRR mediante programas de éxito del cliente y mejoras en el producto.",
  },
  {
    id: "3",
    name: "Incrementar el engagement de producto",
    tipo: "Product Outcome",
    priority: "alta",
    status: "en_curso",
    peso: 20,
    fechaCumplimiento: "2026-09-30",
    keyResults: [
      { id: "3-1", description: "Aumentar el NSM del producto", meta: "NSM de $1.2M a $2M ARR", avance: 45 },
    ],
    comentarios: "Medir y optimizar el North Star Metric para reflejar el valor real entregado a los usuarios activos.",
  },
  {
    id: "4",
    name: "Liberación de producto",
    tipo: "Output",
    priority: "media",
    status: "completado",
    peso: 15,
    fechaCumplimiento: "2026-06-30",
    keyResults: [
      { id: "4-1", description: "Lanzar versión 2.0 con funcionalidades clave", meta: "v2.0 en fecha con features a, b, c", avance: 100 },
    ],
    comentarios: "Lanzamiento de la nueva versión del producto con módulo de automatización, dashboard rediseñado y API pública.",
  },
  {
    id: "5",
    name: "Mejorar la calidad del producto",
    tipo: "Product Outcome",
    priority: "media",
    status: "en_curso",
    peso: 15,
    fechaCumplimiento: "2026-12-31",
    keyResults: [
      { id: "5-1", description: "Reducir tickets de soporte", meta: "De 120 a 40 tickets/mes", avance: 58 },
      { id: "5-2", description: "Pagar deuda técnica y resolver bugs críticos", meta: "0 bugs P0 abiertos", avance: 72 },
    ],
    comentarios: "Iniciativas de calidad: reducción de deuda técnica, mejora en cobertura de tests y estabilidad de la plataforma.",
  },
  {
    id: "6",
    name: "Reducir burn",
    tipo: "Business Outcome",
    priority: "baja",
    status: "en_curso",
    peso: 10,
    fechaCumplimiento: "2026-12-31",
    keyResults: [
      { id: "6-1", description: "Ahorrar horas hombre optimizando procesos", meta: "Reducir 30% horas manuales", avance: 38 },
      { id: "6-2", description: "Reducir costos de infraestructura", meta: "Ahorro $15K/mes", avance: 55 },
    ],
    comentarios: "Eficiencia operativa: automatización de procesos internos y optimización de infraestructura cloud.",
  },
];

/* ─── Helpers ───────────────────────────────────────────────────── */

const PRIORITY_STYLES: Record<Priority, string> = {
  critica: "bg-red-100 text-red-700",
  alta:    "bg-orange-100 text-orange-700",
  media:   "bg-blue-100 text-blue-700",
  baja:    "bg-navy/8 text-navy/50",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  critica: "CRÍTICA",
  alta:    "ALTA",
  media:   "MEDIA",
  baja:    "BAJA",
};

const STATUS_STYLES: Record<Status, string> = {
  en_curso:   "bg-primary/10 text-primary",
  completado: "bg-green-100 text-green-700",
  pausado:    "bg-navy/8 text-navy/40",
};

const STATUS_LABELS: Record<Status, string> = {
  en_curso:   "EN CURSO",
  completado: "COMPLETADO",
  pausado:    "PAUSADO",
};

const TYPE_STYLES: Record<ObjType, string> = {
  "Business Outcome": "bg-purple-50 text-purple-700",
  "Product Outcome":  "bg-teal-50 text-teal-700",
  "Output":           "bg-amber-50 text-amber-700",
};

function getAvanceColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-primary";
  return "bg-orange-400";
}

function calcGlobalProgress(objectives: Objective[]) {
  const totalPeso = objectives.reduce((s, o) => s + o.peso, 0);
  const weighted = objectives.reduce((s, o) => {
    const avgKr = o.keyResults.reduce((a, k) => a + k.avance, 0) / o.keyResults.length;
    return s + (avgKr * o.peso) / 100;
  }, 0);
  return Math.round((weighted / totalPeso) * 100);
}

/* ─── Sub-components ────────────────────────────────────────────── */

function ObjectiveRow({ obj, onToggle, expanded }: { obj: Objective; onToggle: () => void; expanded: boolean }) {
  const avgAvance = Math.round(obj.keyResults.reduce((s, k) => s + k.avance, 0) / obj.keyResults.length);

  return (
    <div className={`bg-white rounded-xl border transition-all ${expanded ? "border-primary/30 shadow-sm" : "border-border/30 hover:border-border/60"}`}>
      {/* Main row */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Tags */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[obj.priority]}`}>
            {PRIORITY_LABELS[obj.priority]}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[obj.status]}`}>
            {STATUS_LABELS[obj.status]}
          </span>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-navy truncate">{obj.name}</h3>
          <span className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_STYLES[obj.tipo]}`}>
            {obj.tipo}
          </span>
        </div>

        {/* Peso */}
        <div className="text-center flex-shrink-0 w-16">
          <p className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-0.5">PESO</p>
          <p className="text-lg font-black text-navy">{obj.peso}%</p>
        </div>

        {/* Meta (first KR) */}
        <div className="flex-shrink-0 w-40 hidden md:block">
          <p className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-0.5">META</p>
          <p className="text-xs text-navy/70 font-medium leading-snug line-clamp-2">{obj.keyResults[0].meta}</p>
        </div>

        {/* Avance */}
        <div className="flex-shrink-0 w-36 hidden lg:block">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">AVANCE</p>
            <p className="text-sm font-black text-navy">{avgAvance}%</p>
          </div>
          <div className="h-1.5 w-full bg-navy/8 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${getAvanceColor(avgAvance)}`} style={{ width: `${avgAvance}%` }} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 text-xs font-semibold text-navy/60 hover:border-primary/40 hover:text-primary transition-all"
          >
            Ver más
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button className="p-1.5 rounded-lg hover:bg-navy/5 text-navy/30 hover:text-navy/60 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded: Key Results + Comentarios */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-border/10 pt-4 space-y-4">
          {obj.comentarios && (
            <p className="text-sm text-navy/50 leading-relaxed italic border-l-2 border-primary/20 pl-3">
              {obj.comentarios}
            </p>
          )}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-navy/30">KEY RESULTS</p>
            {obj.keyResults.map((kr) => (
              <div key={kr.id} className="bg-bg rounded-lg p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy mb-0.5">{kr.description}</p>
                  <p className="text-xs text-navy/40">{kr.meta}</p>
                </div>
                <div className="flex-shrink-0 w-40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">AVANCE</span>
                    <span className="text-sm font-black text-navy">{kr.avance}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-navy/8 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getAvanceColor(kr.avance)}`} style={{ width: `${kr.avance}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function ObjectivesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const globalProgress = calcGlobalProgress(OBJECTIVES);
  const completedCount = OBJECTIVES.filter((o) => o.status === "completado").length;

  const filtered = OBJECTIVES.filter((o) => {
    if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-navy">Objetivos</h1>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Crear objetivo
        </button>
      </div>

      {/* Global progress card */}
      <div className="bg-white rounded-xl border border-border/30 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Left: big number */}
          <div className="flex-shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-navy/40 mb-1">TOTAL CUMPLIMIENTO GLOBAL</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-navy">{globalProgress}%</span>
              <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                +12%
              </span>
            </div>
            <p className="text-sm text-navy/50 mt-1 max-w-xs">El rendimiento del equipo ha aumentado significativamente respecto al trimestre anterior.</p>
          </div>

          {/* Right: progress bar */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-navy/40">AVANCE GENERAL</p>
              <p className="text-sm font-bold text-navy">{completedCount} Objetivos / {OBJECTIVES.length} Totales</p>
            </div>
            <div className="h-3 w-full bg-navy/6 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${globalProgress}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-navy/30">0%</span>
              <span className="text-xs font-semibold text-navy/50">Q4 Progresión: {globalProgress}%</span>
              <span className="text-xs text-navy/30">100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="flex items-center gap-1.5 text-sm border border-border/30 rounded-lg px-3 py-1.5 text-navy/60 bg-white focus:outline-none focus:border-primary/40 cursor-pointer"
        >
          <option value="all">Prioridad</option>
          <option value="critica">Crítica</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex items-center gap-1.5 text-sm border border-border/30 rounded-lg px-3 py-1.5 text-navy/60 bg-white focus:outline-none focus:border-primary/40 cursor-pointer"
        >
          <option value="all">Fecha de cumplimiento</option>
          <option value="en_curso">En curso</option>
          <option value="completado">Completado</option>
          <option value="pausado">Pausado</option>
        </select>
        <button className="ml-auto flex items-center gap-1.5 text-sm text-navy/60 hover:text-navy font-medium transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          Ordenar
        </button>
      </div>

      {/* Objectives list */}
      <div className="space-y-3">
        {filtered.map((obj) => (
          <ObjectiveRow
            key={obj.id}
            obj={obj}
            expanded={expandedId === obj.id}
            onToggle={() => setExpandedId(expandedId === obj.id ? null : obj.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-navy/30 text-sm">No hay objetivos con ese filtro.</div>
        )}
      </div>
    </div>
  );
}
