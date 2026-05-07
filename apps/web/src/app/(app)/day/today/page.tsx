"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AddSourceDrawer } from "@/components/sources/AddSourceDrawer";
import { getDaySummary, saveDayAnalysis } from "@/lib/services/summary-service";
import { getSourcesByDate, createSource, deleteSource, deleteSourcesByUrl, updateSource } from "@/lib/services/source-service";
import { getOrCreateWorkspace } from "@/lib/services/workspace-service";
import { fetchGoogleDriveFiles, fetchGoogleFileContent, DriveFile } from "@/lib/services/google-drive-service";
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
  source_origin?: string;
  description?: string;
  metadata?: any;
  source_date?: string;
  created_at?: string;
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

/* ─── Shared Helpers ─────────────────────────────────────────── */

const categorizeItem = (item: any, objectives: any[] = [], jiraTasks: any[] = []) => {
  const context = String(item.team || item.category || "").toLowerCase();
  const title = String(item.title || "").toLowerCase();
  const content = String(item.description || item.content || item.comentario || "").toLowerCase();
  const combinedText = `${context} ${title} ${content}`.toLowerCase();
  
  const linkedGoal = objectives.find(o => o.id === item.goal_id);
  const goalContext = linkedGoal ? `${linkedGoal.title} ${linkedGoal.team}`.toLowerCase() : "";
  
  const linkedJira = jiraTasks.find(j => j.external_key === item.linked_jira_key);
  const jiraContext = linkedJira ? `${linkedJira.title} ${linkedJira.team}`.toLowerCase() : "";
  
  const fullContext = `${combinedText} ${goalContext} ${jiraContext}`;

  if ((fullContext.includes("talent") || fullContext.includes("culture") || fullContext.includes("growth") || 
       fullContext.includes("nom 035") || fullContext.includes("nom-035")) && 
      !fullContext.includes("hiring") && !fullContext.includes("utu") && !fullContext.includes("talent-os")) return 'talent';
  
  if (fullContext.includes("hiring") || fullContext.includes("utu") || fullContext.includes("talent-os") || fullContext.includes("recruit") ||
      fullContext.includes("contratación") || fullContext.includes("reclutamiento")) return 'hiring';
  
  if (fullContext.includes("ux") || fullContext.includes("design") || fullContext.includes("diseño") || fullContext.includes("triada") ||
      fullContext.includes("ux_team")) return 'ux';

  return 'otras';
};

const getResponsable = (item: any): string => {
  return item.responsible || item.assignee_name || item.assignee?.displayName || "Sin asignar";
};

const ResponsableSelector = ({ items, filter, setFilter, forceShow = false }: {
  items: any[];
  filter: string;
  setFilter: (v: string) => void;
  forceShow?: boolean;
}) => {
  const responsables = ["todos", ...Array.from(new Set(items.map(getResponsable).filter(Boolean)))];
  if (responsables.length <= 2 && !forceShow) return null; // Only "todos" + 1 person = don't show (unless forceShow)

  return (
    <div className="flex items-center gap-2">
      <label className="text-[9px] font-black tracking-widest text-white/40 uppercase whitespace-nowrap">Responsable:</label>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-white/80 hover:border-primary/40 hover:bg-white/8 focus:border-primary/60 focus:bg-white/10 focus:outline-none transition-all cursor-pointer appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23ffffff' opacity='0.6' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          paddingRight: '28px'
        }}
      >
        {responsables.map((r) => (
          <option key={r} value={r}>
            {r === "todos" ? "TODOS" : r} ({items.filter(it => getResponsable(it) === r).length})
          </option>
        ))}
      </select>
    </div>
  );
};

/* ─── Components ─────────────────────────────────────────────── */

function FeedbackTab({ items, objectives = [], jiraTasks = [], team, setTeam, responsableFilter, setResponsableFilter }: { items: any[], objectives: any[], jiraTasks: any[], team: string, setTeam: (t: any) => void, responsableFilter: string, setResponsableFilter: (r: string) => void }) {
  const itemsByTeam = items.filter(it => categorizeItem(it, objectives, jiraTasks) === team);
  const filteredItems = responsableFilter === "todos"
    ? itemsByTeam
    : itemsByTeam.filter(it => getResponsable(it) === responsableFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">FEEDBACK Y COMENTARIOS</h3>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {['talent', 'hiring', 'ux', 'otras'].map((t) => (
            <button 
              key={t}
              onClick={() => setTeam(t as any)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                team === t ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t === 'ux' ? 'UX TEAM' : t.toUpperCase()} ({items.filter(it => categorizeItem(it, objectives, jiraTasks) === t).length})
            </button>
          ))}
        </div>
      </div>

      <ResponsableSelector items={itemsByTeam} filter={responsableFilter} setFilter={setResponsableFilter} forceShow={true} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item, i) => {
          const linkedGoal = objectives.find(o => o.id === item.goal_id);
          const linkedJira = jiraTasks.find(j => j.external_key === item.linked_jira_key);
          return (
            <div key={i} className="bg-card rounded-[2rem] border border-white/10 p-6 flex flex-col gap-4 hover:border-primary/40 transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between relative z-10">
                <span className={`text-[9px] font-black tracking-widest px-2.5 py-1 rounded-lg uppercase ${
                  item.type === 'producto' ? 'bg-purple-500/10 text-purple-400' : 
                  item.type === 'laboral' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {item.type || 'COMENTARIO'}
                </span>
                <span className={`text-[9px] font-black tracking-widest px-2 py-1 rounded-lg uppercase ${
                  item.priority === 'critica' ? 'bg-red-500/100/10 text-red-500' : 'text-white/20'
                }`}>
                  {item.priority || 'NORMAL'}
                </span>
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-primary transition-colors relative z-10">{item.title}</h4>
              <p className="text-sm text-white/50 leading-relaxed italic relative z-10">"{item.content}"</p>
              
              {(linkedGoal || linkedJira) && (
                <div className="mt-auto pt-3 border-t border-white/5 relative z-10 space-y-2">
                  {linkedGoal && (
                    <div className="flex items-center gap-2 text-[8px] font-black text-primary/60 uppercase">
                      <div className="w-1 h-1 rounded-full bg-primary" />
                      OBJ: {linkedGoal.title}
                    </div>
                  )}
                  {linkedJira && (
                    <div className="flex items-center gap-2 text-[8px] font-black text-blue-400 uppercase">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-70"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" /></svg>
                      JIRA: {linkedJira.external_key}
                    </div>
                  )}
                </div>
              )}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
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
  onDelete,
  jiraSubTab,
  setJiraSubTab,
  responsableFilter,
  setResponsableFilter
}: {
  items: any[],
  objectives: any[],
  onTaskClick: (task: any) => void,
  onAddTask: () => void,
  onReorder: (newItems: any[]) => void,
  onDelete: (id: string) => void,
  jiraSubTab: 'talent' | 'hiring' | 'ux' | 'otras',
  setJiraSubTab: (tab: 'talent' | 'hiring' | 'ux' | 'otras') => void,
  responsableFilter: string,
  setResponsableFilter: (r: string) => void
}) {


  const jiraTasks = items.filter(it => it.origin === 'jira');
  
  // Flatten AI tasks: include top-level AI tasks AND those nested inside Jira HUs
  const allAiTasks = [
    ...items.filter(it => it.origin !== 'jira'),
    ...jiraTasks.flatMap(jt => jt.linkedAiTasks || [])
  ];

  // Use a safer unique key for deduplication (id or title+origin)
  const aiTasks = Array.from(new Map(allAiTasks.map(t => [t.id || `${t.origin}-${t.title}`, t])).values());

  const tasksByTeam = aiTasks.filter(task => categorizeItem(task, objectives, jiraTasks) === jiraSubTab);
  const currentAiTasks = responsableFilter === "todos"
    ? tasksByTeam
    : tasksByTeam.filter(task => getResponsable(task) === responsableFilter);
  
  const talentCount = aiTasks.filter(t => categorizeItem(t, objectives, jiraTasks) === 'talent').length;
  const hiringCount = aiTasks.filter(t => categorizeItem(t, objectives, jiraTasks) === 'hiring').length;
  const uxCount = aiTasks.filter(t => categorizeItem(t, objectives, jiraTasks) === 'ux').length;
  const otrasCount = aiTasks.filter(t => categorizeItem(t, objectives, jiraTasks) === 'otras').length;

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
      {/* ─── SECTION 1: ANÁLISIS DE FUENTES ─────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg border border-primary/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">TAREAS DEL ANÁLISIS</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Identificadas por Nexión en tus fuentes</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => { setJiraSubTab('talent'); setResponsableFilter("todos"); }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                jiraSubTab === 'talent' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              TALENT ({talentCount})
            </button>
            <button
              onClick={() => { setJiraSubTab('hiring'); setResponsableFilter("todos"); }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                jiraSubTab === 'hiring' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              HIRING ({hiringCount})
            </button>
            <button
              onClick={() => { setJiraSubTab('ux'); setResponsableFilter("todos"); }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                jiraSubTab === 'ux' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              UX TEAM ({uxCount})
            </button>
            <button
              onClick={() => { setJiraSubTab('otras'); setResponsableFilter("todos"); }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                jiraSubTab === 'otras' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              OTRAS ({otrasCount})
            </button>
          </div>
        </div>

        <ResponsableSelector items={tasksByTeam} filter={responsableFilter} setFilter={setResponsableFilter} forceShow={true} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentAiTasks.map((task, i) => {
            const isDone = task.status?.toLowerCase().includes('done') || task.status?.toLowerCase().includes('finalizada');
            const linkedObjective = objectives.find(o => o.id === task.goal_id);
            const parentJiraHU = jiraTasks.find(j => j.external_key === task.linked_jira_key);
            const linkedSubtask = parentJiraHU?.subtasks?.find((s: any) => s.id === task.linked_jira_subtask_id);

            return (
              <div 
                key={task.id || i}
                onClick={() => onTaskClick(task)}
                className={`bg-card rounded-[2.5rem] border p-7 flex flex-col gap-6 hover:border-primary/40 transition-all cursor-pointer group/task relative overflow-hidden ${
                  isDone ? 'border-green-500/20 opacity-60' : 'border-white/10'
                }`}
              >
                {/* Header: Status + Priority */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      isDone ? 'bg-green-500 border-green-500 text-white' : 'border-white/20 group-hover/task:border-primary/50'
                    }`}>
                      {isDone && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${isDone ? 'text-green-500' : 'text-white/40'}`}>
                      {isDone ? 'COMPLETADA' : task.status || 'PENDIENTE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.priority && (
                      <span className={`text-[11px] font-black tracking-widest uppercase ${getPriorityTextColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Body: Title */}
                <div className="space-y-4">
                  <h4 className={`text-lg font-black text-white group-hover/task:text-primary transition-colors leading-tight ${isDone ? 'line-through text-white/40' : ''}`}>
                    {task.title}
                  </h4>

                  {/* Hierarchical Connections */}
                  <div className="grid grid-cols-1 gap-3 pt-4 border-t border-white/5">
                    {/* OBJETIVO & KEY RESULT */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Objetivo Estratégico</span>
                      <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl border ${
                        linkedObjective ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white/5 text-white/20 border-white/5 border-dashed'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${linkedObjective ? 'bg-primary animate-pulse' : 'bg-white/20'}`} />
                        {linkedObjective ? linkedObjective.title : 'Sin objetivo vinculado'}
                      </div>
                      {linkedObjective && (
                        <div className="flex flex-col gap-1 ml-3.5 mt-1">
                           <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Key Result</span>
                           <span className="text-[10px] font-bold text-white/40 italic">
                             {linkedObjective.key_result || "Medir impacto de la iniciativa en Q2"}
                           </span>
                        </div>
                      )}
                    </div>

                    {/* JIRA LINK & SUBTASK */}
                    <div className="flex flex-col gap-1.5 mt-2">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Ejecución en Jira</span>
                      <div className="flex flex-col gap-2">
                        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-xl border ${
                          task.linked_jira_key ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white/5 text-white/20 border-white/5 border-dashed'
                        }`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="opacity-70"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" /></svg>
                          {task.linked_jira_key ? task.linked_jira_key : 'Sin historia de usuario'}
                        </div>
                        {linkedSubtask ? (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-300 uppercase tracking-widest px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10 ml-4">
                            ↳ SUB: {linkedSubtask.title}
                          </div>
                        ) : task.linked_jira_key && (
                          <div className="text-[9px] font-bold text-white/20 italic ml-4">
                            Esperando vinculación a subtarea...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer: Due Date */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Vencimiento:</span>
                      <span className={`text-[11px] font-bold ${task.due_date ? 'text-white/60' : 'text-white/10 italic'}`}>
                        {task.due_date ? `📅 ${new Date(task.due_date).toLocaleDateString()}` : 'Sin fecha asignada'}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover/task:bg-primary/20 group-hover/task:text-primary transition-all">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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


function InsightsTab({ items, objectives = [], jiraTasks = [], team, setTeam, responsableFilter, setResponsableFilter }: { items: any[], objectives: any[], jiraTasks: any[], team: string, setTeam: (t: any) => void, responsableFilter: string, setResponsableFilter: (r: string) => void }) {
  const itemsByTeam = items.filter(it => categorizeItem(it, objectives, jiraTasks) === team);
  const filteredItems = responsableFilter === "todos"
    ? itemsByTeam
    : itemsByTeam.filter(it => getResponsable(it) === responsableFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">INSIGHTS DEL DÍA</h3>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {['talent', 'hiring', 'ux', 'otras'].map((t) => (
            <button 
              key={t}
              onClick={() => setTeam(t as any)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                team === t ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t === 'ux' ? 'UX TEAM' : t.toUpperCase()} ({items.filter(it => categorizeItem(it, objectives, jiraTasks) === t).length})
            </button>
          ))}
        </div>
      </div>

      <ResponsableSelector items={itemsByTeam} filter={responsableFilter} setFilter={setResponsableFilter} forceShow={true} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item, i) => {
          const linkedGoal = objectives.find(o => o.id === item.goal_id);
          const linkedJira = jiraTasks.find(j => j.external_key === item.linked_jira_key);
          return (
            <div key={i} className="bg-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                  {item.category || "INSIGHT"}
                </span>
              </div>
              <p className="text-sm text-white/80 font-medium leading-relaxed">{item.description || item.title}</p>
              
              {(linkedGoal || linkedJira) && (
                <div className="mt-2 pt-3 border-t border-white/5 space-y-2">
                  {linkedGoal && (
                    <div className="flex items-center gap-2 text-[9px] font-bold text-primary/60 uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      OBJ: {linkedGoal.title}
                    </div>
                  )}
                  {linkedJira && (
                    <div className="flex items-center gap-2 text-[9px] font-bold text-blue-400 uppercase">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z"/></svg>
                      JIRA: {linkedJira.external_key}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricsTab({ items, objectives = [], team, setTeam }: { items: any[], objectives: any[], team: string, setTeam: (t: any) => void }) {
  const filteredItems = items.filter(it => categorizeItem(it, objectives) === team);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">KPIs Y MÉTRICAS</h3>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {['talent', 'hiring', 'ux', 'otras'].map((t) => (
            <button 
              key={t}
              onClick={() => setTeam(t as any)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                team === t ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t === 'ux' ? 'UX TEAM' : t.toUpperCase()} ({items.filter(it => categorizeItem(it, objectives) === t).length})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredItems.map((item, i) => {
          const linkedGoal = objectives.find(o => o.id === item.goal_id);
          return (
            <div key={i} className="bg-card rounded-2xl border border-white/10 p-6 flex flex-col gap-4 hover:border-primary/40 transition-all group">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">{item.title}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white group-hover:text-primary transition-colors">{item.value}</span>
                  {item.change && (
                    <span className={`text-[10px] font-bold ${item.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {item.change}
                    </span>
                  )}
                </div>
              </div>
              
              {linkedGoal && (
                <div className="mt-auto pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[8px] font-black text-primary/60 uppercase">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    OBJ: {linkedGoal.title}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertsTab({ items, objectives = [], jiraTasks = [], team, setTeam, responsableFilter, setResponsableFilter }: { items: any[], objectives: any[], jiraTasks: any[], team: string, setTeam: (t: any) => void, responsableFilter: string, setResponsableFilter: (r: string) => void }) {
  const itemsByTeam = items.filter(it => categorizeItem(it, objectives, jiraTasks) === team);
  const filteredItems = responsableFilter === "todos"
    ? itemsByTeam
    : itemsByTeam.filter(it => getResponsable(it) === responsableFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">ALERTAS DETECTADAS</h3>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {['talent', 'hiring', 'ux', 'otras'].map((t) => (
            <button 
              key={t}
              onClick={() => setTeam(t as any)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                team === t ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t === 'ux' ? 'UX TEAM' : t.toUpperCase()} ({items.filter(it => categorizeItem(it, objectives, jiraTasks) === t).length})
            </button>
          ))}
        </div>
      </div>

      <ResponsableSelector items={itemsByTeam} filter={responsableFilter} setFilter={setResponsableFilter} forceShow={true} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item, i) => {
          const linkedGoal = objectives.find(o => o.id === item.goal_id);
          const linkedJira = jiraTasks.find(j => j.external_key === item.linked_jira_key);
          const isCritical = item.priority === 'critica' || item.priority === 'alta';
          
          return (
            <div key={i} className={`bg-card rounded-2xl border p-6 flex flex-col gap-4 hover:shadow-lg transition-all ${
              isCritical ? 'border-red-500/30' : 'border-white/10'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  isCritical ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {item.priority || 'ALERTA'}
                </span>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  {item.fecha_registro || item.fecha?.split('T')[0] || ''}
                </span>
              </div>
              <h4 className="text-base font-bold text-white leading-tight">{item.title}</h4>
              <p className="text-sm text-white/50 leading-relaxed">{item.description}</p>
              
              {(linkedGoal || linkedJira) && (
                <div className="mt-auto pt-3 border-t border-white/5 space-y-2">
                  {linkedGoal && (
                    <div className="flex items-center gap-2 text-[8px] font-black text-primary/60 uppercase">
                      <div className="w-1 h-1 rounded-full bg-primary" />
                      OBJ: {linkedGoal.title}
                    </div>
                  )}
                  {linkedJira && (
                    <div className="flex items-center gap-2 text-[8px] font-black text-blue-400 uppercase">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-70"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" /></svg>
                      JIRA: {linkedJira.external_key}
                    </div>
                  )}
                </div>
              )}
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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [structuredTasks, setStructuredTasks] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [jiraSubTab, setJiraSubTab] = useState<'talent' | 'hiring' | 'ux' | 'otras'>('talent');
  const [responsableFilter, setResponsableFilter] = useState<string>("todos");
  
  // User full name
  const userFullName = user?.user_metadata?.full_name || "Usuario";
  
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

    console.log("[loadStructuredTasks] getTasks result:", {
      success: result.success,
      taskCount: localTasks.length,
      firstTask: localTasks[0] ? {
        id: localTasks[0].id,
        title: localTasks[0].title,
        status: localTasks[0].status,
        proposal_status: localTasks[0].proposal_status,
        due_date: localTasks[0].due_date,
        suggested_date: localTasks[0].suggested_date,
        goal_id: localTasks[0].goal_id,
        metadata: localTasks[0].metadata,
        origin: localTasks[0].origin
      } : null,
      allStatuses: localTasks.map(t => ({ id: t.id, status: t.status, proposal_status: t.proposal_status, suggested_date: t.suggested_date }))
    });

    console.log("[loadStructuredTasks] getTasks result:", {
      success: result.success,
      taskCount: localTasks.length,
      firstTask: localTasks[0] ? {
        id: localTasks[0].id,
        title: localTasks[0].title,
        status: localTasks[0].status,
        proposal_status: localTasks[0].proposal_status,
        due_date: localTasks[0].due_date,
        suggested_date: localTasks[0].suggested_date,
        goal_id: localTasks[0].goal_id,
        metadata: localTasks[0].metadata,
        origin: localTasks[0].origin
      } : null,
      allStatuses: localTasks.map(t => ({ id: t.id, status: t.status, proposal_status: t.proposal_status, suggested_date: t.suggested_date }))
    });

    // Jira sync if config exists
    if (wsData?.jira_config) {
      const jql = 'assignee = "60cd00d4dae5670068abf978" AND statusCategory = "In Progress" AND (project in ("HIRING", "TALENT", "UTU") OR customfield_10001 ~ "Hiring" OR customfield_10001 ~ "Talent")';
      const jiraResult = await fetchJiraIssues(wsData.jira_config, jql);
      
      if (jiraResult.success && jiraResult.issues) {
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
          const subtasksJql = `key in (${subtaskKeys.join(',')})`;
          const subtasksResult = await fetchJiraIssues(wsData.jira_config, subtasksJql);
          if (subtasksResult.success && subtasksResult.issues) {
            subtasksResult.issues.forEach((si: any) => {
              fullSubtasksMap[si.key] = si;
            });
          }
        }

        const jiraTasks = (jiraResult.issues || [])
          .filter((issue: any) => !issue.fields?.issuetype?.subtask)
          .map((issue: any) => {
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

        // Hierarchy linking: Map AI tasks to their Jira parents
        const linkedTasks = localTasks.map(lt => {
          if (lt.linked_jira_key) {
            return { ...lt, isLinkedChild: true };
          }
          return lt;
        });

        const hierarchicalJiraTasks = jiraTasks.map(jt => ({
          ...jt,
          linkedAiTasks: linkedTasks.filter(lt => lt.linked_jira_key === jt.external_key)
        }));

        // In the final list, only show top-level items:
        // 1. Hierarchical Jira HUs (with their AI children inside)
        // 2. Local AI/Manual tasks that ARE NOT linked to any Jira HU
        const finalTasks = [
          ...hierarchicalJiraTasks,
          ...linkedTasks.filter(lt => !lt.isLinkedChild)
        ];

        setStructuredTasks(finalTasks);
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
  
  // Time calculation states (8am-6pm workday)
  const [timeMetrics, setTimeMetrics] = useState<{
    totalWorkdayHours: number;
    meetingHours: number;
    availableHours: number;
    meetingPercentage: number;
    availablePercentage: number;
  }>({
    totalWorkdayHours: 10, // 8am-6pm = 10 hours
    meetingHours: 0,
    availableHours: 10,
    meetingPercentage: 0,
    availablePercentage: 100,
  });
  
  // Alerts state
  const [alerts, setAlerts] = useState<any[]>([]);
  
  // Ref to track auto-analysis triggering
  const autoAnalyzeTriggeredRef = useRef(false);
  // State to track manual analysis (show "Analizando..." message)
  const [manualAnalyzeActive, setManualAnalyzeActive] = useState(false);

  // Parse time from ISO string without timezone conversion
  const parseISOTimeWithTimezone = (isoString: string): { hours: number; minutes: number; isAllDay?: boolean } => {
    // Handle both date-only and datetime formats
    // Date only: "2026-05-01"
    // Datetime: "2026-05-06T09:00:00-05:00" or "2026-05-06T09:00:00Z"
    const timeMatch = isoString.match(/T(\d{2}):(\d{2}):/);
    if (timeMatch) {
      return {
        hours: parseInt(timeMatch[1], 10),
        minutes: parseInt(timeMatch[2], 10)
      };
    }
    // No time portion means all-day event
    return { hours: 0, minutes: 0, isAllDay: true };
  };

  // Calculate time metrics based on calendar events (8am-6pm workday)
  const calculateTimeMetrics = useCallback((events: any[]) => {
    const WORKDAY_START = 8; // 8am
    const WORKDAY_END = 18; // 6pm
    const TOTAL_WORKDAY_HOURS = WORKDAY_END - WORKDAY_START; // 10 hours

    let totalMeetingMinutes = 0;

    events?.forEach((event, idx) => {
      // Events have start/end as direct string properties (not nested objects)
      const startStr = event.start?.dateTime || event.start || "";
      const endStr = event.end?.dateTime || event.end || "";

      // Skip if no start/end
      if (!startStr || !endStr) {
        return;
      }

      // Parse time directly from ISO string
      const startParsed = parseISOTimeWithTimezone(startStr);
      const endParsed = parseISOTimeWithTimezone(endStr);

      // Skip all-day events
      if (!startStr.includes('T') || !endStr.includes('T')) {
        return;
      }

      const eventStartHour = startParsed.hours + startParsed.minutes / 60;
      const eventEndHour = endParsed.hours + endParsed.minutes / 60;

      const meetingStart = Math.max(eventStartHour, WORKDAY_START);
      const meetingEnd = Math.min(eventEndHour, WORKDAY_END);

      if (meetingEnd > meetingStart) {
        const eventMinutes = (meetingEnd - meetingStart) * 60;
        totalMeetingMinutes += eventMinutes;
      }
    });

    const meetingHours = Math.round(totalMeetingMinutes / 60 * 10) / 10;
    const availableHours = Math.round((TOTAL_WORKDAY_HOURS - meetingHours) * 10) / 10;
    const meetingPercentage = Math.round((meetingHours / TOTAL_WORKDAY_HOURS) * 100);
    const availablePercentage = 100 - meetingPercentage;

    return {
      totalWorkdayHours: TOTAL_WORKDAY_HOURS,
      meetingHours,
      availableHours: Math.max(0, availableHours),
      meetingPercentage,
      availablePercentage: Math.max(0, availablePercentage),
    };
  }, []);

  // Fetch alerts for the day
  const fetchAlerts = useCallback(async (wsId: string, dateStr: string) => {
    try {
      // Fetch from task_proposals table where priority is high/critical or status indicates alert
      const { data, error } = await supabase
        .from("task_proposals")
        .select("*")
        .eq("workspace_id", wsId)
        .or("priority.eq.high,priority.eq.high");

      if (!error && data) {
        setAlerts(data.filter(a => a.priority === 'high').slice(0, 5));
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  }, []);

  // Map a raw DB row to the UI Source shape
const mapDbSource = (s: any): Source => {
    const isSlack = s.source_origin === "slack";
    const url: string = s.original_url || "";

    // Detect Google Drive URLs regardless of source_origin (all manual sources have origin="manual")
    const isDriveUrl = url.includes("docs.google.com") || url.includes("drive.google.com");

    let fmt = "DOC";
    if (isSlack) fmt = "SLACK";
    else if (url.includes("spreadsheets")) fmt = "SHEET";
    else if (url.includes("presentation")) fmt = "SLIDE";
    else if (url.includes(".pdf") || (url.includes("drive.google.com/file") && s.title?.endsWith(".pdf"))) fmt = "PDF";
    else if (url.includes("docs.google.com/document") || url.includes(".docx") || url.includes(".md")) fmt = "DOC";

    const isGemini = s.title?.toLowerCase().includes("notas de gemini") || s.title?.toLowerCase().includes("gemini");

    let label: SourceType = "FUENTE EXTERNA";
    if (isSlack) {
      label = "SLACK" as SourceType;
    } else if (isGemini) {
      label = "NOTAS DE GEMINI" as SourceType;
    } else if (isDriveUrl) {
      if (fmt === "SHEET") label = "SHEET" as SourceType;
      else if (fmt === "SLIDE") label = "SLIDE" as SourceType;
      else label = "DOCUMENTO" as SourceType;
    }
    // No Drive URL + no Gemini → "FUENTE EXTERNA" (truly manually typed/linked source)

    const displayTag = isSlack ? "SLACK" : label;

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
      // Preserve date fields for filtering
      source_date: s.source_date,
      created_at: s.created_at,
      // Extract content from metadata for manual sources
      description: s.metadata?.content || s.metadata?.preview || s.metadata?.description || (s.metadata?.messages ? `${s.metadata.messages.length} mensajes` : ""),
      metadata: s.metadata || {},
      icon: isSlack ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#E01E5A">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.521-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.522 2.522v6.312zM15.166 18.956a2.528 2.528 0 0 1 2.522 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.166 17.688a2.527 2.527 0 0 1-2.52-2.52 2.526 2.526 0 0 1 2.52-2.522h6.312A2.527 2.527 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.522h-6.312z"/>
        </svg>
      ) : (
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
      // NOTE: Objetivos removidos de la carga inicial del tab Hoy
      // Se cargan solo si es necesario para otras pestañas

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

      const dbSources: Source[] = dbRows.map((r: any, idx: number) => {
        const mapped = mapDbSource(r);
        return mapped;
      });
      
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
      
      if (fetchId !== currentFetchIdRef.current) {
        return;
      }
      setSources(cleanDbSources);

      // 4. Fetch Calendar Events
      setCalendarLoading(true);
      const calendarResult = await fetchGoogleCalendarEvents(dateStr);

      if (fetchId !== currentFetchIdRef.current) return;
      setCalendarLoading(false);

      if (calendarResult.success && calendarResult.events) {
        setCalendarEvents(calendarResult.events);
        // Calculate time metrics based on meetings
        const metrics = calculateTimeMetrics(calendarResult.events);
        setTimeMetrics(metrics);
      } else if (!calendarResult.success && calendarResult.error) {
        // If it's a 401/403 or token error, we want the global banner to show
        setSyncError(calendarResult.error);
        console.error("Calendar Sync Error:", calendarResult.error);
      }

      // 5. Fetch alerts for the day
      if (wsId) {
        await fetchAlerts(wsId, dateStr);
      }

      // 5. Sync ONLY Gemini notes from Google Drive for today
      if (fetchId !== currentFetchIdRef.current) return;
      setDriveSyncing(true);

      try {
        const driveResult = await fetchGoogleDriveFiles("all", dateStr);

        if (driveResult.success && driveResult.files && driveResult.files.length > 0) {
          // FILTER: Only Gemini notes - title must contain "Notas de Gemini" or "Notes by Gemini" or just "Gemini"
          const geminiNotesOnly = driveResult.files.filter((f: any) => {
            const titleLower = f.name?.toLowerCase() || "";
            const hasGeminiInTitle =
              titleLower.includes("notas de gemini") ||
              titleLower.includes("notes by gemini") ||
              titleLower.includes("gemini notes") ||
              titleLower.includes("notes by gemini") ||
              (titleLower.includes("gemini") && titleLower.includes("note"));
            console.log("[GEMINI SYNC] Checking file:", f.name, "- hasGemini:", hasGeminiInTitle);
            return hasGeminiInTitle;
          });

          if (geminiNotesOnly.length > 0) {
            // Add to sources state
            const geminiSources: Source[] = geminiNotesOnly.map((f: any) => ({
              id: f.id,
              name: f.name,
              type: "NOTAS DE GEMINI" as SourceType,
              format: "DOC",
              time: new Date(f.createdTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              checked: true,
              url: f.webViewLink || null,
              isManual: false,
              displayTag: "NOTAS DE GEMINI",
              externalSourceId: f.id,
              mimeType: f.mimeType || null,
              origin: "google",
              source_date: new Date(f.createdTime).toISOString().split('T')[0],
              created_at: f.createdTime,
              description: f.description || "",
              metadata: { mimeType: f.mimeType, webViewLink: f.webViewLink },
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              ),
            }));

            setSources((prevSources) => {
              // Merge: DB sources + Gemini notes (no duplicates by ID)
              const allIds = new Set(prevSources.map(s => s.id));
              const newGemini = geminiSources.filter(g => !allIds.has(g.id));
              return [...prevSources, ...newGemini];
            });
          }
        }
      } catch (driveError) {
        console.error("[fetchData] Drive sync error:", driveError);
      } finally {
        setDriveSyncing(false);
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
    autoAnalyzeTriggeredRef.current = false;
    fetchData(selectedDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Auto-analyze: triggers when sources change (new sources added) or no summary exists
  // Uses a ref to track previous source count to detect new sources
  const prevSourceCountRef = useRef(0);
  
  useEffect(() => {
    const hasRealSummary = summaryData?.summary_text && summaryData.summary_text.length > 0;
    const hasCheckedSources = sources.some(s => s.checked);
    const currentSourceCount = sources.length;
    
    // Detect new sources added (source count increased)
    const newSourcesAdded = currentSourceCount > prevSourceCountRef.current;
    if (newSourcesAdded) {
      autoAnalyzeTriggeredRef.current = false;
    }
    prevSourceCountRef.current = currentSourceCount;

    // DISABLED: Auto-analyze trigger
    // Trigger if: no summary OR new sources, and has checked sources, and not already analyzing
    // if (
    //   hasCheckedSources &&
    //   !isAnalyzing &&
    //   !autoAnalyzeTriggeredRef.current &&
    //   workspaceId &&
    //   (!hasRealSummary || newSourcesAdded)
    // ) {
    //   autoAnalyzeTriggeredRef.current = true;
    //   handleAnalyzeDay();
    // }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, selectedDate, sources, summaryData]);

  const handleAnalyzeDay = async () => {
    if (!workspaceId) {
      console.error("[AnalyzeDay] No workspaceId");
      return;
    }

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
      // 1. Fetch contents for all checked sources to provide context to Gemini
      setIsAnalyzing(true);
      const sourcesWithContent = await Promise.all(checkedSources.map(async (s) => {
        let content = "";

        if ((s.origin === 'google' || s.source_origin === 'google') && s.externalSourceId) {
          // Fetch from Google Drive
          const driveContent = await fetchGoogleFileContent(s.externalSourceId as string, s.mimeType as string);
          content = driveContent || "";
        } else if (s.description && s.description.length > 0) {
          // ANY source with description field (manual notes, Slack messages, etc.)
          content = s.description;
        } else if (s.metadata?.content) {
          // Fallback to metadata.content
          content = s.metadata.content;
        }
        
        return {
          id: s.id,
          name: s.name,
          type: s.type,
          format: s.format,
          content: content
        };
      }));
      const withContent = sourcesWithContent.filter(s => s.content && s.content.length > 0);

      // 1. Run the analysis with full content and user context
      // Compute userName directly from user state to avoid initialization issues
      const currentUserName = user?.user_metadata?.full_name || summaryData?.profiles?.full_name || "Usuario";

      console.log("[ANALYZE DAY] Sources to analyze:", sourcesWithContent.length, sourcesWithContent.map(s => ({ name: s.name, type: s.type, hasContent: !!s.content })));

      const result = await analyzeDay({
        date: dateStr,
        meetings: calendarEvents,
        sources: sourcesWithContent,
        userName: currentUserName,
        objectives: objectives,
        jiraContext: structuredTasks.filter(t => t.origin === 'jira').map(jt => ({
          key: jt.external_key,
          title: jt.title,
          subtasks: jt.subtasks?.map((st: any) => ({ id: st.id, title: st.title }))
        }))
      });

      console.log("[ANALYZE DAY] Gemini response:", { success: result.success, tasksCount: result.tasks?.length, insightsCount: result.insights?.length });
      if (result.tasks && result.tasks.length > 0) {
        console.log("[ANALYZE DAY] First task sample:", result.tasks[0]);
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      // 2. Save result to DB
      console.log("[ANALYZE DAY] Saving to DB - tasks:", result.tasks?.length);
      await saveDayAnalysis(workspaceId, dateStr, {
        summary: result.summary || "",
        tasks: result.tasks,
        insights: result.insights,
        metrics: result.metrics,
        alerts: result.alerts,
        feedback: result.feedback,
        source_count: checkedSources.length,
      });

      console.log("[ANALYZE DAY] Saved to DB successfully");

      // 3. Refresh summary data from DB to show in UI
      const summaryResult = await getDaySummary(workspaceId, dateStr);
      console.log("[ANALYZE DAY] Retrieved from DB:", { tasksCount: summaryResult.data?.tasks?.length });
      if (summaryResult.success) {
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
      setManualAnalyzeActive(false);
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
    const sourceToDelete = sources.find((s) => s.id === confirmDeleteId);
    let result: { success: boolean; error?: string };

    if (sourceToDelete?.url && workspaceId) {
      // Delete all duplicates with the same URL (n8n creates many copies)
      result = await deleteSourcesByUrl(workspaceId, sourceToDelete.url);
      if (result.success) {
        const normalizedUrl = sourceToDelete.url.split("?")[0].replace(/\/$/, "");
        setSources((prev) => prev.filter((s) => !s.url?.startsWith(normalizedUrl)));
      }
    } else {
      result = await deleteSource(confirmDeleteId);
      if (result.success) {
        setSources((prev) => prev.filter((s) => s.id !== confirmDeleteId));
      }
    }

    if (result.success) {
      setConfirmDeleteId(null);
    } else {
      alert("Error al eliminar la fuente: " + result.error);
    }
  };

  const handleRenameSource = async (id: string, currentTitle: string) => {
    const newTitle = prompt("Nuevo nombre de la fuente:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    const result = await updateSource({ id, title: newTitle });
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
    // If user selected specific filters, apply them
    if (typeFilter !== "all" || formatFilter !== "all") {
      // Apply type filter
      if (typeFilter !== "all") {
        if (typeFilter === "FUENTE EXTERNA" && (s.origin !== "google" && s.origin !== "slack")) return false;
        if (typeFilter === "NOTAS DE GEMINI" && s.type !== "NOTAS DE GEMINI") return false;
      }

      // Apply format filter
      if (formatFilter !== "all") {
        const fileType = s.format?.toUpperCase() || s.name?.split(".").pop()?.toUpperCase() || "";
        if (fileType !== formatFilter) return false;
      }

      return true;
    }

    // Default: show only Notas de Gemini + Fuentes Externas (manually added only)
    // Fuentes externas include: Slack, Google Drive (DOCUMENTO/SHEET/SLIDE), and manually added external URLs
    const isGeminiNote = s.type === "NOTAS DE GEMINI";

    // For external sources: exclude auto-synced from Drive, only show manually linked
    const isAutoSynced = s.externalSourceId;
    const isManuallyAdded = !s.externalSourceId;

    const isExternalSource = (s.type === "FUENTE EXTERNA" || s.type === "DOCUMENTO") && isManuallyAdded;

    return isGeminiNote || isExternalSource;
  });

  const checkedCount = filteredSources.filter((s) => s.checked).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            onClick={() => { setManualAnalyzeActive(true); handleAnalyzeDay(); }}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[12px] font-black tracking-widest text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-20 disabled:cursor-not-allowed ${isAnalyzing ? "animate-pulse ring-4 ring-primary/10" : ""}`}
            style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ANALIZANDO...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
            {(tab.id === "fuentes" ? filteredSources.length : tab.count) !== undefined && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                activeTab === tab.id ? "bg-primary text-white" : "bg-card/10 text-white/50"
              }`}>
                {tab.id === "fuentes" ? filteredSources.length : tab.count}
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

          {!summaryData?.summary_text && isAnalyzing && (
            <div className="bg-card/40 backdrop-blur-sm rounded-3xl border border-dashed border-primary/20 p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-6">
                <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <polyline points="21 3 21 8 16 8" />
                </svg>
              </div>
              <p className="text-sm text-white/40 font-medium">Analizando tu día con IA...</p>
              <p className="text-xs text-white/20 mt-1">Esto puede tardar unos segundos.</p>
            </div>
          )}

          {!summaryData?.summary_text && isAnalyzing && manualAnalyzeActive && (
            <div className="bg-card/40 backdrop-blur-sm rounded-3xl border border-dashed border-primary/20 p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-6">
                <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <polyline points="21 3 21 8 16 8" />
                </svg>
              </div>
              <p className="text-sm text-white/40 font-medium">Analizando tu día con IA...</p>
              <p className="text-xs text-white/20 mt-1">Esto puede tardar unos segundos.</p>
            </div>
          )}

          {/* Productivity Card - Time Metrics */}
          <div className="bg-card rounded-[2.5rem] border border-white/10 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Mi Día</h3>
                  <p className="text-[10px] text-white/40 font-medium">Jornada: 8:00 AM - 6:00 PM</p>
                </div>
              </div>
              <button 
                onClick={() => fetchData(selectedDate)}
                disabled={loading}
                className="p-2 text-white/30 hover:text-primary transition-colors bg-card/5 rounded-lg border border-white/10 hover:border-primary/30"
                title="Actualizar datos"
              >
                <svg 
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <polyline points="21 3 21 8 16 8" />
                </svg>
              </button>
            </div>

            {/* Time Progress Bar */}
            <div className="space-y-4">
              <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-700"
                  style={{ width: `${timeMetrics.meetingPercentage}%` }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-white font-mono">{timeMetrics.totalWorkdayHours}h</p>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">Jornada</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-red-400 font-mono">{timeMetrics.meetingHours}h</p>
                  <p className="text-[9px] font-bold text-red-400/60 uppercase tracking-widest mt-1">Reuniones</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-green-400 font-mono">{timeMetrics.availableHours}h</p>
                  <p className="text-[9px] font-bold text-green-400/60 uppercase tracking-widest mt-1">Disponible</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <span className="text-[10px] font-bold text-white/40">
                  {timeMetrics.meetingPercentage}% en reuniones · {timeMetrics.availablePercentage}% para trabajo
                </span>
                {timeMetrics.meetingHours === 0 && (
                  <span className="text-[9px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                    ✓ Día libre de reuniones
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center animate-pulse">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h3 className="text-[11px] font-black tracking-[0.2em] text-red-400 uppercase">Alertas Importantes</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  {alerts.length}
                </span>
              </div>
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="bg-card border border-red-500/20 rounded-xl p-4 flex items-start gap-3 hover:border-red-500/40 transition-all">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0 animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs text-white/50 mt-1">{alert.description}</p>
                      )}
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${
                      alert.priority === 'Highest' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                    }`}>
                      {alert.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}



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

          {/* Today's Tasks - Real pending tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="text-[11px] font-bold tracking-[0.2em] text-white/60 uppercase">
                  Tareas Pendientes {isToday ? "Hoy" : selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).replace(/^\w/, c => c.toUpperCase())}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {structuredTasks.filter(t => {
                    const isDone = t.status?.toLowerCase().includes('done') || t.status?.toLowerCase().includes('finalizada');
                    const isDueToday = t.due_date && new Date(t.due_date).toDateString() === selectedDate.toDateString();
                    const isInProgress = t.status?.toLowerCase().includes('progress') || t.status?.toLowerCase().includes('curso');
                    return !isDone && (isDueToday || isInProgress);
                  }).length}
                </span>
              </div>

              <button
                onClick={() => setTaskDrawerOpen(true)}
                className="px-4 py-1.5 bg-card border border-white/20 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all flex items-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                AÑADIR
              </button>
            </div>

            {/* Team filters */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 w-fit">
              <button
                onClick={() => { setJiraSubTab('talent'); setResponsableFilter("todos"); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  jiraSubTab === 'talent' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
                }`}
              >
                TALENT
              </button>
              <button
                onClick={() => { setJiraSubTab('hiring'); setResponsableFilter("todos"); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  jiraSubTab === 'hiring' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
                }`}
              >
                HIRING
              </button>
              <button
                onClick={() => { setJiraSubTab('ux'); setResponsableFilter("todos"); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  jiraSubTab === 'ux' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
                }`}
              >
                UX TEAM
              </button>
              <button
                onClick={() => { setJiraSubTab('otras'); setResponsableFilter("todos"); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  jiraSubTab === 'otras' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'
                }`}
              >
                OTRAS
              </button>
            </div>

            {(() => {
              const today = new Date();
              today.setHours(0,0,0,0);

              console.log("[TAREAS HOY] structuredTasks loaded:", structuredTasks.length, "tasks");
              if (structuredTasks.length > 0) {
                console.log("[TAREAS HOY] Sample task:", {
                  title: structuredTasks[0].title,
                  status: structuredTasks[0].status,
                  goal_id: structuredTasks[0].goal_id,
                  metadata: structuredTasks[0].metadata,
                  origin: structuredTasks[0].origin
                });
              }

              const pendingTasksByStatus = structuredTasks.filter((task: any) => {
                // EXCLUDE OBJECTIVES - they should not appear in "Tareas Pendientes"
                // Objectives either start with "Objetivo:" or have a goal_id set
                const isObjective = task.title?.toLowerCase().startsWith('objetivo:') || task.goal_id;
                if (isObjective) {
                  console.log("[TAREAS HOY] Excluding objective:", task.title);
                  return false;
                }

                const isDone = task.status?.toLowerCase().includes('done') || task.status?.toLowerCase().includes('finalizada');
                if (isDone) {
                  console.log("[TAREAS HOY] Task is done:", task.title);
                  return false;
                }

                // Show all pending/in-progress tasks, not just those due today
                const isPending = task.status?.toLowerCase().includes('pend') || task.status?.toLowerCase().includes('pendiente') || task.status?.toLowerCase().includes('todo') || task.status?.toLowerCase().includes('pending_review');
                const isInProgress = task.status?.toLowerCase().includes('progress') || task.status?.toLowerCase().includes('curso');
                const isDueToday = task.due_date && new Date(task.due_date).toDateString() === selectedDate.toDateString();
                const isOverdue = task.due_date && new Date(task.due_date) < today && !isDone;

                const passes = isPending || isInProgress || isDueToday || isOverdue;
                if (passes) {
                  console.log("[TAREAS HOY] Task passed status filter:", task.title, { isPending, isInProgress, isDueToday, isOverdue, status: task.status });
                }
                return passes;
              });

              console.log("[TAREAS HOY] After status filter:", pendingTasksByStatus.length, "tasks");

              const tasksByTeam = pendingTasksByStatus.filter((task: any) => {
                const category = categorizeItem(task, objectives, structuredTasks.filter((t: any) => t.origin === 'jira'));
                const matches = category === jiraSubTab;
                console.log("[TAREAS HOY] Task team filter:", task.title, { category, jiraSubTab, matches });
                return matches;
              });

              console.log("[TAREAS HOY] After team filter:", tasksByTeam.length, "tasks, looking for team:", jiraSubTab);

              const pendingTasks = responsableFilter === "todos"
                ? tasksByTeam
                : tasksByTeam.filter((task: any) => getResponsable(task) === responsableFilter);

              console.log("[TAREAS HOY] Final tasks:", pendingTasks.length, "with responsable filter:", responsableFilter);

              if (pendingTasks.length === 0) {
                return (
                  <div>
                    <ResponsableSelector items={tasksByTeam} filter={responsableFilter} setFilter={setResponsableFilter} />
                    <div className="bg-card/40 backdrop-blur-sm rounded-3xl border border-dashed border-white/10 p-8 text-center mt-4">
                      <div className="w-12 h-12 rounded-2xl bg-green-500/5 flex items-center justify-center mx-auto mb-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </div>
                      <p className="text-sm text-white/40 font-medium">¡Sin tareas pendientes para hoy!</p>
                      <p className="text-xs text-white/20 mt-1">Aprovecha tu tiempo disponible para avanzar en proyectos largos.</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <ResponsableSelector items={tasksByTeam} filter={responsableFilter} setFilter={setResponsableFilter} />
                  <div className="space-y-2">
                    {pendingTasks.slice(0, 8).map((task: any) => {
                      const isOverdue = task.due_date && new Date(task.due_date) < today && !(task.status?.toLowerCase().includes('done'));
                      const isDueToday = task.due_date && new Date(task.due_date).toDateString() === selectedDate.toDateString();

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleEditTask(task)}
                          className={`bg-card rounded-2xl border p-4 hover:border-primary/30 transition-all cursor-pointer group ${
                            isOverdue ? 'border-red-500/30 bg-red-500/5' : 'border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              task.origin === 'jira' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/10 text-primary'
                            }`}>
                              {task.origin === 'jira' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" />
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${isOverdue ? 'text-red-400' : 'text-white'}`}>{task.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {task.origin === 'jira' && (
                                  <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest">
                                    {task.external_key}
                                  </span>
                                )}
                                {task.due_date && (
                                  <span className={`text-[9px] font-medium ${isOverdue ? 'text-red-400' : isDueToday ? 'text-amber-400' : 'text-white/30'}`}>
                                    📅 {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                              task.priority === 'High' || task.priority === 'Highest' ? 'bg-red-500/10 text-red-500' : 
                              task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-white/20'
                            }`}>
                              {task.priority || 'Low'}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                              task.status?.toLowerCase().includes('progress') ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-white/20'
                            }`}>
                              {task.status || 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {pendingTasks.length > 8 && (
                    <p className="text-center text-xs text-white/30 font-medium pt-2">
                      +{pendingTasks.length - 8} tareas más...
                    </p>
                  )}
                  </div>
                </div>
                );
            })()}
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
              {checkedCount} de {filteredSources.length} fuentes seleccionadas para análisis
            </p>
          </div>
        </div>
      )}

      {/* ── TABS: DYNAMIC CONTENT ── */}

      {activeTab === "resumen-del-analisis" && summaryData && (
        <div className="space-y-6">
          <ResumenDelAnalisisTab data={summaryData} objectives={objectives} />
        </div>
      )}
      {activeTab === "feedback" && summaryData?.feedback && (
        <FeedbackTab
          items={summaryData.feedback}
          objectives={objectives}
          jiraTasks={structuredTasks.filter((it: any) => it.origin === 'jira')}
          team={jiraSubTab}
          setTeam={(t) => { setJiraSubTab(t); setResponsableFilter("todos"); }}
          responsableFilter={responsableFilter}
          setResponsableFilter={setResponsableFilter}
        />
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
          jiraSubTab={jiraSubTab}
          setJiraSubTab={(t) => { setJiraSubTab(t); setResponsableFilter("todos"); }}
          responsableFilter={responsableFilter}
          setResponsableFilter={setResponsableFilter}
        />
      )}

      {activeTab === "insights" && summaryData?.insights && (
        <InsightsTab
          items={summaryData.insights}
          objectives={objectives}
          jiraTasks={structuredTasks.filter((it: any) => it.origin === 'jira')}
          team={jiraSubTab}
          setTeam={(t) => { setJiraSubTab(t); setResponsableFilter("todos"); }}
          responsableFilter={responsableFilter}
          setResponsableFilter={setResponsableFilter}
        />
      )}

      {activeTab === "metrics" && summaryData?.metrics && (
        <MetricsTab 
          items={summaryData.metrics} 
          objectives={objectives}
          team={jiraSubTab}
          setTeam={setJiraSubTab}
        />
      )}

      {activeTab === "alerts" && summaryData?.alerts && (
        <AlertsTab
          items={summaryData.alerts}
          objectives={objectives}
          jiraTasks={structuredTasks.filter((it: any) => it.origin === 'jira')}
          team={jiraSubTab}
          setTeam={(t) => { setJiraSubTab(t); setResponsableFilter("todos"); }}
          responsableFilter={responsableFilter}
          setResponsableFilter={setResponsableFilter}
        />
      )}

      <AddSourceDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        onAdd={(newSource) => {
          setDrawerOpen(false);
          // Reset auto-analyze flag and refresh data
          autoAnalyzeTriggeredRef.current = false;
          // Force immediate refresh
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
        jiraTasks={structuredTasks.filter(t => t.origin === 'jira')}
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
