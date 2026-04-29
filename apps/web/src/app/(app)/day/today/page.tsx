"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AddSourceDrawer } from "@/components/sources/AddSourceDrawer";
import { getDaySummary, saveDayAnalysis } from "@/lib/services/summary-service";
import { getSourcesByDate, createSource, deleteSource, updateSource } from "@/lib/services/source-service";
import { getOrCreateWorkspace } from "@/lib/services/workspace-service";
import { fetchGoogleDriveFiles, DriveFile } from "@/lib/services/google-drive-service";
import { fetchGoogleCalendarEvents, CalendarEvent } from "@/lib/services/google-calendar-service";
import { analyzeDay } from "@/lib/services/analyze-service";
import { DayNavigator } from "@/components/ui/DayNavigator";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ResumenDelAnalisisTab } from "@/components/day/ResumenDelAnalisisTab";
import { TaskDrawer } from "@/components/day/TaskDrawer";
import { supabase } from "@/lib/supabase";
import { getTasks, reorderTasks } from "@/lib/services/task-service";
import { fetchJiraIssues } from "@/lib/services/jira-service";

/* ─── Data ────────────────────────────────────────────────────── */

const focusCards = [
  {
    tag: "OBJETIVO CRÍTICO",
    tagColor: "bg-red-500/100/10 text-red-600",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: "Cierre Alianza SteelCore",
    description: "Finalizar términos de exclusividad para la región LATAM antes de las 17:00h.",
  },
  {
    tag: "MÉTRICAS",
    tagColor: "bg-primary/100/10 text-blue-600",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "Validación Q4",
    description: "Revisar proyecciones de ingresos ajustadas tras la última ronda de inversión.",
  },
  {
    tag: "ESTRATÉGICO",
    tagColor: "bg-purple-500/10 text-purple-600",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Aprobación Presupuesto Q4",
    description: "Confirmar ajustes presupuestarios solicitados por la dirección financiera.",
  },
];

const tasks = [
  { id: 1, title: "Actualizar certificados SSL del cluster de producción", tag: "CERTIFICADOS", tagColor: "bg-primary/100/10 text-blue-700", date: "16 Oct, 2023", file: "Reporte Seguridad.pdf", priority: "ALTA", priorityColor: "text-red-500" },
  { id: 2, title: "Definir KPIs para el módulo de fidelización", tag: "MÉTRICAS", tagColor: "bg-primary/100/10 text-blue-700", date: "20 Oct, 2023", file: "Minuta Reunión.docx", priority: "MEDIA", priorityColor: "text-orange-500" },
  { id: 3, title: "Revisar propuesta de diseño para el panel móvil", tag: "DISEÑO", tagColor: "bg-purple-500/10 text-purple-700", date: "15 Oct, 2023", file: "Feedback_Cliente.txt", priority: "BAJA", priorityColor: "text-gray-400" },
];

type SourceType = "FUENTE EXTERNA" | "NOTAS DE GEMINI" | "DOCUMENTO";

interface Source {
  id: string | number;
  name: string;
  type: SourceType;
  format: string;
  time: string;
  checked: boolean;
  url?: string | null;
  icon: React.ReactNode;
  isManual?: boolean;
  displayTag?: string | React.ReactNode;
  externalSourceId?: string | null;
  mimeType?: string | null;
  origin?: string;
  description?: string;
}

const initialSources: Source[] = [
  {
    id: 1, name: "Minuta de Reunión", type: "FUENTE EXTERNA", format: "DOCX", time: "09:15", checked: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 2, name: "Reporte Trimestral Q3", type: "NOTAS DE GEMINI", format: "PDF", time: "10:30", checked: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 3, name: "Presupuesto Operativo 2024", type: "FUENTE EXTERNA", format: "XLSX", time: "11:00", checked: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    id: 4, name: "Estrategia de Producto v2", type: "NOTAS DE GEMINI", format: "DOC", time: "12:45", checked: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 5, name: "Análisis de Mercado", type: "FUENTE EXTERNA", format: "PDF", time: "11:20", checked: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 6, name: "Feedback del Cliente VIP", type: "FUENTE EXTERNA", format: "TXT", time: "14:00", checked: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

/* ─── Helpers ─────────────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const typeStyles: Record<SourceType, string> = {
  "FUENTE EXTERNA": "bg-orange-500/100/10 text-orange-600",
  "NOTAS DE GEMINI": "bg-purple-500/10 text-purple-600",
  "DOCUMENTO": "bg-primary/100/10 text-blue-600",
};

/* ─── Components ─────────────────────────────────────────────── */

function FeedbackTab({ items }: { items: any[] }) {
  const getTypeStyle = (color: string) => {
    switch (color) {
      case 'red':  return 'bg-red-100 text-red-700';
      case 'teal': return 'bg-teal-100 text-teal-700';
      default:     return 'bg-blue-100 text-blue-700';
    }
  };

  const getPriorityStyle = (priority: string) => {
    if (priority === 'critica') return 'bg-red-100 text-red-700';
    if (priority === 'alta')    return 'bg-orange-100 text-orange-700';
    return 'bg-card/8 text-white/50';
  };

  const getPriorityLabel = (priority: string) => {
    if (priority === 'critica') return 'CRÍTICA';
    if (priority === 'alta')    return 'ALTA';
    return 'MEDIA';
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wide">FEEDBACK DEL DÍA</h2>
          <span className="text-xs font-semibold px-2 py-0.5 bg-card/6 rounded-md text-white/40">{items.length} items</span>
        </div>
        <button className="px-4 py-2 rounded-lg border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Crear feedback
        </button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="text-sm border border-white/30 rounded-lg px-3 py-1.5 text-white/60 bg-card focus:outline-none focus:border-primary/40 cursor-pointer">
          <option>Tipo de feedback</option>
          <option>Observación</option>
          <option>Preocupación</option>
          <option>Sugerencia</option>
        </select>
        <select className="text-sm border border-white/30 rounded-lg px-3 py-1.5 text-white/60 bg-card focus:outline-none focus:border-primary/40 cursor-pointer">
          <option>Prioridad</option>
          <option>Crítica</option>
          <option>Alta</option>
          <option>Media</option>
        </select>
        <select className="text-sm border border-white/30 rounded-lg px-3 py-1.5 text-white/60 bg-card focus:outline-none focus:border-primary/40 cursor-pointer">
          <option>Fuente</option>
        </select>
        <button className="ml-auto flex items-center gap-1.5 text-sm text-white/60 hover:text-white font-medium transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          Ordenar
        </button>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => {
          // Support both new and old field names
          const description = item.description || item.comentario || item.content || '';
          const feedbackType = item.feedbackType || item.tipo || 'feedback';
          const priority = item.priority || 'media';
          const source = item.source || item.origen || '';
          return (
            <div key={i} className="bg-card rounded-xl border border-white/20 p-5 flex flex-col gap-3 hover:shadow-sm hover:border-white/40 transition-all">
              {/* Top row: type tag + priority tag */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeStyle(item.feedbackTypeColor || 'blue')}`}>
                  {feedbackType}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(priority)}`}>
                  {getPriorityLabel(priority)}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-white/70 leading-snug flex-1">{description}</p>

              {/* Source */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                <span className="text-white/30">{getSourceIcon(item.sourceType)}</span>
                <span className="text-xs text-white/40 truncate">{source}</span>
              </div>

              {/* Convertir a tarea */}
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/30 text-sm font-medium text-white/70 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Convertir a tarea
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TasksTab({ 
  items, 
  objectives = [], 
  onTaskClick, 
  onAddTask,
  onReorder,
  onDelete
}: { 
  items: any[], 
  objectives: any[], 
  onTaskClick: (task: any) => void, 
  onAddTask: () => void,
  onReorder: (newItems: any[]) => void,
  onDelete: (id: string) => void
}) {
  const jiraTasks = items.filter(it => it.origin === 'jira');
  const aiTasks = items.filter(it => it.origin !== 'jira');

  const getPriorityTextColor = (priority: string) => {
    switch(priority?.toLowerCase()) {
      case 'high':
      case 'highest':
      case 'alta': return 'text-red-500 font-black';
      case 'medium':
      case 'media': return 'text-blue-400 font-black';
      case 'low':
      case 'lowest':
      case 'baja': return 'text-white/20 font-black';
      default: return 'text-white/40 font-black';
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('done') || s.includes('finalizado') || s.includes('finalizada')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (s.includes('progress') || s.includes('curso') || s.includes('revisión')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-white/5 text-white/40 border-white/10';
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ─── SECTION 1: JIRA EXECUTION ──────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shadow-lg border border-blue-500/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">EJECUCIÓN JIRA</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Sincronizado con tu tablero operativo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 tracking-widest">
              {jiraTasks.length} HISTORIAS ACTIVAS
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {jiraTasks.map((task, i) => (
            <div 
              key={task.id || i}
              onClick={() => onTaskClick(task)}
              className="bg-card rounded-[2rem] border border-white/5 p-6 flex items-start gap-6 hover:border-blue-500/30 transition-all cursor-pointer group/jira relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16" />
              
              {/* Key & Status Column */}
              <div className="flex flex-col gap-3 min-w-[100px]">
                <span className="text-[11px] font-black text-blue-400/80 bg-blue-500/5 px-2.5 py-1 rounded-lg border border-blue-500/10 tracking-widest text-center">
                  {task.external_key}
                </span>
                <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg border text-center tracking-widest uppercase ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>

              {/* Main Info */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-lg font-black text-white group-hover/jira:text-blue-400 transition-colors leading-tight">
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                      {typeof task.description === 'string' ? task.description : task.description?.content?.[0]?.content?.[0]?.text}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Goal Badge */}
                  {task.goal_id && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(26,107,255,0.6)]" />
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                        {objectives.find(o => o.id === task.goal_id)?.title || "Objetivo Estratégico"}
                      </span>
                    </div>
                  )}

                  {/* Date Badge */}
                  {task.due_date && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/20">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        VENCE: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <span className={`text-[10px] font-black tracking-widest uppercase ${getPriorityTextColor(task.priority)}`}>
                    PRIORIDAD: {task.priority}
                  </span>
                </div>

                {/* Subtasks Visual Progress */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Ejecución de subtareas ({task.subtasks.length})</span>
                      <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest">
                        {Math.round((task.subtasks.filter((s: any) => {
                          const sName = (s.fields?.status?.name || "").toLowerCase();
                          return sName.includes('done') || sName.includes('finalizado') || sName.includes('finalizada') || sName.includes('completado');
                        }).length / task.subtasks.length) * 100)}%
                      </span>
                    </div>
                    <div className="flex gap-1 h-1">
                      {task.subtasks.map((s: any, idx: number) => {
                        const sName = (s.fields?.status?.name || "").toLowerCase();
                        const isDone = sName.includes('done') || sName.includes('finalizado') || sName.includes('finalizada') || sName.includes('completado');
                        return (
                          <div key={idx} className={`flex-1 rounded-full ${isDone ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-white/5'}`} />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SECTION 2: AI ACTION PLAN ──────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shadow-lg border border-purple-500/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">PLAN DE ACCIÓN IA</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Detectado de tus fuentes y reuniones</p>
            </div>
          </div>
          <button 
            onClick={onAddTask}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Crear tarea manual
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiTasks.map((task, i) => (
            <div 
              key={task.id || i}
              onClick={() => onTaskClick(task)}
              className="bg-card rounded-3xl border border-white/10 p-5 hover:border-purple-500/40 transition-all cursor-pointer group/ai relative overflow-hidden"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover/ai:text-purple-400 group-hover/ai:bg-purple-500/5 transition-all">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"></path><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"></path></svg>
                </div>
                <div className="flex-1 space-y-3">
                  <h5 className="text-[14px] font-black text-white leading-tight">{task.title}</h5>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${getStatusColor(task.status)}`}>
                      {task.status || 'PENDIENTE'}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${getPriorityTextColor(task.priority)}`}>
                      {task.priority || 'MEDIA'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Suggested link logic */}
              {(() => {
                const matchedJira = jiraTasks.find(jt => jt.title.toLowerCase().includes(task.title.toLowerCase().slice(0, 10)));
                if (matchedJira) {
                  return (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Vínculo sugerido con {matchedJira.external_key}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onTaskClick(matchedJira); }}
                        className="text-[9px] font-black text-white/40 hover:text-blue-400 uppercase tracking-widest transition-colors"
                      >
                        Ver ejecución
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getSourceIcon(type: string) {
  if (type === 'sheet') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
  if (type === 'doc') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function InsightsTab({ items }: { items: any[] }) {
  const getCategoryStyle = (color: string) => {
    switch (color) {
      case 'teal': return { tag: 'bg-teal-500/10 text-teal-600', icon: 'text-teal-500' };
      case 'red':  return { tag: 'bg-red-500/100/10 text-red-600',   icon: 'text-red-500'  };
      default:     return { tag: 'bg-primary/100/10 text-blue-600', icon: 'text-blue-500' };
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-white/60 uppercase tracking-widest">INSIGHTS DEL DÍA</h3>
          <span className="text-xs font-medium px-2 py-1 bg-card/5 rounded-lg text-white/40">{items.length} items</span>
        </div>
        <button className="px-4 py-2 rounded-lg border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Añadir insight
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between pb-3 border-b border-white/20">
        <select className="px-3 py-2 rounded-lg border border-white/30 text-sm text-white/70 bg-card hover:border-primary/40 transition-colors cursor-pointer">
          <option>Filtrar por: Objetivo</option>
        </select>
        <button className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white font-medium transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          Ordenar
        </button>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => {
          // Support both new format (category/description) and old format (título/descripción/tipo)
          const category = item.category || item.tipo || 'INSIGHT';
          const description = item.description || item.descripción || item.título || '';
          const style = getCategoryStyle(item.categoryColor || 'blue');
          return (
            <div key={i} className="bg-card rounded-xl border border-white/20 p-5 flex flex-col gap-3 hover:shadow-sm hover:border-white/40 transition-all">
              {/* Tag categoría */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium self-start ${style.tag}`}>
                {category}
              </span>

              {/* Descripción */}
              <p className="text-sm font-semibold text-white leading-snug flex-1">{description}</p>

              {/* Fuente + acciones */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
                  <span className="text-white/30">{getSourceIcon(item.sourceType)}</span>
                  {item.source}
                </span>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-card/5 text-white/30 hover:text-white/60 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-500/100/10 text-white/30 hover:text-red-500 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Botón convertir a tarea */}
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/30 text-sm font-medium text-white/70 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Convertir a tarea
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricsTab({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {items.map((item, i) => (
        <div key={i} className="bg-card rounded-3xl border border-white/20 p-6 shadow-soft hover:shadow-hard transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest truncate max-w-[120px]">{item.title}</h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
              item.status === "critica" ? "bg-red-500/100/10 text-red-600" : "bg-green-500/10 text-green-600"
            }`}>
              {item.change}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">{item.value}</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-card/5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${item.status === "critica" ? "bg-red-400" : "bg-primary"}`} 
              style={{ width: "65%" }} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsTab({ items }: { items: any[] }) {
  const getPriorityStyle = (priority: string) => {
    if (priority === "critica") return { badge: "bg-red-100 text-red-700", title: "text-red-700", action: "text-red-600" };
    return { badge: "bg-card/8 text-white/50", title: "text-white", action: "text-amber-600" };
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wide">ALERTAS DETECTADAS</h2>
          <span className="text-xs font-semibold px-2 py-0.5 bg-card/6 rounded-md text-white/40">{items.length} items</span>
        </div>
        <button className="px-4 py-2 rounded-lg border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Añadir alerta
        </button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="text-sm border border-white/30 rounded-lg px-3 py-1.5 text-white/60 bg-card focus:outline-none focus:border-primary/40 cursor-pointer">
          <option>Prioridad</option>
          <option>Crítica</option>
          <option>Media</option>
        </select>
        <select className="text-sm border border-white/30 rounded-lg px-3 py-1.5 text-white/60 bg-card focus:outline-none focus:border-primary/40 cursor-pointer">
          <option>Fecha de acción</option>
        </select>
        <select className="text-sm border border-white/30 rounded-lg px-3 py-1.5 text-white/60 bg-card focus:outline-none focus:border-primary/40 cursor-pointer">
          <option>Fecha de registro</option>
        </select>
        <button className="ml-auto flex items-center gap-1.5 text-sm text-white/60 hover:text-white font-medium transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          Ordenar
        </button>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => {
          // Support both new format and old format (título/descripción/nivel)
          const title = item.title || item.título || '';
          const description = item.description || item.descripción || '';
          const priority = item.priority || item.nivel || 'media';
          const style = getPriorityStyle(priority);
          const priorityLabel = priority === 'critica' ? 'CRÍTICA' : priority === 'alta' ? 'ALTA' : 'MEDIA';
          return (
            <div key={i} className="bg-card rounded-xl border border-white/20 p-5 flex flex-col gap-3 hover:shadow-sm hover:border-white/40 transition-all">
              {/* Top row: priority badge + date */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                  {priorityLabel}
                </span>
                <span className="text-xs text-white/35 font-medium">{item.fecha_registro || item.fecha?.split('T')[0] || ''}</span>
              </div>

              {/* Title */}
              <h4 className={`text-sm font-bold leading-snug ${style.title}`}>{title}</h4>

              {/* Description */}
              <p className="text-sm text-white/55 leading-snug flex-1">{description}</p>

              {/* Source */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                <span className="text-white/30">{getSourceIcon(item.sourceType)}</span>
                <span className="text-xs text-white/40 truncate">{item.source}</span>
              </div>

              {/* Acción + Convertir a tarea */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/30">ACCIÓN</span>
                  <span className={`text-xs font-semibold ${style.action}`}>{item.fecha_accion || ''}</span>
                </div>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/30 text-sm font-medium text-white/70 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Convertir a tarea
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */

type TabType = "hoy" | "resumen-del-analisis" | "fuentes" | "feedback" | "tasks" | "insights" | "metrics" | "alerts";

export default function DayTodayPage() {
  const [activeTab, setActiveTab] = useState<TabType>("hoy");
  const [checkedTasks, setCheckedTasks] = useState<number[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [user, setUser] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [structuredTasks, setStructuredTasks] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) setProfiles(data);
  };

  const fetchObjectives = async () => {
    const { data } = await supabase.from("workspace_objectives").select("*");
    if (data) setObjectives(data);
  };

  const loadStructuredTasks = async (wsId: string, wsData?: any) => {
    // Ensure we have objectives for matching
    const { data: currentObjectives } = await supabase.from("workspace_objectives").select("*").eq("workspace_id", wsId);
    const activeObjectives = currentObjectives || [];
    if (activeObjectives.length > 0) setObjectives(activeObjectives);

    const result = await getTasks(wsId);
    let localTasks = result.success ? (result.data || []) : [];

    // Jira sync if config exists
    if (wsData?.jira_config) {
      console.log("Jira config found, syncing hierarchical issues...");
      const jql = 'project = "UTU" AND assignee = "60cd00d4dae5670068abf978"';
      const jiraResult = await fetchJiraIssues(wsData.jira_config, jql);
      
      if (jiraResult.success) {
        // Step 1: Collect all subtask keys to fetch full details
        const subtaskKeys: string[] = [];
        jiraResult.issues.forEach((issue: any) => {
          (issue.fields?.subtasks || []).forEach((st: any) => {
            if (st?.key) subtaskKeys.push(st.key);
          });
        });

        // Step 2: Fetch full details for all subtasks in one batch
        let fullSubtasksMap: Record<string, any> = {};
        if (subtaskKeys.length > 0) {
          console.log(`Fetching full details for ${subtaskKeys.length} subtasks...`);
          const subtasksJql = `key in (${subtaskKeys.join(',')})`;
          const subtasksResult = await fetchJiraIssues(wsData.jira_config, subtasksJql);
          if (subtasksResult.success) {
            subtasksResult.issues.forEach((si: any) => {
              fullSubtasksMap[si.key] = si;
            });
          }
        }

        const jiraTasks = jiraResult.issues.map((issue: any) => {
          const jiraTitle = issue.fields?.summary;
          const jiraTeam = issue.fields?.customfield_10001?.value || 
                          issue.fields?.customfield_10001?.name || 
                          (typeof issue.fields?.customfield_10001 === 'string' ? issue.fields?.customfield_10001 : "");
          
          // Auto-link logic (Advanced Scoring)
          let linkedGoalId = null;
          let matchedTeam = jiraTeam;
          let bestScore = 0;

          if (activeObjectives.length > 0) {
            const normalizedJiraTitle = jiraTitle?.toLowerCase() || "";
            const stopWords = ['para', 'esta', 'con', 'del', 'las', 'los', 'una', 'uno', 'entregar', 'hacer', 'crear'];
            
            for (const obj of activeObjectives) {
              let currentScore = 0;
              const objTitle = obj.title.toLowerCase();
              
              if (normalizedJiraTitle.includes(objTitle) || objTitle.includes(normalizedJiraTitle)) {
                currentScore += 100;
              }

              const objKeywords = objTitle.split(' ').filter((w: string) => w.length > 3 && !stopWords.includes(w));
              const jiraKeywords = normalizedJiraTitle.split(' ').filter((w: string) => w.length > 3 && !stopWords.includes(w));
              
              const matches = objKeywords.filter((kw: string) => jiraKeywords.includes(kw));
              currentScore += (matches.length * 10);

              if (currentScore > bestScore && currentScore > 5) {
                bestScore = currentScore;
                linkedGoalId = obj.id;
                matchedTeam = obj.team || jiraTeam;
              }
            }
          }

          const jiraHistory = (issue.changelog?.histories || []).flatMap((h: any) => 
            h.items.map((item: any) => ({
              id: `${h.id}-${item.field}`,
              type: "history",
              user: h.author?.displayName || "Jira User",
              text: `cambió ${item.field} de "${item.fromString || 'vacío'}" a "${item.toString || 'vacío'}"`,
              timestamp: h.created,
              isJira: true
            }))
          );

          return {
            id: `jira-${issue.id}`,
            workspace_id: wsId,
            title: jiraTitle || "Sin título",
            description: issue.fields?.description || "",
            status: issue.fields?.status?.name || "Sin estado",
            priority: issue.fields?.priority?.name || 'Medium',
            origin: 'jira',
            external_key: issue.key,
            isParent: true,
            assignee: issue.fields?.assignee,
            reporter: issue.fields?.reporter,
            assignee_id: issue.fields?.assignee?.accountId,
            reporter_id: issue.fields?.reporter?.accountId,
            due_date: issue.fields?.duedate ? issue.fields.duedate : null,
            created_at: issue.fields?.created,
            updated_at: issue.fields?.updated,
            subtasks: (issue.fields?.subtasks || []).map((st: any) => {
              // Merge basic subtask with full details if available
              const fullInfo = fullSubtasksMap[st.key];
              return {
                id: st?.id,
                key: st?.key,
                title: fullInfo?.fields?.summary || st?.fields?.summary || "",
                status: fullInfo?.fields?.status?.name || st?.fields?.status?.name || "Todo",
                priority: fullInfo?.fields?.priority?.name || st?.fields?.priority?.name || "Medium",
                assignee_id: fullInfo?.fields?.assignee?.accountId || st?.fields?.assignee?.accountId || "",
                assignee_name: fullInfo?.fields?.assignee?.displayName || st?.fields?.assignee?.displayName || ""
              };
            }),
            labels: issue.fields?.labels || [],
            team: matchedTeam,
            goal_id: linkedGoalId,
            comments: issue.fields?.comment?.comments || [],
            activity: jiraHistory
          };
        });

        setStructuredTasks([...jiraTasks, ...localTasks]);
      } else {
        setStructuredTasks(localTasks);
      }
    } else {
      setStructuredTasks(localTasks);
    }
  };

  const handleReorderTasks = async (newTasks: any[]) => {
    setStructuredTasks(newTasks);
    await reorderTasks(newTasks.map(t => t.id));
  };

  const handleDeleteTaskAction = async (id: string) => {
    const { error } = await supabase.from("task_proposals").delete().eq("id", id);
    if (!error && workspaceId) {
      loadStructuredTasks(workspaceId);
    }
  };
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  // Map a raw DB row to the UI Source shape
  const mapDbSource = (s: any): Source => {
    const isGoogle = s.source_origin === "google";

    const url: string = s.original_url || "";
    let fmt = "DOC";
    if (url.includes("spreadsheets")) fmt = "SHEET";
    else if (url.includes(".pdf")) fmt = "PDF";
    else if (url.includes("docs.google")) fmt = "DOC";
    else if (url.includes("presentation")) fmt = "SLIDE";
    else if (url.includes(".docx")) fmt = "DOCX";

    let label: SourceType = "FUENTE EXTERNA";
    if (isGoogle) {
      if (fmt === "SHEET") label = "DOCUMENTO" as SourceType;
      else if (fmt === "DOC" || fmt === "DOCX") label = "NOTAS DE GEMINI" as SourceType;
      else label = "DOCUMENTO" as SourceType;
    }

    // Enhancement: specific display label for the tag
    const displayTag = isGoogle ? (
      fmt === "SHEET" ? "GOOGLE SHEET" :
      fmt === "PDF" ? "PDF" :
      fmt === "SLIDE" ? "GOOGLE SLIDE" :
      fmt === "DOC" || fmt === "DOCX" ? "GOOGLE DOC" :
      "DOCUMENTO"
    ) : label;

    return {
      id: s.id,
      name: s.title,
      type: label,
      format: fmt,
      time: new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      checked: true,
      url: s.original_url || null,
      isManual: s.source_origin === "manual",
      displayTag: displayTag,
      externalSourceId: s.external_source_id,
      mimeType: s.metadata?.mimeType || null,
      origin: s.source_origin,
      description: s.metadata?.description || "",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    };
  };


  const currentFetchIdRef = useRef(0);

  const fetchData = useCallback(async (forDate: Date) => {
    const fetchId = ++currentFetchIdRef.current;
    
    const y = forDate.getFullYear();
    const m = String(forDate.getMonth() + 1).padStart(2, "0");
    const d = String(forDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    try {
      setLoading(true);
      setIsRetrying(true);
      setIsSyncing(true);
      setSyncError(null);
      
      // Clear data to show fresh loading state
      setSources([]);
      setCalendarEvents([]);

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;

      if (!sessionUser) {
        console.error("No user found");
        return;
      }

      setUser(sessionUser);

      // 1. Get Workspace
      const wsResult = await getOrCreateWorkspace(sessionUser.id, sessionUser.email || "");
      if (!wsResult.success || !wsResult.data) {
        console.error("No workspace found or created:", wsResult.error);
        return;
      }
      const wsId = wsResult.data.id;
      setWorkspaceId(wsId);
      loadStructuredTasks(wsId, wsResult.data);
      fetchProfiles();
      fetchObjectives();

      // Load objectives and profiles for mapping
      const { data: objData } = await supabase
        .from("workspace_objectives")
        .select("id, title")
        .eq("workspace_id", wsId);
      if (objData) setObjectives(objData);
      
      fetchProfiles();

      // 2. Load existing summary
      const y = forDate.getFullYear();
      const m = String(forDate.getMonth() + 1).padStart(2, "0");
      const d = String(forDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const summaryResult = await getDaySummary(wsId, dateStr);
      if (summaryResult.success) {
        setSummaryData(summaryResult.data);
      } else {
        setSummaryData(null);
      }

      // 3. Load DB sources for the selected date only
      const sourcesResult = await getSourcesByDate(wsId, forDate);
      const dbRows = sourcesResult.success && sourcesResult.data ? sourcesResult.data : [];
      
      const dbSources: Source[] = dbRows.map(mapDbSource);
      
      // Filter out noise AND duplicates that might already be in DB
      const noiseWords = ["Comprobante", "Transferencia", "Factura", "Payment"];
      const seenIdsInitial = new Set();
      const seenUrlsInitial = new Set();
      const normalize = (u: string) => u ? u.split("?")[0].replace(/\/$/, "") : "";

      const cleanDbSources = dbSources.filter(s => {
        if (seenIdsInitial.has(s.id)) return false;
        seenIdsInitial.add(s.id);
        
        if (s.url) {
          const norm = normalize(s.url);
          if (seenUrlsInitial.has(norm)) return false;
          seenUrlsInitial.add(norm);
        }

        return !noiseWords.some(w => s.name.toLowerCase().includes(w.toLowerCase()));
      });

      if (fetchId !== currentFetchIdRef.current) return;
      setSources(cleanDbSources);

      // 4. Fetch Calendar Events
      setCalendarLoading(true);
      const calendarResult = await fetchGoogleCalendarEvents(dateStr);
      
      if (fetchId !== currentFetchIdRef.current) return;
      setCalendarLoading(false);
      
      if (calendarResult.success && calendarResult.events) {
        setCalendarEvents(calendarResult.events);
      } else if (!calendarResult.success && calendarResult.error) {
        // If it's a 401/403 or token error, we want the global banner to show
        setSyncError(calendarResult.error);
        console.error("Calendar Sync Error:", calendarResult.error);
      }

      // 5. Auto-sync Drive files for the selected date
      const existingUrls = new Set(dbRows.map((s: any) => s.original_url).filter(Boolean));

      if (fetchId !== currentFetchIdRef.current) return;
      setDriveSyncing(true);
      const driveResult = await fetchGoogleDriveFiles("all", dateStr);
      
      if (fetchId !== currentFetchIdRef.current) return;
      setDriveSyncing(false);

      if (driveResult.success && driveResult.files && driveResult.files.length > 0) {        
        const normalizeUrl = (url: string) => url ? url.split("?")[0].replace(/\/$/, "") : "";
        
        const autoAdded: Source[] = [];
        for (const file of driveResult.files) {
          const fileUrl = normalizeUrl(file.webViewLink);
          const existing = dbRows.find((r: any) => normalizeUrl(r.original_url) === fileUrl);
          
          if (existing) {
            if (existing.source_origin === "manual") {
              await updateSource(existing.id, { source_origin: "google" } as any);
              setSources(prev => prev.map(s => 
                s.id === existing.id ? { ...s, isManual: false, type: "NOTAS DE GEMINI" } : s
              ));
            }
            continue;
          }

          const result = await createSource({
            title: file.name,
            url: file.webViewLink,
            type: file.mimeType.includes("spreadsheet") ? "document" : "meeting",
            workspaceId: wsId,
            createdBy: sessionUser.id,
            origin: "google",
            sourceDate: forDate.toISOString(),
            externalSourceId: file.id,
            metadata: { mimeType: file.mimeType },
          });
          if (result.success && result.data) {
            autoAdded.push(mapDbSource(result.data as any));
          }
        }
        
        if (fetchId !== currentFetchIdRef.current) return;
        
        if (autoAdded.length > 0) {
          setSources((prev) => {
            const combined = [...autoAdded, ...prev];
            const seenIds = new Set();
            const seenUrls = new Set();
            const normalize = (u: string) => u ? u.split("?")[0].replace(/\/$/, "") : "";

            return combined.filter(s => {
              if (seenIds.has(s.id)) return false;
              seenIds.add(s.id);
              if (s.url) {
                const norm = normalize(s.url);
                if (seenUrls.has(norm)) return false;
                seenUrls.add(norm);
              }
              return !noiseWords.some(w => s.name.toLowerCase().includes(w.toLowerCase()));
            });
          });
        }
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else if (!driveResult.success) {
        setSyncError(driveResult.error || "Error al sincronizar con Google Drive");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setSyncError("Error inesperado al cargar datos.");
    } finally {
      if (fetchId === currentFetchIdRef.current) {
        setLoading(false);
        setIsRetrying(false);
        setIsSyncing(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const navigateDate = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      return next;
    });
  }, []);

  const handleDateChange = useCallback((d: Date) => {
    setSelectedDate(d);
  }, []);

  // Re-fetch whenever selected date changes
  useEffect(() => {
    fetchData(selectedDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleAnalyzeDay = async () => {
    if (!workspaceId) return;

    const checkedSources = sources.filter(s => s.checked);
    
    if (checkedSources.length === 0) {
      if (activeTab !== "fuentes") {
        setActiveTab("fuentes");
      }
      setSyncError("Debes seleccionar al menos una fuente para iniciar el análisis inteligente.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setSyncError(null);

      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      // 1. Run the analysis
      const result = await analyzeDay({
        date: dateStr,
        meetings: calendarEvents,
        sources: checkedSources,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // 2. Save result to DB
      await saveDayAnalysis(workspaceId, dateStr, {
        summary: result.summary || "",
        tasks: result.tasks,
        insights: result.insights,
        metrics: result.metrics,
        alerts: result.alerts,
        feedback: result.feedback,
        source_count: checkedSources.length,
      });

      // 3. Refresh summary data from DB to show in UI
      const summaryResult = await getDaySummary(workspaceId, dateStr);
      console.log("Summary result after analysis:", summaryResult);
      if (summaryResult.success) {
        console.log("Setting summaryData:", summaryResult.data);
        setSummaryData(summaryResult.data);
      }
      
      // Navigate to Hoy to see the result
      setActiveTab("hoy");
      
      // Scroll to top to see the summary
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Error analyzing day:", err);
      setSyncError(err.message || "Error al analizar el día");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isFuture = selectedDate > new Date();

  const toggleTask = (id: number) =>
    setCheckedTasks((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleSource = (id: number) =>
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, checked: !s.checked } : s));

  const handleDeleteSource = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const result = await deleteSource(confirmDeleteId);
    if (result.success) {
      setSources((prev) => prev.filter((s) => s.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } else {
      alert("Error al eliminar la fuente: " + result.error);
    }
  };

  const handleRenameSource = async (id: string, currentTitle: string) => {
    const newTitle = prompt("Nuevo nombre de la fuente:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    const result = await updateSource(id, { title: newTitle });
    if (result.success) {
      setSources((prev) => prev.map((s) => s.id === id ? { ...s, name: newTitle } : s));
    } else {
      alert("Error al renombrar la fuente: " + result.error);
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setTaskDrawerOpen(true);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setTaskDrawerOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    // Optimistic refresh
    await fetchData(selectedDate);
    setTaskDrawerOpen(false);
  };

  const filteredSources = sources.filter((s) => {
    const typeOk = typeFilter === "all" || s.type === typeFilter;
    const fmtOk = formatFilter === "all" || s.format === formatFilter;
    return typeOk && fmtOk;
  });

  const checkedCount = sources.filter((s) => s.checked).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userFullName = user?.user_metadata?.full_name || summaryData?.profiles?.full_name || "Usuario";

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-white">Día</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-white/20 rounded-lg text-xs text-white/60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Análisis automático en: <span className="font-semibold text-white">04h 22m</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DayNavigator value={selectedDate} onChange={handleDateChange} />

          <button
            onClick={() => fetchData(selectedDate)}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white/80 border-2 border-white/5 hover:border-primary/30 transition-all bg-card"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isSyncing ? "animate-spin" : ""}>
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.04 6.67 2.87L21 8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            SINCRONIZAR
          </button>

          <button
            onClick={handleAnalyzeDay}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[12px] font-black tracking-widest text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-20 disabled:grayscale disabled:hover:translate-y-0 ${isAnalyzing ? "animate-pulse shadow-primary/50 ring-4 ring-primary/10" : ""}`}
            style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ANALIZANDO...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                </svg>
                ANALIZAR DÍA
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/20 mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: "hoy", label: "Hoy" },
          { id: "fuentes", label: "Fuentes" },
          { id: "resumen-del-analisis", label: "Resumen del Análisis", show: summaryData?.summary_text },
          { id: "tasks", label: "Tareas", count: summaryData?.tasks_count || summaryData?.tasks?.length },
          { id: "insights", label: "Insights", count: summaryData?.insights_count || summaryData?.insights?.length },
          { id: "metrics", label: "Métricas", count: summaryData?.metrics_count || summaryData?.metrics?.length },
          { id: "alerts", label: "Alertas", count: summaryData?.alerts_count || summaryData?.alerts?.length },
          { id: "feedback", label: "Feedback", count: summaryData?.feedback_count || summaryData?.feedback?.length },
        ].filter(t => t.id === "hoy" || t.id === "fuentes" || ("show" in t && t.show) || (t.count && t.count > 0)).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id ? "text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
            {(tab.id === "fuentes" ? sources.length : tab.count) !== undefined && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                activeTab === tab.id ? "bg-primary text-white" : "bg-card/10 text-white/50"
              }`}>
                {tab.id === "fuentes" ? sources.length : tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>
      
      {/* ── SYNC ERROR BANNER (Global) ── */}
      {syncError && (
        <div className="mb-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 mb-0.5">
                {syncError.includes("seleccionar") 
                  ? "Requerimiento de Análisis" 
                  : syncError.includes("API") || syncError.includes("Gemini") || syncError.includes("análisis")
                    ? "Error en Análisis Inteligente"
                    : "Problema de Sincronización"}
              </h4>
              <p className="text-xs text-amber-700/80 font-medium max-w-lg">{syncError}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {syncError.toLowerCase().includes("token") || 
             syncError.toLowerCase().includes("expirado") || 
             syncError.toLowerCase().includes("sesión") || 
             syncError.toLowerCase().includes("auth") || 
             syncError.toLowerCase().includes("401") || 
             syncError.toLowerCase().includes("403") || 
             syncError.toLowerCase().includes("unauthorized") ? (
               <button 
                onClick={() => {
                  console.log("Redirecting to login with force=true");
                  window.location.href = "/auth/login?force=true&reconnect=true";
                }}
                className="px-6 py-2.5 bg-amber-600 text-white text-[11px] font-black tracking-wider rounded-xl hover:bg-amber-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-600/30 uppercase whitespace-nowrap flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                RECONECTAR CUENTA
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <button 
                  onClick={() => fetchData(selectedDate)}
                  disabled={isRetrying}
                  className="px-5 py-2 bg-card text-amber-700 text-[11px] font-black tracking-wider rounded-xl border border-amber-200 hover:bg-amber-500/10 hover:scale-105 active:scale-95 transition-all shadow-sm uppercase flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  {isRetrying && <span className="w-3 h-3 rounded-full border-2 border-amber-600/30 border-t-amber-600 animate-spin" />}
                  {isRetrying ? "REINTENTANDO..." : "REINTENTAR"}
                </button>
                <button 
                  onClick={() => window.location.href = "/auth/login?force=true&reconnect=true"}
                  className="text-[9px] text-amber-600/60 hover:text-amber-600 font-bold underline underline-offset-2 transition-colors uppercase tracking-tighter"
                >
                  ¿Sigue sin funcionar? Forzar reconexión
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setSyncError(null)}
              className="p-2 text-amber-400 hover:text-amber-600 transition-colors"
              title="Cerrar aviso"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: HOY ── */}
      {activeTab === "hoy" && (
        <div className="space-y-6">
          {/* Header & Executive Summary */}
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-black text-white tracking-tight">¡Hola, {userFullName.split(" ")[0]}!</h2>
            <p className="text-sm text-white/40 font-medium italic">
              {isToday ? "Este es tu panorama estratégico para hoy." : `Resumen de actividad para el ${selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.`}
            </p>
          </div>

          {summaryData?.summary_text && (
            <div className="bg-card rounded-[2.5rem] border border-white/10 p-8 shadow-soft relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-black tracking-[0.2em] text-primary uppercase">Resumen de Inteligencia</h3>
                </div>
                <p className="text-lg text-white/80 leading-relaxed font-medium">
                  {summaryData.summary_text}
                </p>
              </div>
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            </div>
          )}

          {!summaryData?.summary_text && (
            <div className="bg-card rounded-3xl border border-dashed border-white/30 p-10 text-center relative overflow-hidden group hover:border-primary/30 transition-all">
              <div className="relative z-10 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-card/5 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Análisis pendiente</h4>
                <p className="text-sm text-white/40 leading-relaxed mb-6">
                  Nexión aún no ha procesado tus fuentes. Selecciona los documentos y notas relevantes en la pestaña de fuentes para generar tu resumen inteligente.
                </p>
                <button 
                  onClick={() => setActiveTab("fuentes")}
                  className="px-6 py-2.5 bg-card/5 text-white/60 text-[11px] font-black tracking-wider rounded-xl hover:bg-primary hover:text-white transition-all uppercase"
                >
                  Ir a Fuentes
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats Grid Removed as per request (Plan de Acción context) */}

          {/* Meetings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Calendario Hoy</span>
                </div>
                {calendarEvents.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {calendarEvents.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {calendarLoading && (
                  <div className="flex items-center gap-2 text-[10px] text-primary font-bold uppercase tracking-widest animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Sincronizando
                  </div>
                )}
                <button 
                  onClick={() => fetchData(selectedDate)}
                  disabled={calendarLoading}
                  className="p-1.5 text-white/20 hover:text-primary transition-colors bg-card border border-white/10 rounded-lg shadow-sm"
                  title="Sincronizar calendario y archivos"
                >
                  <svg 
                    className={`${calendarLoading ? "animate-spin" : ""}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  >
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <polyline points="21 3 21 8 16 8" />
                  </svg>
                </button>
              </div>
            </div>

            {calendarEvents.length === 0 ? (
              <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-dashed border-navy/10 p-10 text-center transition-all hover:bg-card/60">
                <div className="w-16 h-16 rounded-2xl bg-card/5 flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h4 className="text-white/60 font-bold text-sm mb-1">Agenda despejada</h4>
                <p className="text-xs text-white/30">No se encontraron reuniones programadas para este día.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {calendarEvents.map((event) => {
                  const startD = new Date(event.start);
                  const endD = new Date(event.end);
                  const startTime = startD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const endTime = endD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isAllDay = !event.start.includes('T');
                  
                  // Check if meeting is happening now
                  const now = new Date();
                  const isNow = !isAllDay && now >= startD && now <= endD;

                  return (
                    <div key={event.id} className={`group relative bg-card rounded-3xl border p-5 shadow-soft hover:shadow-hard transition-all duration-500 hover:-translate-y-1.5 ${isNow ? 'border-primary/30 ring-4 ring-primary/5' : 'border-white/20'}`}>
                      {isNow && (
                        <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500/100/100 text-white text-[9px] font-black rounded-lg shadow-lg z-10 animate-bounce">
                          EN VIVO
                        </div>
                      )}
                      
                      <div className="flex flex-col h-full relative z-10">
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                            isAllDay 
                              ? 'bg-amber-500/10 text-amber-600 border-amber-100' 
                              : isNow 
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-card/5 text-white/60 border-navy/5'
                          }`}>
                            {isAllDay ? 'TODO EL DÍA' : `${startTime} — ${endTime}`}
                          </div>
                          
                          {event.hangoutLink && (
                            <a 
                              href={event.hangoutLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm group-hover:scale-110 active:scale-90"
                              title="Unirse a la videollamada"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M23 7l-7 5 7 5V7z" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                              </svg>
                            </a>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-white mb-3 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {event.summary || '(Sin título)'}
                        </h4>
                        
                        {(event.location || event.description) && (
                          <div className="mt-auto pt-4 border-t border-navy/5 space-y-2">
                            {event.location && (
                              <p className="text-[11px] text-white/40 truncate flex items-center gap-2 font-medium">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary/40"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                {event.location}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-[11px] text-white/30 line-clamp-1 italic font-medium leading-relaxed">
                                {event.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Background decoration */}
                      <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mb-12 -mr-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Future Tasks Placeholder */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-card/5 flex items-center justify-center text-white/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase">Próximas Tareas</h3>
            </div>
            
            {(structuredTasks.length > 0 || (summaryData?.tasks && summaryData.tasks.length > 0)) ? (
              <div className="space-y-3">
                {/* Structured Tasks (Source of Truth) */}
                {structuredTasks.map((task: any) => (
                  <div key={task.id} className="space-y-2">
                    <div 
                      onClick={() => handleEditTask(task)}
                      className={`bg-card rounded-2xl border-2 p-4 shadow-sm hover:shadow-primary/10 hover:-translate-y-0.5 transition-all flex items-center justify-between group cursor-pointer ${
                        task.origin === 'jira' ? 'border-primary/20 bg-primary/5' : 'border-primary/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          task.origin === 'jira' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'
                        }`}>
                          {task.origin === 'jira' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${task.origin === 'jira' ? 'text-white' : 'text-white/80'}`}>{task.title}</p>
                          {task.goal_id && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-1 h-1 rounded-full bg-primary" />
                              <span className="text-[9px] font-black text-primary uppercase tracking-widest opacity-80">
                                {objectives.find(o => o.id === task.goal_id)?.title || "Objetivo Vinculado"}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            {task.origin === 'jira' ? (
                              <span className="flex items-center gap-1.5 text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-500/20">
                                ESTRATÉGICO · {task.external_key}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Tarea del día (IA)</span>
                            )}
                            {task.due_date && (
                              <span className="text-[9px] font-bold text-primary/60">📅 {new Date(task.due_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black tracking-widest px-2 py-1 rounded-lg uppercase ${
                        task.priority === 'High' || task.priority === 'Highest' ? 'bg-red-500/100/10 text-red-500' : 
                        task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                      }`}>
                        {task.priority || 'Low'}
                      </span>
                    </div>

                    {/* Hierarchy: Subtasks from Jira */}
                    {task.origin === 'jira' && task.subtasks && task.subtasks.length > 0 && (
                      <div className="ml-10 space-y-2 border-l-2 border-primary/10 pl-4 py-2">
                        {task.subtasks.slice(0, 3).map((sub: any) => (
                          <div key={sub.id} className="flex items-center justify-between group py-1">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-all" />
                              <p className="text-xs font-medium text-white/40 group-hover:text-white/70 transition-colors">{sub.title}</p>
                            </div>
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{sub.status}</span>
                          </div>
                        ))}
                        {task.subtasks.length > 3 && (
                          <p className="text-[10px] font-bold text-primary/40 pl-4">+ {task.subtasks.length - 3} actividades más</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* AI Suggestions (Lighter style) */}
                {summaryData?.tasks?.map((task: any, idx: number) => {
                  // Only show if not already promoting to structured (optional logic here)
                  return (
                    <div 
                      key={`suggest-${idx}`} 
                      className="bg-card/50 rounded-2xl border border-dashed border-navy/10 p-4 hover:border-primary/20 hover:bg-card transition-all flex items-center justify-between group cursor-help"
                      title="Sugerencia de IA"
                    >
                      <div className="flex items-center gap-4 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full border border-dashed border-navy/20 flex items-center justify-center text-white/30">
                          {idx + 1}
                        </div>
                        <p className="text-sm font-medium text-white/60">{task.title}</p>
                      </div>
                      <button 
                        onClick={() => handleEditTask({ ...task, isSuggestion: true })}
                        className="text-[9px] font-black tracking-widest px-3 py-1.5 rounded-lg border border-primary/20 text-primary opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition-all"
                      >
                        REVISAR
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-card/40 backdrop-blur-sm rounded-3xl border border-dashed border-navy/5 p-8 text-center">
                <p className="text-xs text-white/20 font-medium italic">Sin tareas programadas para este periodo.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: FUENTES ── */}
      {activeTab === "fuentes" && (
        <div className="space-y-5">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold tracking-widest text-white/50 uppercase">Fuentes del día</span>
              {lastSyncTime && !driveSyncing && (
                <span className="text-[10px] text-white/30 font-medium">
                  Sincronizado: {lastSyncTime}
                </span>
              )}
              {driveSyncing && (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-primary/70">
                  <span className="w-3 h-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin inline-block" />
                  Sincronizando Drive...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(selectedDate)}
                disabled={driveSyncing}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  driveSyncing 
                    ? "bg-card/5 text-white/30 cursor-not-allowed" 
                    : "bg-card border border-white/20 text-white/60 hover:text-primary hover:border-primary/50 shadow-sm"
                }`}
              >
                <svg 
                  className={`${driveSyncing ? "animate-spin" : ""}`}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <polyline points="21 3 21 8 16 8" />
                </svg>
                {driveSyncing ? "Sincronizando..." : "Sincronizar ahora"}
              </button>

              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 border-primary/30 text-primary hover:bg-primary/5 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Añadir fuente
              </button>
            </div>
          </div>


          {/* Filters row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Type filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="appearance-none bg-card border border-white/30 text-sm text-white/70 font-medium rounded-lg pl-3 pr-8 py-2 cursor-pointer hover:border-white/60 focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="all">Tipo de recurso</option>
                  <option value="FUENTE EXTERNA">Fuente Externa</option>
                  <option value="NOTAS DE GEMINI">Notas de Gemini</option>
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>

              {/* Format filter */}
              <div className="relative">
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="appearance-none bg-card border border-white/30 text-sm text-white/70 font-medium rounded-lg pl-3 pr-8 py-2 cursor-pointer hover:border-white/60 focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="all">Formato</option>
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="DOC">DOC</option>
                  <option value="SHEET">SHEET</option>
                  <option value="TXT">TXT</option>
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>

            {/* Sort */}
            <button className="flex items-center gap-2 text-xs font-bold tracking-widest text-white/50 uppercase hover:text-white/70 transition-colors">
              ORDENAR
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="9" y1="18" x2="15" y2="18" />
              </svg>
            </button>
          </div>

          {/* Sources list */}
          <div className="bg-card rounded-xl border border-white/20 shadow-soft divide-y divide-border/10">
            {filteredSources.length === 0 && !driveSyncing && (
              <div className="py-12 text-center text-white/40 text-sm">
                No hay fuentes para hoy todavía.
              </div>
            )}
            {filteredSources.map((source) => (
              <div key={source.id} className="flex items-center gap-4 px-5 py-4 hover:bg-card/50 transition-colors">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSource(source.id as number)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    source.checked ? "border-primary bg-primary" : "border-white/40 hover:border-primary/50"
                  }`}
                >
                  {source.checked && <CheckIcon />}
                </button>

                {/* Icon box */}
                <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                  {source.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-1 truncate">{source.name}</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-md ${typeStyles[source.type]}`}>
                      {source.displayTag || source.type}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/40 font-medium">
                      {source.format}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      {source.time}
                    </span>
                  </div>
                </div>

                {/* Actions: Edit, Delete, Link */}
                <div className="flex items-center gap-1">
                  {source.isManual && (
                    <>
                      <button
                        onClick={() => handleRenameSource(source.id as string, source.name)}
                        className="text-white/20 hover:text-primary transition-colors p-1.5"
                        title="Renombrar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleDeleteSource(source.id as string)}
                        className="text-white/20 hover:text-red-500 transition-colors p-1.5"
                        title="Eliminar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </>
                  )}

                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/20 hover:text-primary transition-colors p-1.5"
                      title="Abrir en Drive"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  )}
                  <button className="text-white/20 hover:text-primary transition-colors p-1.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {filteredSources.length === 0 && (
              <div className="py-12 text-center text-white/40 text-sm">
                No hay fuentes con estos filtros.
              </div>
            )}
          </div>

          {/* Summary and Analyze Action */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-white/40">
              {checkedCount} de {sources.length} fuentes seleccionadas para análisis
            </p>
          </div>
        </div>
      )}

      {/* ── TABS: DYNAMIC CONTENT ── */}

      {activeTab === "resumen-del-analisis" && summaryData && (
        <div className="space-y-6">
          <ResumenDelAnalisisTab data={{
            summary_text: summaryData.summary_text || "Resumen del día basado en las fuentes analizadas.",
            hallazgos_clave: {
              decisiones: [
                "Priorizar la implementación del módulo de fidelización",
                "Acelerar la aprobación del presupuesto Q4",
                "Iniciar diálogos con SteelCore para cierre de alianza"
              ],
              riesgos: [
                "Retrasos en certificación de seguridad pueden afectar timeline de producción",
                "Presupuesto Q4 aún sin confirmar; requiere aprobación directiva",
                "Falta de confirmación en propuesta de diseño móvil"
              ],
              oportunidades: [
                "Expansión de mercado LATAM mediante alianza SteelCore",
                "Mejora de métricas de fidelización con nuevo módulo",
                "Optimización de costos operacionales con nueva estructura presupuestaria"
              ]
            },
            proximos_pasos: [
              {
                id: 1,
                texto: "Completar actualización de certificados SSL del cluster de producción",
                prioridad: "critica"
              },
              {
                id: 2,
                texto: "Revisar y aprobar propuesta de diseño para panel móvil con stakeholders",
                prioridad: "media"
              },
              {
                id: 3,
                texto: "Confirmar términos finales de exclusividad con SteelCore",
                prioridad: "media"
              },
              {
                id: 4,
                texto: "Definir y validar KPIs para módulo de fidelización",
                prioridad: "baja"
              }
            ]
          }} />
        </div>
      )}
      {activeTab === "feedback" && summaryData?.feedback && (
        <FeedbackTab items={summaryData.feedback} />
      )}

      {activeTab === "tasks" && (
        <TasksTab 
          items={[
            ...(structuredTasks || []),
            ...(summaryData?.tasks || [])
          ]} 
          objectives={objectives}
          onTaskClick={handleEditTask}
          onAddTask={handleAddTask}
          onReorder={handleReorderTasks}
          onDelete={handleDeleteTaskAction}
        />
      )}

      {activeTab === "insights" && summaryData?.insights && (
        <InsightsTab items={summaryData.insights} />
      )}

      {activeTab === "metrics" && summaryData?.metrics && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            Métricas de Rendimiento
            <span className="text-xs font-medium px-2 py-1 bg-card/5 rounded-lg text-white/40">{summaryData.metrics.length} items</span>
          </h2>
          <MetricsTab items={summaryData.metrics} />
        </div>
      )}

      {activeTab === "alerts" && summaryData?.alerts && (
        <AlertsTab items={summaryData.alerts} />
      )}

      <AddSourceDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        onAdd={() => {
          setDrawerOpen(false);
          fetchData(selectedDate);
        }}
        sourceDate={selectedDate}
      />

      <TaskDrawer 
        open={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
        task={editingTask}
        workspaceId={workspaceId || ""}
        objectives={objectives}
        profiles={profiles}
        currentUserProfileId={user?.id}
        onSave={() => {
          if (workspaceId) loadStructuredTasks(workspaceId);
          setTaskDrawerOpen(false);
        }}
      />

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Eliminar Fuente"
        message="¿Estás seguro de que deseas eliminar esta fuente? Esta acción no se puede deshacer y el contenido dejará de estar disponible para el análisis."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
