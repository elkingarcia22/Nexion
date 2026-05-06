"use client";

interface AnalisisData {
  summary_text?: string;
  tasks?: Array<{
    id?: string;
    title: string;
    priority?: string;
    goal_id?: string | null;
    linked_jira_key?: string | null;
    due_date?: string | null;
  }>;
  insights?: Array<{
    title: string;
    description?: string;
    category?: string;
  }>;
  alerts?: Array<{
    title: string;
    description?: string;
    priority?: string;
  }>;
  objectives?: Array<{
    id: string;
    title: string;
  }>;
}

export function ResumenDelAnalisisTab({ data, objectives = [] }: { data?: AnalisisData; objectives?: any[] }) {
  if (!data) return null;

  const getObjectiveTitle = (goalId: string | null | undefined) => {
    if (!goalId) return null;
    const obj = objectives.find(o => o.id === goalId);
    return obj ? obj.title : null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Resumen del Informe */}
      {data.summary_text && (
        <div className="bg-card rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Resumen del Informe</h3>
          </div>
          <p className="text-base text-white/80 leading-relaxed font-medium">
            {data.summary_text}
          </p>
        </div>
      )}

      {/* Tareas Detectadas / Próximos Pasos */}
      {data.tasks && data.tasks.length > 0 && (
        <div className="bg-card rounded-3xl border border-white/10 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Tareas Detectadas</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500">
              {data.tasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {data.tasks.map((task, i) => {
              const linkedObj = getObjectiveTitle(task.goal_id);
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                    task.priority === 'alta' || task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    task.priority === 'media' || task.priority === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-primary/20 text-primary'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.priority && (
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${
                          task.priority === 'alta' || task.priority === 'high' ? 'text-red-400' :
                          task.priority === 'media' || task.priority === 'medium' ? 'text-amber-500' :
                          'text-blue-400'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                      {linkedObj && (
                        <span className="text-[9px] text-primary font-bold">OBJ: {linkedObj}</span>
                      )}
                      {task.due_date && (
                        <span className="text-[9px] text-white/40">📅 {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights / Hallazgos Clave */}
      {data.insights && data.insights.length > 0 && (
        <div className="bg-card rounded-3xl border border-white/10 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Insights / Hallazgos</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500">
              {data.insights.length}
            </span>
          </div>
          <div className="space-y-3">
            {data.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-white/80 font-medium">{insight.title}</p>
                  {insight.description && (
                    <p className="text-xs text-white/50 mt-1">{insight.description}</p>
                  )}
                  {insight.category && (
                    <span className="text-[9px] text-white/30 uppercase tracking-widest mt-1 inline-block">{insight.category}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas / Riesgos */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="bg-card rounded-3xl border border-red-500/20 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center animate-pulse">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Alertas / Riesgos</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500">
              {data.alerts.length}
            </span>
          </div>
          <div className="space-y-3">
            {data.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm text-white/80 font-bold">{alert.title}</p>
                  {alert.description && (
                    <p className="text-xs text-white/50 mt-1">{alert.description}</p>
                  )}
                  {alert.priority && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase mt-1 inline-block ${
                      alert.priority === 'critica' || alert.priority === 'highest' ? 'bg-red-500/20 text-red-500' :
                      'bg-amber-500/20 text-amber-500'
                    }`}>
                      {alert.priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
