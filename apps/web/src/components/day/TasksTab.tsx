"use client";

import { useState } from "react";
import { categorizeItem, getResponsable } from "@/lib/services/categorization-service";
import { ANALYSIS_TEAMS } from "@/lib/services/analysis-config-service";

const ALL_TEAM_KEYS = [...ANALYSIS_TEAMS.map(t => t.key), 'otras'];

const getTeamLabel = (key: string) => {
  if (key === 'otras') return 'Otras';
  const team = ANALYSIS_TEAMS.find(t => t.key === key);
  return team?.label || key;
};

export function TasksTab({
  items = [],
  objectives = [],
  onTaskClick,
  jiraSubTab = "todos",
  setJiraSubTab,
  responsableFilter = "",
  currentUserName = "",
}: {
  items?: any[];
  objectives?: any[];
  onTaskClick?: (task: any) => void;
  jiraSubTab?: 'todos' | string;
  setJiraSubTab?: (tab: string) => void;
  responsableFilter?: string;
  currentUserName?: string;
}) {
  const [internalTab, setInternalTab] = useState<string>(jiraSubTab);

  const handleTabChange = (tab: string) => {
    setInternalTab(tab);
    if (setJiraSubTab) setJiraSubTab(tab);
  };

  const filteredItems = items.filter(item => {
    if (!responsableFilter || responsableFilter === "todos") return true;
    const resp = getResponsable(item)?.toLowerCase();
    return resp === responsableFilter?.toLowerCase();
  });

  const teamCounts = Object.fromEntries(
    ALL_TEAM_KEYS.map(k => [k, filteredItems.filter(t => categorizeItem(t, objectives) === k).length])
  );

  const activeTeamTasks = internalTab === 'todos'
    ? filteredItems
    : filteredItems.filter(t => categorizeItem(t, objectives) === internalTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">MIS TAREAS</h3>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 flex-wrap">
          <button onClick={() => handleTabChange("todos")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${internalTab === "todos" ? "bg-blue-500 text-white" : "text-white/40"}`}>
            TODOS ({filteredItems.length})
          </button>
          {ALL_TEAM_KEYS.map(tk => {
            const count = teamCounts[tk];
            if (count === 0) return null;
            return (
              <button key={tk} onClick={() => handleTabChange(tk)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${internalTab === tk ? "bg-blue-500 text-white" : "text-white/40"}`}>
                {getTeamLabel(tk).toUpperCase()} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTeamTasks.slice(0, 12).map((task, i) => (
          <div key={task.id || i} onClick={() => onTaskClick?.(task)} className="bg-card rounded-2xl border border-white/10 p-6 hover:border-primary/30 cursor-pointer">
            <p className="text-sm text-white font-medium">{task.title}</p>
            <p className="text-xs text-white/50 mt-2">{task.responsible || "Sin asignar"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
