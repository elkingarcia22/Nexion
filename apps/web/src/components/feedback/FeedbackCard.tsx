'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { getItemStates, setItemState } from '@/lib/services/item-state-service';
import { LinkedItemSubDrawer } from '@/components/ui/LinkedItemSubDrawer';

interface FeedbackCardProps {
  item: any;
  workspaceId?: string;
}

const typeConfig: Record<string, { label: string; text: string; bg: string }> = {
  producto: { label: 'Producto', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  laboral: { label: 'Laboral', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  personal: { label: 'Personal', text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
};

const CalendarIconSm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UserIconSm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

function FeedbackDrawer({
  item,
  onClose,
  onApply,
  onConvertToTask,
  applied,
  converted,
}: {
  item: any;
  onClose: () => void;
  onApply: () => void;
  onConvertToTask: () => void;
  applied: boolean;
  converted: boolean;
}) {
  const [relatedTasks, setRelatedTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [linkedItem, setLinkedItem] = useState<{ type: 'objective' | 'jira'; data: any } | null>(null);

  const type = (() => {
    const t = (item.type || '').toLowerCase();
    if (t === 'producto' || t === 'laboral' || t === 'personal') return t;
    return 'producto';
  })();
  const tCfg = typeConfig[type] || typeConfig.producto;

  const team = item.category
    ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
    : 'Otras';

  useEffect(() => {
    const loadRelated = async () => {
      setLoadingTasks(true);
      try {
        const feedbackId = String(item.id);
        const { data } = await supabase
          .from('task_proposals')
          .select('id, title, status, priority, goal_id')
          .filter('metadata->>linked_feedback', 'eq', feedbackId)
          .limit(10);
        setRelatedTasks(data || []);
      } catch {
        setRelatedTasks([]);
      } finally {
        setLoadingTasks(false);
      }
    };
    loadRelated();
  }, [item.id]);

  const handleOpenObjective = async () => {
    try {
      const { data } = await supabase.from('workspace_objectives').select('*').eq('id', item.goal_id).single();
      setLinkedItem({ type: 'objective', data });
    } catch {
      setLinkedItem({ type: 'objective', data: { title: 'Objetivo no encontrado', id: item.goal_id } });
    }
  };

  const handleOpenJira = () => {
    setLinkedItem({ type: 'jira', data: { title: item.linked_jira_key, description: 'Tarea vinculada de Jira', key: item.linked_jira_key } });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#0A0C14] shadow-2xl border-l border-white/5 animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161927]/50">
          <div className="flex items-center gap-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Feedback</span>
            {applied && (
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Aplicado
              </span>
            )}
            {converted && (
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border bg-blue-500/10 text-blue-400 border-blue-500/20">
                Convertido a Tarea
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title + Type */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${tCfg.bg} ${tCfg.text}`}>
                {tCfg.label}
              </span>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border border-white/5 bg-white/[0.03] text-white/50">
                {team}
              </span>
            </div>
            <h2 className="text-xl font-black text-white leading-snug">{item.title}</h2>
          </div>

          {/* Content */}
          {item.content && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Contenido</span>
              <p className="text-sm text-white/70 leading-relaxed">{item.content}</p>
            </div>
          )}

          {/* Date */}
          {item.summary_date && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <CalendarIconSm />
              <span>{new Date(item.summary_date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            {item.responsible && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Responsable</span>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <UserIconSm />
                  <span>{item.responsible}</span>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Equipo</span>
              <p className="text-sm text-white/80">{team}</p>
            </div>
            {item.product && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Producto</span>
                <p className="text-sm text-white/80">{item.product}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Tipo</span>
              <p className={`text-sm font-semibold ${tCfg.text}`}>{tCfg.label}</p>
            </div>
          </div>

          {/* Linked Objective */}
          {item.goal_id && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Objetivo Vinculado</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenObjective(); }}
                className="w-full flex items-center gap-2 px-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl hover:border-emerald-500/30 hover:bg-[#161927]/70 transition-all text-left"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                </svg>
                <span className="text-sm text-white/80 truncate">{item.goal_id}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-white/20 flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* Linked Jira */}
          {item.linked_jira_key && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Jira Vinculado</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenJira(); }}
                className="w-full flex items-center gap-2 px-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl hover:border-blue-500/30 hover:bg-[#161927]/70 transition-all text-left"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400 flex-shrink-0">
                  <path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z"/>
                </svg>
                <span className="text-sm text-white/80 truncate">{item.linked_jira_key}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-white/20 flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* Related Tasks */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Tareas Relacionadas</span>
            {loadingTasks ? (
              <p className="text-xs text-white/40">Cargando tareas...</p>
            ) : relatedTasks.length === 0 ? (
              <p className="text-xs text-white/30 italic">Sin tareas vinculadas</p>
            ) : (
              <div className="space-y-2">
                {relatedTasks.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl">
                    <span className="text-sm font-medium text-white truncate flex-1">{t.title}</span>
                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border ${
                      t.status === 'done' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      t.status === 'in_progress' || t.status === 'review' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {t.status || 'pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            {applied ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                <span className="text-sm text-emerald-400 font-semibold">Feedback aplicado</span>
              </div>
            ) : converted ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>
                <span className="text-sm text-blue-400 font-semibold">Convertido a tarea</span>
              </div>
            ) : (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onApply(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  Marcar como Aplicado
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onConvertToTask(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>
                  Convertir a Tarea
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {linkedItem && (
        <LinkedItemSubDrawer
          type={linkedItem.type}
          data={linkedItem.data}
          onClose={() => setLinkedItem(null)}
        />
      )}
    </div>,
    document.body
  );
}

export function FeedbackCard({ item, workspaceId }: FeedbackCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const [converted, setConverted] = useState(false);

  const type = (() => {
    const t = (item.type || '').toLowerCase();
    if (t === 'producto' || t === 'laboral' || t === 'personal') return t;
    return 'producto';
  })();
  const tCfg = typeConfig[type] || typeConfig.producto;

  const team = item.category
    ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
    : 'Otras';

  const isDone = applied || converted;

  useEffect(() => {
    if (!workspaceId) return;
    getItemStates(workspaceId, 'feedback').then(states => {
      const s = states[item.id];
      if (s === 'applied') setApplied(true);
      if (s === 'converted_to_task') setConverted(true);
    });
  }, [workspaceId, item.id]);

  const handleApply = async () => {
    if (workspaceId) {
      await setItemState(workspaceId, 'feedback', String(item.id), 'applied');
    }
    setApplied(true);
    setDrawerOpen(false);
  };

  const handleConvert = async () => {
    if (workspaceId) {
      await setItemState(workspaceId, 'feedback', String(item.id), 'converted_to_task');
    }
    setConverted(true);
    setDrawerOpen(false);
  };

  return (
    <>
      <div
        className={`bg-[#161927]/50 border border-white/5 rounded-2xl transition-all hover:border-white/10 hover:bg-[#161927]/70 cursor-pointer ${isDone ? 'opacity-40' : ''}`}
        onClick={() => setDrawerOpen(true)}
      >
        <div className="flex items-center gap-3 px-5 py-3.5">
          <span className={`flex-shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${tCfg.bg} ${tCfg.text}`}>
            {tCfg.label}
          </span>

          <span className={`flex-1 text-sm font-semibold min-w-0 truncate ${isDone ? 'text-white/40 line-through' : 'text-white'}`}>
            {item.title}
          </span>

          {applied && (
            <span className="flex-shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Aplicado
            </span>
          )}
          {converted && (
            <span className="flex-shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border bg-blue-500/10 text-blue-400 border-blue-500/20">
              Tarea
            </span>
          )}

          <span className="flex-shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border border-white/5 bg-white/[0.03] text-white/50">
            {team}
          </span>

          {item.summary_date && (
            <span className="flex-shrink-0 flex items-center gap-1.5 text-[11px] text-white/50">
              <CalendarIconSm />
              <span>{new Date(item.summary_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>
            </span>
          )}

          {item.responsible && (
            <div className="flex-shrink-0 flex items-center gap-1.5 text-[11px] text-white/50 min-w-0 max-w-[140px]">
              <UserIconSm />
              <span className="truncate">{item.responsible}</span>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <FeedbackDrawer
          item={item}
          onClose={() => setDrawerOpen(false)}
          onApply={handleApply}
          onConvertToTask={handleConvert}
          applied={applied}
          converted={converted}
        />
      )}
    </>
  );
}
