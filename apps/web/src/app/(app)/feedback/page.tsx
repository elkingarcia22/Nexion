'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateWorkspace } from '@/lib/services/workspace-service';
import { getFeedback, FeedbackItem } from '@/lib/services/feedback-service';
import { ALL_PRODUCTS, getAnalysisConfig } from '@/lib/services/analysis-config-service';
import { deriveProductFromItem } from '@/lib/services/categorization-service';
import { FeedbackCard } from '@/components/feedback/FeedbackCard';

const TEAMS = ['Todas', 'Talent', 'Hiring', 'UX', 'Otras'];
const TYPE_OPTIONS = ['Todos', 'Producto', 'Laboral', 'Personal'];

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

export default function FeedbackPage() {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('Todas');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<string[]>(['Todos']);

  const getTeam = (item: FeedbackItem): string => {
    if (item.category) {
      const cat = item.category.toLowerCase();
      if (cat === 'talent') return 'talent';
      if (cat === 'hiring') return 'hiring';
      if (cat === 'ux') return 'ux';
      return 'otras';
    }
    return 'otras';
  };

  const getType = (item: FeedbackItem): string => {
    const t = (item.type || '').toLowerCase();
    if (t === 'producto' || t === 'laboral' || t === 'personal') return t;
    return 'producto';
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

        const result = await getFeedback(wsId);
        if (result.success && result.data) setFeedbackItems(result.data);
      } catch (error) {
        console.error('Error loading feedback:', error);
      } finally { setLoading(false); }
    };
    loadData();
  }, []);

  useEffect(() => {
    let filtered = feedbackItems;
    if (selectedTeam !== 'Todas') {
      const teamMap: Record<string, string> = { 'Talent': 'talent', 'Hiring': 'hiring', 'UX': 'ux', 'Otras': 'otras' };
      filtered = filtered.filter(i => getTeam(i) === (teamMap[selectedTeam] || selectedTeam.toLowerCase()));
    }
    if (selectedType !== 'Todos') {
      const typeMap: Record<string, string> = { 'Producto': 'producto', 'Laboral': 'laboral', 'Personal': 'personal' };
      filtered = filtered.filter(i => getType(i) === (typeMap[selectedType] || selectedType.toLowerCase()));
    }
    if (selectedProduct !== 'Todos') {
      const product = ALL_PRODUCTS.find(p => p.label === selectedProduct);
      if (product) {
        filtered = filtered.filter(i => (i.product || deriveProductFromItem(i)) === product.key);
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.title.toLowerCase().includes(q) || (i.content || '').toLowerCase().includes(q));
    }
    setFilteredItems(filtered);
  }, [feedbackItems, selectedTeam, selectedType, selectedProduct, searchQuery]);

  const kpis = {
    total: feedbackItems.length,
    producto: feedbackItems.filter(i => getType(i) === 'producto').length,
    laboral: feedbackItems.filter(i => getType(i) === 'laboral').length,
    personal: feedbackItems.filter(i => getType(i) === 'personal').length,
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-white/40 mt-3">Cargando feedback...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Feedback</h1>
          <p className="text-xs text-white/40 mt-1">Opiniones y comentarios recogidos del equipo</p>
        </div>
        <span className="text-[10px] text-white/30 bg-[#161927]/50 border border-white/5 px-4 py-2 rounded-xl font-mono">{feedbackItems.length} comentarios</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1a6bff]/10 to-transparent border border-primary/20 rounded-2xl p-5">
          <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Total Feedback</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.total}</div>
        </div>
        <div className="bg-gradient-to-br from-[#10b981]/10 to-transparent border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Producto</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.producto}</div>
        </div>
        <div className="bg-gradient-to-br from-[#3b82f6]/10 to-transparent border border-blue-500/20 rounded-2xl p-5">
          <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Laboral</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.laboral}</div>
        </div>
        <div className="bg-gradient-to-br from-[#a855f7]/10 to-transparent border border-purple-500/20 rounded-2xl p-5">
          <div className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">Personal</div>
          <div className="text-2xl font-black text-white font-mono">{kpis.personal}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#161927]/50 border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CustomSelect value={selectedTeam} onChange={setSelectedTeam} options={TEAMS} placeholder="Equipo" />
          <CustomSelect value={selectedType} onChange={setSelectedType} options={TYPE_OPTIONS} placeholder="Tipo" />
          <CustomSelect value={selectedProduct} onChange={setSelectedProduct} options={productOptions} placeholder="Producto" />
          {(selectedTeam !== 'Todas' || selectedType !== 'Todos' || selectedProduct !== 'Todos' || searchQuery) && (
            <button onClick={() => { setSelectedTeam('Todas'); setSelectedType('Todos'); setSelectedProduct('Todos'); setSearchQuery(''); }} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              Limpiar
            </button>
          )}
          <span className="ml-auto text-[10px] font-semibold text-white/30 font-mono">{filteredItems.length} resultados</span>
        </div>
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-3 text-primary pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Buscar por título o contenido..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/40 transition-colors" />
        </div>
      </div>

      {/* Feedback Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 space-y-4 bg-[#161927]/50 border border-white/5 rounded-2xl">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/20">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-sm text-white/40">No hay feedback que coincida con los filtros</p>
          <a href="/day/today" className="inline-block px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/80 transition-all">Ir a Análisis Diario</a>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <FeedbackCard key={item.id} item={item} workspaceId={workspaceId || undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
