'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateWorkspace } from '@/lib/services/workspace-service';
import { getAlerts, Alert } from '@/lib/services/alert-service';

const TEAMS = ['Todas', 'Talent', 'Hiring', 'UX', 'Otras'];
const PRIORITY_OPTIONS = ['Todas', 'Crítica', 'Alta', 'Media'];

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "Selecciona...",
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:border-primary/40 transition-all text-left whitespace-nowrap"
      >
        <span className="truncate">{value || placeholder}</span>
        <svg className={`w-3 h-3 text-white/20 transition-transform ml-2 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-[150] bg-[#161927] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 min-w-max">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest text-left transition-colors ${
                value === opt ? "bg-primary text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  critica: { label: 'Crítica', color: 'text-red-400', dot: 'bg-red-500' },
  alta: { label: 'Alta', color: 'text-orange-400', dot: 'bg-orange-500' },
  media: { label: 'Media', color: 'text-blue-400', dot: 'bg-blue-500' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('Todas');
  const [selectedPriority, setSelectedPriority] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const getTeam = (alert: Alert): string => {
    if (alert.category) {
      const cat = alert.category.toLowerCase();
      if (cat === 'talent') return 'talent';
      if (cat === 'hiring') return 'hiring';
      if (cat === 'ux') return 'ux';
      return 'otras';
    }
    return 'otras';
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const wsResult = await getOrCreateWorkspace(user.id, user.email || '');
        if (!wsResult.success || !wsResult.data) { setLoading(false); return; }

        const wsId = wsResult.data.id;
        setWorkspaceId(wsId);

        const result = await getAlerts(wsId);
        if (result.success && result.data) {
          setAlerts(result.data);
        }
      } catch (error) {
        console.error('Error loading alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = alerts;

    if (selectedTeam !== 'Todas') {
      const teamMap: Record<string, string> = {
        'Talent': 'talent', 'Hiring': 'hiring', 'UX': 'ux', 'Otras': 'otras'
      };
      const target = teamMap[selectedTeam] || selectedTeam.toLowerCase();
      filtered = filtered.filter(a => getTeam(a) === target);
    }

    if (selectedPriority !== 'Todas') {
      const priorityMap: Record<string, string> = {
        'Crítica': 'critica', 'Alta': 'alta', 'Media': 'media'
      };
      filtered = filtered.filter(a => (a.priority || 'media').toLowerCase() === priorityMap[selectedPriority]);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }

    setFilteredAlerts(filtered);
  }, [alerts, selectedTeam, selectedPriority, searchQuery]);

  const kpis = {
    total: alerts.length,
    critica: alerts.filter(a => (a.priority || '').toLowerCase() === 'critica').length,
    alta: alerts.filter(a => (a.priority || '').toLowerCase() === 'alta').length,
    media: alerts.filter(a => (a.priority || '').toLowerCase() === 'media').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white/60">Cargando alertas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-white">Alertas</h1>
        <span className="text-sm text-white/40 bg-card border border-white/10 px-4 py-2 rounded-xl">
          {alerts.length} alertas en total
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Total Alertas</p>
          <p className="text-3xl font-bold text-white">{kpis.total}</p>
        </div>
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Críticas</p>
          <p className="text-3xl font-bold text-red-400">{kpis.critica}</p>
        </div>
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Altas</p>
          <p className="text-3xl font-bold text-orange-400">{kpis.alta}</p>
        </div>
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Medias</p>
          <p className="text-3xl font-bold text-blue-400">{kpis.media}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CustomSelect value={selectedTeam} onChange={setSelectedTeam} options={TEAMS} placeholder="Equipo" />
          <CustomSelect value={selectedPriority} onChange={setSelectedPriority} options={PRIORITY_OPTIONS} placeholder="Prioridad" />

          {(selectedTeam !== 'Todas' || selectedPriority !== 'Todas' || searchQuery) && (
            <button
              onClick={() => { setSelectedTeam('Todas'); setSelectedPriority('Todas'); setSearchQuery(''); }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors"
            >
              Limpiar
            </button>
          )}

          <span className="ml-auto text-xs font-semibold text-white/60">
            {filteredAlerts.length} resultados
          </span>
        </div>

        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-3 text-primary pointer-events-none">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      </div>

      {/* Alerts Grid */}
      {filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 bg-card rounded-2xl border border-white/10">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20 mb-4">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-white/60 mb-4">No hay alertas que coincidan con los filtros</p>
          <a href="/day/today" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            Ir a Análisis Diario
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => {
            const pConfig = priorityConfig[alert.priority?.toLowerCase() || 'media'];
            const team = getTeam(alert);

            return (
              <div
                key={alert.id}
                className={`bg-card rounded-[2.5rem] border p-7 hover:border-primary/40 transition-all cursor-pointer ${
                  pConfig?.dot === 'bg-red-500' ? 'border-red-500/20' : 'border-white/10'
                }`}
                onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${pConfig?.dot || 'bg-blue-500'}`} />
                  <span className={`text-xs font-bold uppercase ${pConfig?.color || 'text-blue-400'}`}>
                    {pConfig?.label || 'Media'}
                  </span>
                  {team !== 'otras' && (
                    <span className="ml-auto text-xs bg-white/10 text-white/80 px-2 py-1 rounded capitalize">
                      {team}
                    </span>
                  )}
                </div>

                {/* Date */}
                {alert.summary_date && (
                  <div className="text-[10px] text-white/40 font-mono mb-3">
                    {new Date(alert.summary_date + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </div>
                )}

                {/* Title */}
                <h3 className="text-white font-semibold mb-3 text-sm leading-snug line-clamp-2">
                  {alert.title}
                </h3>

                {/* Description (expandable) */}
                {alert.description && (
                  <div className={`text-xs text-white/60 leading-relaxed mb-4 ${
                    selectedAlert?.id === alert.id ? '' : 'line-clamp-3'
                  }`}>
                    {alert.description}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/10 text-[10px] text-white/40">
                  {alert.responsible && <span>Responsable: {alert.responsible}</span>}
                  {alert.goal_id && <span>• Objetivo vinculado</span>}
                  {alert.linked_jira_key && <span>• {alert.linked_jira_key}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
