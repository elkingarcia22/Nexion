"use client";

import { useState, useEffect } from "react";
import { createObjective } from "@/lib/services/objectives-service";

interface CreateObjectiveDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
}

export default function CreateObjectiveDrawer({ open, onClose, onSuccess, workspaceId }: CreateObjectiveDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    team: "",
    owner: "",
    quarter: "Q2",
    objective_title: "",
    narrative: "",
    type: "ESTRATÉGICO",
    key_result: "",
  });

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setError("");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.objective_title || !formData.key_result) {
      setError("El título y el Key Result son obligatorios");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await createObjective({
        ...formData,
        workspace_id: workspaceId,
        sub_tasks: [],
        progress: 0,
        weight: 0,
        score: 0,
      });

      if (result.success) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          team: "",
          owner: "",
          quarter: "Q2",
          objective_title: "",
          narrative: "",
          type: "ESTRATÉGICO",
          key_result: "",
        });
      } else {
        setError("Error al crear: " + (result.error as any)?.message);
      }
    } catch (err) {
      setError("Error inesperado al guardar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-navy/20 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-screen w-full max-w-[500px] bg-[#f8fafc] z-[101] flex flex-col shadow-2xl transition-transform duration-500 ease-in-out border-l border-navy/5 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-8 bg-navy text-white relative">
          <button
            onClick={onClose}
            className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:bg-white/20 transition-all z-10"
          >
            ✕
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tight">Nuevo Objetivo</h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Estrategia Organizacional</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-navy/40 uppercase tracking-widest">Título del Objetivo</label>
            <input 
              type="text" 
              value={formData.objective_title}
              onChange={e => setFormData({...formData, objective_title: e.target.value})}
              placeholder="Ej: Escalar operaciones en Latam"
              className="w-full bg-white border border-navy/5 rounded-2xl px-5 py-4 text-sm font-bold text-navy placeholder:text-navy/20 focus:ring-4 focus:ring-primary/10 border-transparent shadow-sm outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/40 uppercase tracking-widest">Equipo / Squad</label>
              <input 
                type="text" 
                value={formData.team}
                onChange={e => setFormData({...formData, team: e.target.value})}
                placeholder="Ej: Growth"
                className="w-full bg-white border border-navy/5 rounded-2xl px-5 py-4 text-sm font-bold text-navy placeholder:text-navy/20 focus:ring-4 focus:ring-primary/10 border-transparent shadow-sm outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/40 uppercase tracking-widest">Responsable</label>
              <input 
                type="text" 
                value={formData.owner}
                onChange={e => setFormData({...formData, owner: e.target.value})}
                placeholder="Ej: Juan Perez"
                className="w-full bg-white border border-navy/5 rounded-2xl px-5 py-4 text-sm font-bold text-navy placeholder:text-navy/20 focus:ring-4 focus:ring-primary/10 border-transparent shadow-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/40 uppercase tracking-widest">Quarter</label>
              <div className="relative">
                <select 
                  value={formData.quarter}
                  onChange={e => setFormData({...formData, quarter: e.target.value})}
                  className="w-full appearance-none bg-white border border-navy/5 rounded-2xl px-5 py-4 text-sm font-bold text-navy outline-none focus:ring-4 focus:ring-primary/10 shadow-sm transition-all"
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-navy/20">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-navy/40 uppercase tracking-widest">Tipo</label>
              <div className="relative">
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full appearance-none bg-white border border-navy/5 rounded-2xl px-5 py-4 text-sm font-bold text-navy outline-none focus:ring-4 focus:ring-primary/10 shadow-sm transition-all"
                >
                  <option value="ESTRATÉGICO">ESTRATÉGICO</option>
                  <option value="OPERATIVO">OPERATIVO</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-navy/20">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-navy/40 uppercase tracking-widest">Narrativa (El Por qué)</label>
            <textarea 
              value={formData.narrative}
              onChange={e => setFormData({...formData, narrative: e.target.value})}
              placeholder="Describe la motivación detrás de este objetivo..."
              rows={4}
              className="w-full bg-white border border-navy/5 rounded-2xl px-5 py-4 text-sm font-bold text-navy placeholder:text-navy/20 focus:ring-4 focus:ring-primary/10 border-transparent shadow-sm outline-none resize-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-navy/40 uppercase tracking-widest">Key Result Principal</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.key_result}
                onChange={e => setFormData({...formData, key_result: e.target.value})}
                placeholder="Ej: Incrementar ventas en un 20%"
                className="w-full bg-white border border-navy/5 rounded-2xl px-5 py-4 text-sm font-bold text-navy placeholder:text-navy/20 focus:ring-4 focus:ring-primary/10 border-transparent shadow-sm outline-none transition-all pl-12"
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[11px] font-bold">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-white border-t border-navy/5 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white border border-navy/10 text-navy rounded-2xl text-[11px] font-black tracking-[0.2em] hover:bg-navy/5 transition-all uppercase"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-4 bg-navy text-white rounded-2xl text-[11px] font-black tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-navy/20 uppercase flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                Guardando...
              </>
            ) : (
              "Guardar Objetivo"
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
