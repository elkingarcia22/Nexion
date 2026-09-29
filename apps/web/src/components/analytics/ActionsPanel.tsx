"use client";

import type { ActionStatus, AnalyticsAction } from "@/lib/analytics/types";

const STATUS_OPTIONS: Array<{ value: ActionStatus; label: string }> = [
  { value: "open", label: "Abierta" },
  { value: "in_progress", label: "En curso" },
  { value: "done", label: "Hecha" },
  { value: "dropped", label: "Descartada" },
];

interface ActionsPanelProps {
  actions: AnalyticsAction[];
  pendingId: string | null;
  onChangeStatus: (action: AnalyticsAction, status: ActionStatus) => void;
}

/** Actions the reports proposed; the monthly report reviews what happened with them. */
export function ActionsPanel({ actions, pendingId, onChangeStatus }: ActionsPanelProps) {
  const active = actions.filter((a) => a.status === "open" || a.status === "in_progress");
  const closed = actions.filter((a) => a.status === "done" || a.status === "dropped");

  if (actions.length === 0) {
    return (
      <p className="text-xs text-white/40 bg-card/50 border border-white/5 rounded-2xl px-4 py-6 text-center">
        Todavía no hay acciones. Los reportes las proponen a partir de lo que encuentran.
      </p>
    );
  }

  const renderList = (list: AnalyticsAction[]) => (
    <ul className="divide-y divide-white/5">
      {list.map((action) => (
        <li key={action.id} className="flex items-start gap-3 py-2.5">
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${action.status === "done" || action.status === "dropped" ? "text-white/40 line-through" : "text-white"}`}>
              {action.title}
            </p>
            <p className="text-[10px] text-white/30 font-mono">desde {action.origin_period_key}</p>
          </div>
          <label className="sr-only" htmlFor={`action-${action.id}`}>
            Estado de la acción
          </label>
          <select
            id={`action-${action.id}`}
            value={action.status}
            disabled={pendingId === action.id}
            onChange={(e) => onChangeStatus(action, e.target.value as ActionStatus)}
            className="shrink-0 bg-card border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-primary/50 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="bg-card/50 border border-white/5 rounded-2xl px-4 py-3 space-y-3">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Activas ({active.length})</h3>
        {active.length ? renderList(active) : <p className="text-xs text-white/40 py-2">Ninguna activa.</p>}
      </div>
      {closed.length > 0 && (
        <details>
          <summary className="text-[10px] font-black uppercase tracking-widest text-white/30 cursor-pointer">Cerradas ({closed.length})</summary>
          {renderList(closed)}
        </details>
      )}
    </div>
  );
}
