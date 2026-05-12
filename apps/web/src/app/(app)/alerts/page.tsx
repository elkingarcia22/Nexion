'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateWorkspace } from '@/lib/services/workspace-service';
import { getAlerts, Alert } from '@/lib/services/alert-service';
import { ALL_PRODUCTS } from '@/lib/services/analysis-config-service';

const TEAMS = ['Todas', 'Talent', 'Hiring', 'UX', 'Otras'];
const PRIORITY_OPTIONS = ['Todas', 'Crítica', 'Alta', 'Media'];
const PRODUCTS = ['Todos', ...ALL_PRODUCTS.map(p => p.label)];

const CustomSelect = ({
  value, onChange, options, placeholder = "Selecciona...", className = ""
}: {
  value: string; onChange: (val: string) => void; options: string[]; placeholder?: string; className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between px-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:border-primary/40 transition-all text-left whitespace-nowrap">
        <span className="truncate">{value || placeholder}</span>
        <svg className={`w-3 h-3 text-white/20 transition-transform ml-2 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-[150] bg-[#161927] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-60 overflow-y-auto min-w-max">
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest text-left transition-colors ${value === opt ? "bg-primary text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const priorityConfig: Record<string, { label: string; color: string; dot: string; border: string }> = {
  critica: { label: 'Crítica', color: 'text-red-400', dot: 'bg-red-500', border: 'border-l-red-500' },
  alta: { label: 'Alta', color: 'text-orange-400', dot: 'bg-orange-500', border: 'border-l-orange-500' },
  media: { label: 'Media', color: 'text-blue-400', dot: 'bg-blue-500', border: 'border-l-blue-500' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('Todas');
  const [selectedPriority, setSelectedPriority] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState('Todos');
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
        if (result.success && result.data) setAlerts(result.data);
      } catch (error) {
        console.error('Error loading alerts:', error);
      } finally { setLoading(false); }
    };
    loadData();
  }, []);

  useEffect(() => {
    let filtered = alerts;
    if (selectedTeam !== 'Todas') {
      const teamMap: Record<string, string> = { 'Talent': 'talent', 'Hiring': 'hiring', 'UX': 'ux', 'Otras': 'otras' };
      filtered = filtered.filter(a => getTeam(a) === (teamMap[selectedTeam] || selectedTeam.toLowerCase()));
    }
    if (selectedPriority !== 'Todas') {
      const priorityMap: Record<string, string> = { 'Crítica': 'critica', 'Alta': 'alta', 'Media': 'media' };
      filtered = filtered.filter(a => (a.priority || 'media').toLowerCase() === priorityMap[selectedPriority]);
    }
    if (selectedProduct !== 'Todos') {
      const product = ALL_PRODUCTS.find(p => p.label === selectedProduct);
      if (product) {
        filtered = filtered.filter(a => {
          const cat = (a.category || '').toLowerCase();
          return cat === product.key || cat === product.label.toLowerCase();
        });
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
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
      <div className="text-center py-12">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-white/40 mt-3">Cargando alertas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Alertas</h1>
          <p className="text-xs text-white/40 mt-1">Notificaciones críticas y seguimientos</p>
        </div>
        <span className="text-[10px] text-white/30 bg-[#161927]/50 border border-white/5 px-4 py-2 rounded-xl font-mono">{alerts.length} alertas</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1a6bff]/10 to-transparent border border-primary/20 rounded-2xl p-5">
          <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Total Alertas</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.total}</div>
        </div>
        <div className="bg-gradient-to-br from-[#ef4444]/10 to-transparent border border-red-500/20 rounded-2xl p-5">
          <div className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">Críticas</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.critica}</div>
        </div>
        <div className="bg-gradient-to-br from-[#f97316]/10 to-transparent border border-orange-500/20 rounded-2xl p-5">
          <div className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-1">Altas</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.alta}</div>
        </div>
        <div className="bg-gradient-to-br from-[#3b82f6]/10 to-transparent border border-blue-500/20 rounded-2xl p-5">
          <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Medias</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.media}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#161927]/50 border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CustomSelect value={selectedTeam} onChange={setSelectedTeam} options={TEAMS} placeholder="Equipo" />
          <CustomSelect value={selectedProduct} onChange={setSelectedProduct} options={PRODUCTS} placeholder="Producto" />
          <CustomSelect value={selectedPriority} onChange={setSelectedPriority} options={PRIORITY_OPTIONS} placeholder="Prioridad" />
          {(selectedTeam !== 'Todas' || selectedPriority !== 'Todas' || selectedProduct !== 'Todos' || searchQuery) && (
            <button onClick={() => { setSelectedTeam('Todas'); setSelectedPriority('Todas'); setSelectedProduct('Todos'); setSearchQuery(''); }} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              Limpiar
            </button>
          )}
          <span className="ml-auto text-[10px] font-semibold text-white/30 font-mono">{filteredAlerts.length} resultados</span>
        </div>
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-3 text-primary pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Buscar por título..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/40 transition-colors" />
        </div>
      </div>

      {/* Alerts Grid */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-16 space-y-4 bg-[#161927]/50 border border-white/5 rounded-2xl">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/20">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm text-white/40">No hay alertas que coincidan con los filtros</p>
          <a href="/day/today" className="inline-block px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/80 transition-all">Ir a Análisis Diario</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => {
            const pConfig = priorityConfig[alert.priority?.toLowerCase() || 'media'];
            const team = getTeam(alert);
            const isExpanded = selectedAlert?.id === alert.id;

            return (
              <div key={alert.id} className={`bg-[#161927]/50 border border-white/5 rounded-2xl p-5 border-l-4 ${pConfig.border} transition-all cursor-pointer hover:border-white/10 ${isExpanded ? 'border-white/10' : ''}`}
                onClick={() => setSelectedAlert(isExpanded ? null : alert)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${pConfig.dot}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${pConfig.color}`}>{pConfig.label}</span>
                  <span className="ml-auto text-[9px] bg-white/5 text-white/50 px-2 py-0.5 rounded uppercase tracking-wider">{team}</span>
                </div>
                {alert.summary_date && (
                  <div className="text-[10px] text-white/30 font-mono mb-2">
                    {new Date(alert.summary_date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
                <h3 className="text-sm font-bold text-white mb-2 leading-snug">{alert.title}</h3>
                {alert.description && (
                  <div className={`text-xs text-white/60 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {alert.description}
                  </div>
                )}
                {(alert.responsible || alert.goal_id || alert.linked_jira_key) && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 text-[9px] text-white/30">
                    {alert.responsible && <span>{alert.responsible}</span>}
                    {alert.goal_id && <span>· Objetivo</span>}
                    {alert.linked_jira_key && <span>· {alert.linked_jira_key}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
