'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateWorkspace } from '@/lib/services/workspace-service';
import { getInsights, Insight } from '@/lib/services/insight-service';
import { ALL_PRODUCTS, getAnalysisConfig } from '@/lib/services/analysis-config-service';
import { deriveProductFromItem } from '@/lib/services/categorization-service';
import { InsightCard } from '@/components/insights/InsightCard';

const TEAMS = ['Todas', 'Talent', 'Hiring', 'UX', 'Otras'];

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

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<string[]>(['Todos']);

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

        const configResult = await getAnalysisConfig(wsId);
        const selectedKeys = configResult.success ? configResult.data?.tasks?.selected_products || [] : [];
        const available = selectedKeys.length > 0
          ? ALL_PRODUCTS.filter(p => selectedKeys.includes(p.key)).map(p => p.label)
          : ALL_PRODUCTS.map(p => p.label);
        setProductOptions(['Todos', ...available]);

        const result = await getInsights(wsId);
        if (result.success && result.data) setInsights(result.data);
      } catch (error) {
        console.error('Error loading insights:', error);
      } finally { setLoading(false); }
    };
    loadData();
  }, []);

  useEffect(() => {
    let filtered = insights;
    if (selectedTeam !== 'Todas') {
      const teamMap: Record<string, string> = { 'Talent': 'talent', 'Hiring': 'hiring', 'UX': 'ux', 'Otras': 'otras' };
      filtered = filtered.filter(i => getTeam(i) === (teamMap[selectedTeam] || selectedTeam.toLowerCase()));
    }
    if (selectedProduct !== 'Todos') {
      const product = ALL_PRODUCTS.find(p => p.label === selectedProduct);
      if (product) {
        filtered = filtered.filter(i => (i.product || deriveProductFromItem(i)) === product.key);
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.title.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
    }
    setFilteredInsights(filtered);
  }, [insights, selectedTeam, selectedProduct, searchQuery]);

  const kpis = {
    total: insights.length,
    talent: insights.filter(i => getTeam(i) === 'talent').length,
    hiring: insights.filter(i => getTeam(i) === 'hiring').length,
    ux: insights.filter(i => getTeam(i) === 'ux').length,
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-white/40 mt-3">Cargando insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Insights</h1>
          <p className="text-xs text-white/40 mt-1">Hallazgos y observaciones del análisis diario</p>
        </div>
        <span className="text-[10px] text-white/30 bg-[#161927]/50 border border-white/5 px-4 py-2 rounded-xl font-mono">{insights.length} insights</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1a6bff]/10 to-transparent border border-primary/20 rounded-2xl p-5">
          <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Total Insights</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.total}</div>
        </div>
        <div className="bg-gradient-to-br from-[#2ec6ff]/10 to-transparent border border-[#2ec6ff]/20 rounded-2xl p-5">
          <div className="text-[10px] text-[#2ec6ff] font-black uppercase tracking-widest mb-1">Talent</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.talent}</div>
        </div>
        <div className="bg-gradient-to-br from-[#f49e04]/10 to-transparent border border-[#f49e04]/20 rounded-2xl p-5">
          <div className="text-[10px] text-[#f49e04] font-black uppercase tracking-widest mb-1">Hiring</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.hiring}</div>
        </div>
        <div className="bg-gradient-to-br from-[#a855f7]/10 to-transparent border border-purple-500/20 rounded-2xl p-5">
          <div className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">UX</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.ux}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#161927]/50 border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CustomSelect value={selectedTeam} onChange={setSelectedTeam} options={TEAMS} placeholder="Equipo" />
          <CustomSelect value={selectedProduct} onChange={setSelectedProduct} options={productOptions} placeholder="Producto" />
          {(selectedTeam !== 'Todas' || selectedProduct !== 'Todos' || searchQuery) && (
            <button onClick={() => { setSelectedTeam('Todas'); setSelectedProduct('Todos'); setSearchQuery(''); }} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              Limpiar
            </button>
          )}
          <span className="ml-auto text-[10px] font-semibold text-white/30 font-mono">{filteredInsights.length} resultados</span>
        </div>
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-3 text-primary pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Buscar por título..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/40 transition-colors" />
        </div>
      </div>

      {/* Insights Grid */}
      {filteredInsights.length === 0 ? (
        <div className="text-center py-16 space-y-4 bg-[#161927]/50 border border-white/5 rounded-2xl">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/20">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <p className="text-sm text-white/40">No hay insights que coincidan con los filtros</p>
          <a href="/day/today" className="inline-block px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/80 transition-all">Ir a Análisis Diario</a>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} workspaceId={workspaceId || undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
