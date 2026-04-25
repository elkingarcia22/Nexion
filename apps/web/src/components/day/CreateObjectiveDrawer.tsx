"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createObjective } from "@/lib/services/objectives-service";

interface CreateObjectiveDrawerProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onSave: () => void;
}

export function CreateObjectiveDrawer({ open, onClose, workspaceId, onSave }: CreateObjectiveDrawerProps) {
  const [formData, setFormData] = useState({
    title: "",
    narrative: "",
    team: "",
    owner: "",
    quarter: "Q2",
    type: "ESTRATÉGICO",
    keyResults: [""]
  });

  const [submitting, setSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    async function loadProfiles() {
      const { data } = await supabase.from("profiles").select("id, full_name");
      if (data) setProfiles(data);
    }
    if (open) loadProfiles();
  }, [open]);

  const handleAddKR = () => {
    setFormData(prev => ({ ...prev, keyResults: [...prev.keyResults, ""] }));
  };

  const handleRemoveKR = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      keyResults: prev.keyResults.filter((_, i) => i !== index) 
    }));
  };

  const handleKRChange = (index: number, value: string) => {
    const newKRs = [...formData.keyResults];
    newKRs[index] = value;
    setFormData(prev => ({ ...prev, keyResults: newKRs }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.team) return;
    setSubmitting(true);
    
    try {
      const krsToSave = formData.keyResults.filter(kr => kr.trim().length > 0);
      if (krsToSave.length === 0) krsToSave.push("Nuevo Resultado Clave");

      const promises = krsToSave.map(kr => createObjective({
        workspace_id: workspaceId,
        objective_title: formData.title,
        narrative: formData.narrative,
        team: formData.team,
        owner: formData.owner,
        quarter: formData.quarter,
        type: formData.type,
        key_result: kr,
        progress: 0,
        score: 0,
        last_synced_at: new Date().toISOString()
      }));

      await Promise.all(promises);
      onSave();
      onClose();
    } catch (error) {
      console.error("Error creating objective:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[#0a1b3d]/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#f8fafc] w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-white/20">
        <div className="p-10 bg-white border-b border-navy/5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-navy tracking-tight uppercase">Nuevo Objetivo</h2>
            <p className="text-xs text-navy/40 font-bold tracking-widest mt-1">ESTABLECE TUS METAS ESTRATÉGICAS</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center text-navy/40 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Título del Objetivo</label>
              <input 
                type="text"
                placeholder="Ej: Escalar infraestructura de pagos"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white border border-border/10 rounded-2xl h-14 px-6 text-sm font-bold text-navy focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Narrativa / Contexto</label>
              <textarea 
                placeholder="Describe el por qué de este objetivo..."
                value={formData.narrative}
                onChange={(e) => setFormData(prev => ({ ...prev, narrative: e.target.value }))}
                className="w-full bg-white border border-border/10 rounded-2xl p-6 text-sm font-medium text-navy/60 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all min-h-[120px] resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Equipo / Producto</label>
              <input 
                type="text"
                placeholder="Ej: FinTech Squad"
                value={formData.team}
                onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value }))}
                className="w-full bg-white border border-border/10 rounded-2xl h-14 px-6 text-sm font-bold text-navy focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Responsable</label>
              <input 
                type="text"
                placeholder="Nombre del responsable"
                value={formData.owner}
                onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                className="w-full bg-white border border-border/10 rounded-2xl h-14 px-6 text-sm font-bold text-navy focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Periodo (Quarter)</label>
              <select 
                value={formData.quarter}
                onChange={(e) => setFormData(prev => ({ ...prev, quarter: e.target.value }))}
                className="w-full bg-white border border-border/10 rounded-2xl h-14 px-6 text-sm font-bold text-navy focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none"
              >
                <option value="Q1">Q1 — Enero-Marzo</option>
                <option value="Q2">Q2 — Abril-Junio</option>
                <option value="Q3">Q3 — Julio-Septiembre</option>
                <option value="Q4">Q4 — Octubre-Diciembre</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Tipo</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full bg-white border border-border/10 rounded-2xl h-14 px-6 text-sm font-bold text-navy focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none"
              >
                <option value="ESTRATÉGICO">ESTRATÉGICO</option>
                <option value="OPERATIVO">OPERATIVO</option>
                <option value="OUTCOME">OUTCOME</option>
                <option value="OUTPUT">OUTPUT</option>
              </select>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-navy/30 uppercase tracking-widest ml-1">Resultados Clave (KRs)</label>
              <button 
                onClick={handleAddKR}
                className="text-[10px] font-black text-primary hover:text-primary/70 transition-all uppercase tracking-widest flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Agregar KR
              </button>
            </div>
            <div className="space-y-3">
              {formData.keyResults.map((kr, index) => (
                <div key={index} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                  <div className="flex-1 relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-navy/20">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    </div>
                    <input 
                      type="text"
                      placeholder={`Key Result ${index + 1}`}
                      value={kr}
                      onChange={(e) => handleKRChange(index, e.target.value)}
                      className="w-full bg-white border border-border/10 rounded-2xl h-14 pl-12 pr-6 text-sm font-bold text-navy focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  {formData.keyResults.length > 1 && (
                    <button 
                      onClick={() => handleRemoveKR(index)}
                      className="w-14 h-14 rounded-2xl bg-navy/5 flex items-center justify-center text-navy/20 hover:bg-red-50 hover:text-red-500 transition-all shrink-0"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-10 bg-white border-t border-navy/5 flex items-center gap-4">
          <button 
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl border border-border/10 text-[11px] font-black text-navy/40 uppercase tracking-widest hover:bg-navy/5 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitting || !formData.title || !formData.team}
            className="flex-[2] h-14 rounded-2xl bg-navy text-white text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-navy/10 disabled:opacity-30 flex items-center justify-center gap-3"
          >
            {submitting ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>GUARDAR OBJETIVO</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
