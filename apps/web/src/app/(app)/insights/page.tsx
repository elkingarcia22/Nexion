'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateWorkspace } from '@/lib/services/workspace-service';
import { getInsights, Insight } from '@/lib/services/insight-service';

const TEAMS = ['Todas', 'Talent', 'Hiring', 'UX', 'Otras'];

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

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const getTeam = (insight: Insight): string => {
    if (insight.category) {
      const cat = insight.category.toLowerCase();
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

        const result = await getInsights(wsId);
        if (result.success && result.data) {
          setInsights(result.data);
        }
      } catch (error) {
        console.error('Error loading insights:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = insights;

    if (selectedTeam !== 'Todas') {
      const teamMap: Record<string, string> = {
        'Talent': 'talent', 'Hiring': 'hiring', 'UX': 'ux', 'Otras': 'otras'
      };
      const target = teamMap[selectedTeam] || selectedTeam.toLowerCase();
      filtered = filtered.filter(i => getTeam(i) === target);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      );
    }

    setFilteredInsights(filtered);
  }, [insights, selectedTeam, searchQuery]);

  const kpis = {
    total: insights.length,
    talent: insights.filter(i => getTeam(i) === 'talent').length,
    hiring: insights.filter(i => getTeam(i) === 'hiring').length,
    ux: insights.filter(i => getTeam(i) === 'ux').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white/60">Cargando insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-white">Insights</h1>
        <span className="text-sm text-white/40 bg-card border border-white/10 px-4 py-2 rounded-xl">
          {insights.length} insights en total
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Total Insights</p>
          <p className="text-3xl font-bold text-white">{kpis.total}</p>
        </div>
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Talent</p>
          <p className="text-3xl font-bold text-blue-400">{kpis.talent}</p>
        </div>
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Hiring</p>
          <p className="text-3xl font-bold text-amber-400">{kpis.hiring}</p>
        </div>
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">UX</p>
          <p className="text-3xl font-bold text-purple-400">{kpis.ux}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CustomSelect value={selectedTeam} onChange={setSelectedTeam} options={TEAMS} placeholder="Equipo" />

          {(selectedTeam !== 'Todas' || searchQuery) && (
            <button
              onClick={() => { setSelectedTeam('Todas'); setSearchQuery(''); }}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors"
            >
              Limpiar
            </button>
          )}

          <span className="ml-auto text-xs font-semibold text-white/60">
            {filteredInsights.length} resultados
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

      {/* Insights Grid */}
      {filteredInsights.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 bg-card rounded-2xl border border-white/10">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20 mb-4">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <p className="text-white/60 mb-4">No hay insights que coincidan con los filtros</p>
          <a href="/day/today" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            Ir a Análisis Diario
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInsights.map((insight) => {
            const team = getTeam(insight);
            const teamColors: Record<string, string> = {
              talent: 'border-blue-500/20',
              hiring: 'border-amber-500/20',
              ux: 'border-purple-500/20',
              otras: 'border-white/10',
            };

            return (
              <div
                key={insight.id}
                className={`bg-card rounded-[2.5rem] border p-7 hover:border-primary/40 transition-all cursor-pointer ${teamColors[team] || 'border-white/10'}`}
                onClick={() => setSelectedInsight(selectedInsight?.id === insight.id ? null : insight)}
              >
                {/* Team Badge */}
                <div className="flex items-center gap-3 mb-4">
                  {team !== 'otras' && (
                    <span className={`text-xs font-bold uppercase px-3 py-1 rounded-lg ${
                      team === 'talent' ? 'bg-blue-500/20 text-blue-400' :
                      team === 'hiring' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {team}
                    </span>
                  )}
                </div>

                {/* Date */}
                {insight.summary_date && (
                  <div className="text-[10px] text-white/40 font-mono mb-3">
                    {new Date(insight.summary_date + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </div>
                )}

                {/* Title */}
                <h3 className="text-white font-semibold mb-3 text-sm leading-snug line-clamp-2">
                  {insight.title}
                </h3>

                {/* Description (expandable) */}
                {insight.description && (
                  <div className={`text-xs text-white/60 leading-relaxed mb-4 ${
                    selectedInsight?.id === insight.id ? '' : 'line-clamp-3'
                  }`}>
                    {insight.description}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/10 text-[10px] text-white/40">
                  {insight.responsible && <span>Responsable: {insight.responsible}</span>}
                  {insight.goal_id && <span>• Objetivo vinculado</span>}
                  {insight.linked_jira_key && <span>• {insight.linked_jira_key}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
