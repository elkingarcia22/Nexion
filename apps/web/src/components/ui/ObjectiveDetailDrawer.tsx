'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';

export function ObjectiveDetailDrawer({
  objectiveId,
  onClose,
}: {
  objectiveId: string;
  onClose: () => void;
}) {
  const [objective, setObjective] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchObjective = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('workspace_objectives')
          .select('*')
          .eq('id', objectiveId)
          .maybeSingle();
        if (error) throw error;
        setObjective(data);
      } catch {
        setObjective(null);
      } finally {
        setLoading(false);
      }
    };
    fetchObjective();
  }, [objectiveId]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[5000] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[#1a1c2d]/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg w-full max-w-2xl h-screen shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-white/10">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-white/40 ml-3">Cargando objetivo...</p>
          </div>
        ) : !objective ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-white/40">Objetivo no encontrado</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-10 bg-card border-b border-white/5 relative overflow-hidden">
              <button
                onClick={onClose}
                className="absolute top-10 right-10 w-10 h-10 rounded-xl bg-card/5 flex items-center justify-center text-white/40 hover:bg-red-500/10 hover:text-red-500 transition-all z-20"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              <div className="space-y-4 pr-14 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg tracking-[0.2em] uppercase border border-primary/20">
                    {objective.type || 'ESTRATÉGICO'}
                  </span>
                  <span className="px-4 py-1.5 bg-card/5 text-white/40 text-[10px] font-black rounded-lg tracking-[0.2em] uppercase">
                    {objective.quarter}
                  </span>
                  <span className="px-4 py-1.5 bg-card/5 text-white/40 text-[10px] font-black rounded-lg tracking-[0.2em] uppercase">
                    {objective.team}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white leading-[1.1] tracking-tight">{objective.title}</h2>
                {objective.narrative && (
                  <p className="text-sm text-white/50 italic leading-relaxed">"{objective.narrative}"</p>
                )}
                <p className="text-base text-white/70 font-medium">{objective.key_result}</p>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-8">
              {/* Owners */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Responsables</h4>
                <div className="flex flex-wrap gap-2">
                  {(objective.owner || '').split(/[,\n]/).filter(Boolean).map((owner: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-card rounded-xl border border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary text-[11px] font-black">{owner.trim()[0]}</div>
                      <span className="text-xs font-bold text-white/70 uppercase">{owner.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Result */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Key Result</h4>
                <div className="bg-card rounded-2xl border border-white/5 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-white">{objective.key_result}</p>
                    <span className="text-lg font-black font-mono text-primary">{objective.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${objective.progress || 0}%` }} />
                  </div>

                  {/* Sub-tasks */}
                  {(objective.sub_tasks || []).length > 0 && (
                    <div className="space-y-2 mt-6">
                      {(objective.sub_tasks as any[]).map((st: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-card/50 rounded-xl border border-white/5">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${st.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-white/20'}`}>
                            {st.status === 'completed' ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            )}
                          </div>
                          <span className={`text-xs font-medium ${st.status === 'completed' ? 'text-white/30 line-through' : 'text-white/70'}`}>{st.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Score & Weight */}
              <div className="flex items-center gap-3 p-4 bg-card/30 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Score:</span>
                <span className="text-sm font-black font-mono text-white/60">{objective.score || 0}</span>
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-4">Weight:</span>
                <span className="text-sm font-black font-mono text-white/60">{objective.weight || 0}%</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-10 bg-card border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-card/5 flex items-center justify-center border border-white/10">
                  <span className="text-lg font-black font-mono text-white">{objective.progress || 0}%</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-0.5">Progreso</span>
                  <span className={`text-xs font-black ${objective.progress >= 70 ? 'text-green-400' : objective.progress >= 10 ? 'text-amber-400' : 'text-white/40'}`}>
                    {objective.progress >= 70 ? 'ÓPTIMO' : objective.progress >= 10 ? 'EN DESARROLLO' : 'SIN AVANCE'}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-card text-white rounded-2xl text-[11px] font-black tracking-[0.2em] hover:bg-black transition-all uppercase"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
