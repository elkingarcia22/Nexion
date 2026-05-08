"use client";

import { useState } from "react";

const categorizeItem = (item: any, objectives: any[] = [], jiraTasks: any[] = []): string => {
  const title = item?.title?.toLowerCase() || "";
  const cat = item?.category?.toLowerCase() || "";
  
  if (cat.includes("talent")) return "talent";
  if (cat.includes("hiring")) return "hiring";
  if (cat.includes("ux") || cat.includes("design") || cat.includes("ui")) return "ux";
  
  if (title.includes("talent")) return "talent";
  if (title.includes("hiring") || title.includes("contrat")) return "hiring";
  if (title.includes("ux") || title.includes("design") || title.includes("ui") || title.includes("interfaz")) return "ux";
  
  return "otras";
};

const getResponsable = (item: any): string => {
  return item?.responsible || item?.assignee_name || item?.metadata?.responsable || item?.assignee?.displayName || "Sin asignar";
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
  jiraSubTab?: 'todos' | 'talent' | 'hiring' | 'ux' | 'otras';
  setJiraSubTab?: (tab: 'todos' | 'talent' | 'hiring' | 'ux' | 'otras') => void;
  responsableFilter?: string;
  currentUserName?: string;
}) {
  const [internalTab, setInternalTab] = useState<'todos' | 'talent' | 'hiring' | 'ux' | 'otras'>(jiraSubTab as any);

  const handleTabChange = (tab: string) => {
    setInternalTab(tab as any);
    if (setJiraSubTab) setJiraSubTab(tab as any);
  };

  // Filter items by current user
  const filteredItems = items.filter(item => {
    if (!responsableFilter || responsableFilter === "todos") return true;
    const resp = getResponsable(item)?.toLowerCase();
    return resp === responsableFilter?.toLowerCase();
  });

  const talentCount = filteredItems.filter(t => categorizeItem(t, objectives) === "talent").length;
  const hiringCount = filteredItems.filter(t => categorizeItem(t, objectives) === "hiring").length;
  const uxCount = filteredItems.filter(t => categorizeItem(t, objectives) === "ux").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">MIS TAREAS</h3>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          <button onClick={() => handleTabChange("todos")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${internalTab === "todos" ? "bg-blue-500 text-white" : "text-white/40"}`}>
            TODOS ({filteredItems.length})
          </button>
          <button onClick={() => handleTabChange("talent")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${internalTab === "talent" ? "bg-blue-500 text-white" : "text-white/40"}`}>
            TALENT ({talentCount})
          </button>
          <button onClick={() => handleTabChange("hiring")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${internalTab === "hiring" ? "bg-blue-500 text-white" : "text-white/40"}`}>
            HIRING ({hiringCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.slice(0, 12).map((task, i) => (
          <div key={task.id || i} onClick={() => onTaskClick?.(task)} className="bg-card rounded-2xl border border-white/10 p-6 hover:border-primary/30 cursor-pointer">
            <p className="text-sm text-white font-medium">{task.title}</p>
            <p className="text-xs text-white/50 mt-2">{task.responsible || "Sin asignar"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}