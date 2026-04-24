import React from 'react';

interface Objective {
  team: string;
  quarter: string;
  objective_title: string;
  narrative: string;
  type: string;
  key_result: string;
  weight: number;
  progress: number;
  score: number;
  initiatives_comments: string;
}

interface Initiative {
  title: string;
  okr_reference: string;
  owner: string;
  status: string;
  quarter: string;
  impact: string;
  effort: string;
  priority: string;
}

interface ObjectivesTabProps {
  objectives: Objective[];
  initiatives: Initiative[];
  isSyncing?: boolean;
}

export const ObjectivesTab: React.FC<ObjectivesTabProps> = ({ objectives, initiatives, isSyncing }) => {
  const quarters = Array.from(new Set(objectives.map(o => o.quarter))).sort();
  const [selectedQuarter, setSelectedQuarter] = React.useState(quarters[quarters.length - 1] || "");

  const filteredObjectives = objectives.filter(o => o.quarter === selectedQuarter);
  const filteredInitiatives = initiatives.filter(i => i.quarter === selectedQuarter);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-navy tracking-tight mb-2">Objetivos Estratégicos</h2>
          <p className="text-sm text-navy/40 font-medium">Seguimiento de OKRs y Prioridades de Producto en tiempo real.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-border/10 shadow-soft">
          {quarters.map(q => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className={`px-6 py-2 rounded-xl text-xs font-black tracking-widest transition-all ${
                selectedQuarter === q 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                  : "text-navy/40 hover:text-navy/60 hover:bg-navy/5"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Objectives Grid */}
      <div className="grid grid-cols-1 gap-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
          </div>
          <h3 className="text-sm font-black tracking-[0.2em] text-navy/40 uppercase">Key Results ({filteredObjectives.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredObjectives.map((obj, idx) => (
            <div key={idx} className="group bg-white rounded-[2.5rem] border border-border/10 p-8 shadow-soft hover:shadow-hard transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="px-3 py-1 bg-navy/5 rounded-lg text-[10px] font-black text-navy/40 tracking-widest uppercase">
                    {obj.team}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-primary tracking-tighter">{obj.progress}%</span>
                    <span className="text-[10px] font-bold text-navy/20 uppercase tracking-widest">Avance</span>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-navy mb-3 leading-tight group-hover:text-primary transition-colors">
                  {obj.objective_title}
                </h4>
                
                <p className="text-sm text-navy/60 font-medium mb-6 line-clamp-3 leading-relaxed">
                  <span className="text-navy/30 font-bold block mb-1 text-[10px] uppercase tracking-widest">Key Result:</span>
                  {obj.key_result}
                </p>

                <div className="mt-auto pt-6 border-t border-navy/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-navy/40 uppercase tracking-widest">Score: {obj.score}</span>
                  </div>
                  <div className="text-[10px] font-bold text-navy/20 uppercase tracking-widest">
                    Peso: {obj.weight}%
                  </div>
                </div>
              </div>
              
              {/* Progress bar background */}
              <div className="absolute bottom-0 left-0 h-1.5 bg-primary/5 w-full">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-bright transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(26,107,255,0.5)]" 
                  style={{ width: `${obj.progress}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Initiatives Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-bright/10 flex items-center justify-center text-bright">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/></svg>
            </div>
            <h3 className="text-sm font-black tracking-[0.2em] text-navy/40 uppercase">Tablero de Iniciativas ({filteredInitiatives.length})</h3>
          </div>
          {isSyncing && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse">
              <div className="w-2 h-2 rounded-full bg-primary" />
              SINCRONIZANDO DRIVE
            </div>
          )}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-border/10 shadow-soft overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy/5">
                <th className="px-8 py-5 text-[10px] font-black text-navy/40 uppercase tracking-widest">Iniciativa</th>
                <th className="px-8 py-5 text-[10px] font-black text-navy/40 uppercase tracking-widest text-center">Owner</th>
                <th className="px-8 py-5 text-[10px] font-black text-navy/40 uppercase tracking-widest text-center">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-navy/40 uppercase tracking-widest text-center">Prioridad</th>
                <th className="px-8 py-5 text-[10px] font-black text-navy/40 uppercase tracking-widest text-right">Impacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {filteredInitiatives.map((ini, idx) => (
                <tr key={idx} className="hover:bg-bg/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-navy group-hover:text-primary transition-colors">{ini.title}</span>
                      <span className="text-[10px] font-medium text-navy/30 uppercase tracking-wider">{ini.okr_reference}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-bright/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/10">
                        {ini.owner.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase ${
                      ini.status.toLowerCase().includes('completado') ? 'bg-green-50 text-green-600' :
                      ini.status.toLowerCase().includes('proceso') ? 'bg-blue-50 text-blue-600' :
                      'bg-navy/5 text-navy/40'
                    }`}>
                      {ini.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {['Alta', 'Media', 'Baja'].map(p => (
                        <div 
                          key={p} 
                          className={`w-1.5 h-1.5 rounded-full ${
                            ini.priority === p ? (
                              p === 'Alta' ? 'bg-red-500 scale-125' : 
                              p === 'Media' ? 'bg-amber-500' : 'bg-navy/20'
                            ) : 'bg-navy/5'
                          }`} 
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-[10px] font-black text-navy/60 tracking-widest uppercase bg-bg px-3 py-1 rounded-lg">
                      {ini.impact}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
