'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ObjectiveDetailDrawer } from '@/components/ui/ObjectiveDetailDrawer';

type LinkedItemType = 'objective' | 'jira' | 'alert' | 'metric' | 'insight' | 'feedback';

interface LinkedItemData {
  title: string;
  description?: string;
  [key: string]: any;
}

interface TaskCardProps {
  task: any;
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
  onComplete: (task: any) => void;
  linkedItems?: Partial<Record<LinkedItemType, LinkedItemData>>;
}

/* ─── Icons ─────────────────────────────────────────────────── */

const RadioEmpty = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 group-hover/task:text-primary/40 transition-colors">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const RadioChecked = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2">
    <circle cx="12" cy="12" r="10" fill="#10b981" stroke="#10b981" />
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TargetIcon = ({ className = "text-emerald-400" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const JiraIcon = ({ className = "text-blue-400" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z"/>
  </svg>
);

const AlertCircleIcon = ({ className = "text-rose-400" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const MetricIcon = ({ className = "text-purple-400" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
  </svg>
);

const InsightIcon = ({ className = "text-amber-400" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

const FeedbackIcon = ({ className = "text-cyan-400" }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ProductIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const TeamIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);

const UserIconSm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const CalendarIconSm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PriorityChevron = ({ priority }: { priority: string }) => {
  const p = (priority || '').toLowerCase();
  if (p === 'high') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="3"><path d="m18 15-6-6-6 6" /></svg>;
  if (p === 'medium') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3"><path d="M5 12h14" /></svg>;
  if (p === 'low') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3"><path d="m6 9 6 6 6-6" /></svg>;
  return null;
};

/* ─── Linked Item Drawer ──────────────────────────────────────── */

const LINKED_ITEM_LABELS: Record<LinkedItemType, string> = {
  objective: 'Objetivo Vinculado',
  jira: 'Tarea de Jira Vinculada',
  alert: 'Alerta Vinculada',
  metric: 'Métrica Vinculada',
  insight: 'Insight Vinculado',
  feedback: 'Feedback Vinculado',
};

const LINKED_ITEM_ICONS: Record<LinkedItemType, (p?: any) => JSX.Element> = {
  objective: () => <TargetIcon className="text-emerald-400" />,
  jira: () => <JiraIcon className="text-blue-400" />,
  alert: () => <AlertCircleIcon className="text-rose-400" />,
  metric: () => <MetricIcon className="text-purple-400" />,
  insight: () => <InsightIcon className="text-amber-400" />,
  feedback: () => <FeedbackIcon className="text-cyan-400" />,
};

function LinkedItemDrawer({
  type,
  data,
  onClose,
}: {
  type: LinkedItemType;
  data?: LinkedItemData;
  onClose: () => void;
}) {
  const content = data || { title: `Sin información disponible`, description: '' };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#0A0C14] shadow-2xl border-l border-white/5 animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161927]/50">
          <div className="flex items-center gap-3">
            {LINKED_ITEM_ICONS[type]()}
            <span className="text-[11px] font-black uppercase tracking-widest text-white/60">{LINKED_ITEM_LABELS[type]}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h2 className="text-xl font-black text-white">{content.title}</h2>
          {content.description && (
            <p className="text-sm text-white/60 leading-relaxed">{content.description}</p>
          )}
          {Object.entries(content)
            .filter(([k]) => !['title', 'description', 'id'].includes(k))
            .map(([key, val]) => (
              <div key={key} className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{key}</span>
                <p className="text-sm text-white/80">{String(val)}</p>
              </div>
            ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

const STATUS_LABEL: Record<string, string> = {
  todo: 'Pendiente',
  backlog: 'Backlog',
  pending_review: 'Revisión',
  in_progress: 'En progreso',
  review: 'Revisión',
  done: 'Completada',
  blocked: 'Bloqueada',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

function getStatusDotColor(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'done') return 'bg-green-500';
  if (['in_progress', 'review'].includes(s)) return 'bg-blue-500';
  if (s === 'blocked') return 'bg-red-500';
  return 'bg-amber-500';
}

function getStatusBgGlow(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'done') return 'shadow-[0_0_8px_rgba(16,185,129,0.15)]';
  if (['in_progress', 'review'].includes(s)) return 'shadow-[0_0_8px_rgba(59,130,246,0.15)]';
  if (s === 'blocked') return 'shadow-[0_0_8px_rgba(239,68,68,0.15)]';
  return '';
}

function getStatusBadgeStyle(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'done') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (['in_progress', 'review'].includes(s)) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (s === 'blocked') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
}

function getPriorityColor(priority?: string) {
  const p = (priority || '').toLowerCase();
  if (p === 'high') return 'text-rose-400';
  if (p === 'medium') return 'text-amber-400';
  return 'text-blue-400';
}

/* ─── TaskCard ───────────────────────────────────────────────── */

export function TaskCard({ task, onEdit, onDelete, onComplete, linkedItems }: TaskCardProps) {
  const isDone = (task.status || '').toLowerCase() === 'done';
  const [selectedLinkedItem, setSelectedLinkedItem] = useState<LinkedItemType | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);

  const linkedItemTypes: { type: LinkedItemType; visible: boolean }[] = [
    { type: 'objective', visible: !!(task.goal_id || linkedItems?.objective) },
    { type: 'jira', visible: !!(task.linked_jira_key || linkedItems?.jira) },
    { type: 'alert', visible: !!(task.metadata?.linked_alert || linkedItems?.alert) },
    { type: 'metric', visible: !!(task.metadata?.linked_metric || linkedItems?.metric) },
    { type: 'insight', visible: !!(task.metadata?.linked_insight || linkedItems?.insight) },
    { type: 'feedback', visible: !!(task.metadata?.linked_feedback || linkedItems?.feedback) },
  ];

  const visibleLinkedTypes = linkedItemTypes.filter(t => t.visible);

  const handleComplete = () => {
    onComplete(task);
  };

  const handleItemClick = (e: React.MouseEvent, type: LinkedItemType) => {
    e.stopPropagation();
    if (type === 'objective') {
      const objId = linkedItems?.objective?.id || task.goal_id;
      if (objId) setSelectedObjectiveId(objId);
    } else {
      setSelectedLinkedItem(type);
    }
  };

  const getLinkedItemData = (type: LinkedItemType): LinkedItemData | undefined => {
    if (linkedItems?.[type]) return linkedItems[type];
    if (type === 'objective' && task.goal_id) return { title: 'Objetivo #' + task.goal_id.slice(0, 8), id: task.goal_id };
    if (type === 'jira' && task.linked_jira_key) return { title: task.linked_jira_key, description: 'Tarea vinculada de Jira' };
    if (type === 'alert' && task.metadata?.linked_alert) return { title: task.metadata.linked_alert_title || 'Alerta', id: task.metadata.linked_alert };
    if (type === 'metric' && task.metadata?.linked_metric) return { title: task.metadata.linked_metric_title || 'Métrica', id: task.metadata.linked_metric };
    if (type === 'insight' && task.metadata?.linked_insight) return { title: task.metadata.linked_insight_title || 'Insight', id: task.metadata.linked_insight };
    if (type === 'feedback' && task.metadata?.linked_feedback) return { title: task.metadata.linked_feedback_title || 'Feedback', id: task.metadata.linked_feedback };
    return undefined;
  };

  return (
    <>
      <div
        className={`group/task flex items-center gap-3 px-5 py-3.5 bg-[#161927]/50 border border-white/5 rounded-2xl transition-all hover:border-white/10 hover:bg-[#161927]/70 ${isDone ? 'opacity-50' : ''} ${getStatusBgGlow(task.status)}`}
      >
        {/* Radio Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleComplete(); }}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/5 transition-colors"
          title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
        >
          {isDone ? <RadioChecked /> : <RadioEmpty />}
        </button>

        {/* Status Dot */}
        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${getStatusDotColor(task.status)}`} />

        {/* Title */}
        <span
          className={`flex-1 text-sm font-semibold min-w-0 truncate ${isDone ? 'text-white/40 line-through' : 'text-white'}`}
          title={task.title}
        >
          {task.title}
        </span>

        {/* Status Badge */}
        <span className={`flex-shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${getStatusBadgeStyle(task.status)}`}>
          {STATUS_LABEL[task.status?.toLowerCase()] || task.status || 'Pendiente'}
        </span>

        {/* Team / Product */}
        {(task.team || task.product || task.metadata?.product) && (
          <span className="flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border border-white/5 bg-white/[0.03] text-white/50">
            {task.team && (
              <>
                <TeamIcon />
                <span>{task.team}</span>
              </>
            )}
            {task.team && (task.product || task.metadata?.product) && (
              <span className="text-white/10">|</span>
            )}
            {(task.product || task.metadata?.product) && (
              <>
                <ProductIcon />
                <span>{task.product || task.metadata?.product}</span>
              </>
            )}
          </span>
        )}

        {/* Responsible */}
        {task.responsible && (
          <div className="flex-shrink-0 flex items-center gap-1.5 text-[11px] text-white/50 min-w-0 max-w-[140px]">
            <UserIconSm />
            <span className="truncate">{task.responsible}</span>
          </div>
        )}

        {/* Due Date */}
        {task.due_date && (
          <div className={`flex-shrink-0 flex items-center gap-1.5 text-[11px] ${isDone ? 'text-white/30' : 'text-white/50'}`}>
            <CalendarIconSm />
            <span>{new Date(task.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          </div>
        )}

        {/* Priority */}
        {task.priority && (
          <div className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold ${getPriorityColor(task.priority)}`}>
            <PriorityChevron priority={task.priority} />
            <span>{PRIORITY_LABEL[task.priority.toLowerCase()] || task.priority}</span>
          </div>
        )}

        {/* Linked Items Icons */}
        {visibleLinkedTypes.length > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1 pl-2 border-l border-white/5">
            {visibleLinkedTypes.map(({ type }) => (
              <button
                key={type}
                onClick={(e) => handleItemClick(e, type)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors opacity-60 hover:opacity-100"
                title={LINKED_ITEM_LABELS[type]}
              >
                {LINKED_ITEM_ICONS[type]()}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-0.5 pl-2 border-l border-white/5">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="p-1.5 rounded-lg text-white/20 hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover/task:opacity-100"
            title="Editar tarea"
          >
            <EditIcon />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id || ''); }}
            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover/task:opacity-100"
            title="Eliminar tarea"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Objective Detail Drawer */}
      {selectedObjectiveId && (
        <ObjectiveDetailDrawer
          objectiveId={selectedObjectiveId}
          onClose={() => setSelectedObjectiveId(null)}
        />
      )}

      {/* Linked Item Drawer (non-objective types) */}
      {selectedLinkedItem && (
        <LinkedItemDrawer
          type={selectedLinkedItem}
          data={getLinkedItemData(selectedLinkedItem)}
          onClose={() => setSelectedLinkedItem(null)}
        />
      )}
    </>
  );
}
