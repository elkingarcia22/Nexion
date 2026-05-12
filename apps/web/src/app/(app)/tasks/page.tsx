'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getTasks, createOrUpdateTask, deleteTask } from '@/lib/services/task-service';
import { getOrCreateWorkspace } from '@/lib/services/workspace-service';
import { categorizeItem, getResponsable } from '@/lib/services/categorization-service';
import { ALL_PRODUCTS } from '@/lib/services/analysis-config-service';
import { TaskDrawer } from '@/components/day/TaskDrawer';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Task {
  id?: string;
  workspace_id: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  assignee_id?: string;
  reporter_id?: string;
  due_date?: string;
  team?: string;
  labels?: string[];
  subtasks?: any[];
  activity?: any[];
  proposal_status?: string;
  goal_id?: string;
  parent_id?: string;
  linked_jira_key?: string;
  linked_jira_subtask_id?: string;
  updated_at?: string;
  created_at?: string;
  responsible?: string;
  origin?: string;
}

const TEAMS = ['Todas', 'Talent', 'Hiring', 'UX', 'Otras'];
const STATUS_OPTIONS = ['Todas', 'Pendientes', 'En progreso', 'Completadas', 'Bloqueadas'];
const PRODUCTS = ['Todos', ...ALL_PRODUCTS.map(p => p.label)];

// Custom Select Component
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
        <svg
          className={`w-3 h-3 text-white/20 transition-transform ml-2 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
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

export default function TasksPage() {
  console.log('📋 TasksPage rendering...');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState('Todos');
  const [selectedResponsable, setSelectedResponsable] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [responsableList, setResponsableList] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [dueDateRange, setDueDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [createdDateRange, setCreatedDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // Helper functions for filter counts
  const getTeamCount = (team: string): number => {
    if (team === 'Todas') return tasks.length;
    const teamMap: Record<string, string> = {
      'Talent': 'talent',
      'Hiring': 'hiring',
      'UX': 'ux',
      'Otras': 'otras'
    };
    return tasks.filter(t => categorizeItem(t) === teamMap[team]).length;
  };

  const getStatusCount = (status: string): number => {
    if (status === 'Todas') return tasks.length;
    const statusMap: Record<string, string[]> = {
      'Pendientes': ['todo', 'backlog', 'pending_review'],
      'En progreso': ['in_progress', 'review'],
      'Completadas': ['done'],
      'Bloqueadas': ['blocked']
    };
    const validStatuses = statusMap[status] || [];
    return tasks.filter(t => validStatuses.includes((t.status || '').toLowerCase())).length;
  };

  // Get workspace and load tasks
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('❌ No user logged in');
          setLoading(false);
          return;
        }

        console.log('👤 User:', user.id);
        setUserId(user.id);

        // Get or create workspace
        const wsResult = await getOrCreateWorkspace(user.id, user.email || '');
        console.log('🏢 Workspace result:', wsResult);

        if (!wsResult.success || !wsResult.data) {
          console.error('❌ No workspace found');
          setLoading(false);
          return;
        }

        const wsId = wsResult.data.id;
        console.log('📌 Workspace ID:', wsId);
        setWorkspaceId(wsId);

        // Load user's full name from profiles or metadata
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        const userName = profile?.full_name || user.user_metadata?.full_name || "";
        setUserName(userName);
        console.log('👤 User name for filtering:', userName);

        // Load tasks scoped to current user (by responsible name)
        const result = await getTasks(wsId, undefined, undefined, userName);
        console.log('📋 Tasks result:', result);
        console.log('📊 Total tasks:', result.data?.length || 0);
        
        if (result.success && result.data) {
          console.log('✅ Tasks loaded:', result.data);
          console.log('🔍 Sample task structure:', result.data[0]);
          console.log('📋 Task fields check:', {
            hasTeam: result.data.some((t: Task) => t.team),
            hasResponsible: result.data.some((t: Task) => t.responsible),
            hasAssigneeId: result.data.some((t: Task) => t.assignee_id),
            teamValues: result.data.map((t: Task) => t.team).filter(Boolean),
            responsibleValues: result.data.map((t: Task) => t.responsible).filter(Boolean),
          });
          setTasks(result.data);

          // Extract unique responsables (handle multiple separated by " | ")
          const responsables = new Set<string>();
          result.data.forEach((task: Task) => {
            if (task.responsible) {
              // Split by " | " to handle multiple responsables
              const respList = task.responsible.split(" | ").map(r => r.trim());
              respList.forEach(r => {
                if (r && r.length > 0) responsables.add(r);
              });
            }
            if (task.assignee_id && task.assignee_id !== 'me') responsables.add(task.assignee_id);
          });
          console.log('👥 Extracted responsables:', Array.from(responsables));
          setResponsableList(Array.from(responsables).sort());
        } else {
          console.error('❌ Error loading tasks:', result.error);
        }
      } catch (error) {
        console.error('💥 Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = tasks;

    // Team filter - use categorizeItem for dynamic categorization
    if (selectedTeam !== 'Todas') {
      const teamMap: Record<string, string> = {
        'Talent': 'talent',
        'Hiring': 'hiring',
        'UX': 'ux',
        'Otras': 'otras'
      };
      const selectedTeamLower = teamMap[selectedTeam] || selectedTeam.toLowerCase();
      filtered = filtered.filter(t => categorizeItem(t) === selectedTeamLower);
    }

    // Status filter
    if (selectedStatus !== 'Todas') {
      const statusMap: Record<string, string[]> = {
        'Pendientes': ['todo', 'backlog', 'pending_review'],
        'En progreso': ['in_progress', 'review'],
        'Completadas': ['done'],
        'Bloqueadas': ['blocked']
      };
      const validStatuses = statusMap[selectedStatus] || [];
      filtered = filtered.filter(t => validStatuses.includes((t.status || '').toLowerCase()));
    }

    // Product filter
    if (selectedProduct !== 'Todos') {
      const product = ALL_PRODUCTS.find(p => p.label === selectedProduct);
      if (product) {
        filtered = filtered.filter(t => {
          const team = (t.team || '').toLowerCase();
          return team === product.key || team === product.label.toLowerCase();
        });
      }
    }

    // Responsable filter - handle multiple responsables separated by " | "
    if (selectedResponsable) {
      filtered = filtered.filter(t => {
        // Check if selected responsable is in the responsible list
        if (t.responsible) {
          const responsibles = t.responsible.split(" | ").map(r => r.trim());
          if (responsibles.includes(selectedResponsable)) return true;
        }
        // Also check assignee_id for compatibility
        if (t.assignee_id === selectedResponsable) return true;
        return false;
      });
    }

    // Filtro por fecha de finalización (due_date)
    if (dueDateRange) {
      const s = dueDateRange.start.toISOString().split('T')[0];
      const e = dueDateRange.end.toISOString().split('T')[0];
      filtered = filtered.filter(t => {
        if (!t.due_date) return false; // si hay filtro activo, excluir sin fecha
        const d = t.due_date.split('T')[0];
        return d >= s && d <= e;
      });
    }

    // Filtro por fecha de creación (created_at)
    if (createdDateRange) {
      const s = createdDateRange.start.toISOString().split('T')[0];
      const e = createdDateRange.end.toISOString().split('T')[0];
      filtered = filtered.filter(t => {
        if (!t.created_at) return true;
        const d = t.created_at.split('T')[0];
        return d >= s && d <= e;
      });
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  }, [tasks, selectedTeam, selectedStatus, selectedProduct, selectedResponsable, searchQuery, dueDateRange, createdDateRange]);

  // Calculate KPIs
  const kpis = {
    total: tasks.length,
    pending: tasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      return ['todo', 'backlog', 'pending_review'].includes(s);
    }).length,
    inProgress: tasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      return ['in_progress', 'review'].includes(s);
    }).length,
    completed: tasks.filter(t => (t.status || '').toLowerCase() === 'done').length,
  };

  const handleSaveTask = async (task: Task) => {
    if (!workspaceId) return;

    const result = await createOrUpdateTask({
      ...task,
      workspace_id: workspaceId,
    });

    if (result.success) {
      const reloadResult = await getTasks(workspaceId, undefined, undefined, userName);
      if (reloadResult.success && reloadResult.data) {
        setTasks(reloadResult.data);
      }
      setIsDrawerOpen(false);
      setSelectedTask(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirmDelete) return;

    const result = await deleteTask(confirmDelete);
    if (result.success) {
      setTasks(tasks.filter(t => t.id !== confirmDelete));
      setConfirmDelete(null);
    }
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsCreating(true);
    setIsDrawerOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsCreating(false);
    setIsDrawerOpen(true);
  };

  const getStatusColor = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'done') return 'bg-green-500/20 border-green-500/20';
    if (['in_progress', 'review'].includes(s)) return 'bg-blue-500/20 border-blue-500/20';
    if (s === 'blocked') return 'bg-red-500/20 border-red-500/20';
    return 'bg-white/5 border-white/10';
  };

  const getStatusCircleColor = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'done') return 'bg-green-500';
    if (['in_progress', 'review'].includes(s)) return 'bg-blue-500';
    if (s === 'blocked') return 'bg-red-500';
    return 'bg-amber-500';
  };

  const getPriorityColor = (priority?: string) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return 'text-rose-500';
    if (p === 'medium') return 'text-amber-500';
    return 'text-blue-400';
  };

  const statusLabel: Record<string, string> = {
    'todo': 'Pendiente',
    'backlog': 'Backlog',
    'pending_review': 'Revisión',
    'in_progress': 'En progreso',
    'review': 'Revisión',
    'done': 'Completada',
    'blocked': 'Bloqueada'
  };

  const priorityLabel: Record<string, string> = {
    'high': 'Alta',
    'medium': 'Media',
    'low': 'Baja'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white/60">Cargando tareas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Tareas</h1>
          <p className="text-xs text-white/40 mt-1">Gestión de tareas operativas</p>
        </div>
        <button
          onClick={handleNewTask}
          className="px-5 py-3 bg-[#161927]/80 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:border-primary/30 transition-all flex items-center gap-2"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          NUEVA TAREA
        </button>
      </div>


      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1a6bff]/10 to-transparent border border-[#1a6bff]/20 rounded-2xl p-5">
          <p className="text-[10px] text-[#1a6bff] font-black uppercase tracking-widest mb-1">Total de Tareas</p>
          <p className="text-2xl font-black text-white font-mono">{kpis.total}</p>
        </div>
        <div className="bg-gradient-to-br from-[#f49e04]/10 to-transparent border border-[#f49e04]/20 rounded-2xl p-5">
          <p className="text-[10px] text-[#f49e04] font-black uppercase tracking-widest mb-1">Pendientes</p>
          <p className="text-2xl font-black text-white font-mono">{kpis.pending}</p>
        </div>
        <div className="bg-gradient-to-br from-[#2ec6ff]/10 to-transparent border border-[#2ec6ff]/20 rounded-2xl p-5">
          <p className="text-[10px] text-[#2ec6ff] font-black uppercase tracking-widest mb-1">En Progreso</p>
          <p className="text-2xl font-black text-white font-mono">{kpis.inProgress}</p>
        </div>
        <div className="bg-gradient-to-br from-[#10b981]/10 to-transparent border border-[#10b981]/20 rounded-2xl p-5">
          <p className="text-[10px] text-[#10b981] font-black uppercase tracking-widest mb-1">Completadas</p>
          <p className="text-2xl font-black text-white font-mono">{kpis.completed}</p>
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="bg-[#161927]/50 border border-white/5 rounded-2xl p-4 space-y-3">
        {/* Row 1: Main filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Equipo Dropdown */}
          <CustomSelect
            value={selectedTeam}
            onChange={setSelectedTeam}
            options={TEAMS}
            placeholder="Equipo"
          />

          {/* Producto Dropdown */}
          <CustomSelect
            value={selectedProduct}
            onChange={setSelectedProduct}
            options={PRODUCTS}
            placeholder="Producto"
          />

          {/* Estado Dropdown */}
          <CustomSelect
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={STATUS_OPTIONS}
            placeholder="Estado"
          />

          {/* Filtro por fecha de creación */}
          <DateRangePicker
            value={createdDateRange}
            onChange={setCreatedDateRange}
            label="Creación"
          />

          {/* Filtro por fecha de finalización */}
          <DateRangePicker
            value={dueDateRange}
            onChange={setDueDateRange}
            label="Vencimiento"
            allowFuture={true}
          />

          {/* Clear button */}
          {(selectedTeam !== 'Todas' || selectedStatus !== 'Todas' || selectedProduct !== 'Todos' || selectedResponsable || searchQuery ||
            dueDateRange || createdDateRange) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTeam('Todas');
                setSelectedStatus('Todas');
                setSelectedProduct('Todos');
                setSelectedResponsable('');
                setSearchQuery('');
                setDueDateRange(null);
                setCreatedDateRange(null);
              }}
            >
              Limpiar
            </Button>
          )}

          {/* Results counter */}
          <span className="ml-auto text-xs font-semibold text-white/60">
            {filteredTasks.length} resultados
          </span>
        </div>

        {/* Row 2: Search */}
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-3 text-primary pointer-events-none">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <Input
            type="text"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#161927]/50 border border-white/5 text-white placeholder-white/40"
          />
        </div>
      </div>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 bg-[#161927]/50 border border-white/5 rounded-2xl">
          <p className="text-white/60 mb-4">No hay tareas que coincidan con los filtros</p>
          <a
            href="/day/today"
            className="px-5 py-3 bg-[#161927]/80 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:border-primary/30 transition-all"
          >
            Ir a Análisis Diario
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`bg-[#161927]/50 border border-white/5 rounded-2xl p-5 hover:border-primary/40 transition-all cursor-pointer group/task ${getStatusColor(task.status)} ${
                task.status?.toLowerCase() === 'done' ? 'opacity-60' : ''
              }`}
              onClick={() => handleEditTask(task)}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${getStatusCircleColor(task.status)}`} />
                <span className="text-white/60 text-xs uppercase">
                  {statusLabel[task.status?.toLowerCase() || 'todo']}
                </span>
                {task.priority && (
                  <span className={`text-xs font-semibold ml-auto ${getPriorityColor(task.priority)}`}>
                    {priorityLabel[task.priority.toLowerCase()] || task.priority}
                  </span>
                )}
              </div>

              {/* Body */}
              <h3 className="text-white font-semibold mb-3 text-sm leading-snug line-clamp-2">
                {task.title}
              </h3>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {(categorizeItem(task) !== 'otras') && (
                  <span className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded capitalize">
                    {categorizeItem(task)}
                  </span>
                )}
              </div>

              {/* Info Row */}
              <div className="text-xs text-white/60 space-y-1 mb-4">
                {(task.responsible || task.assignee_id) && (
                  <p>Responsable: {task.responsible || task.assignee_id}</p>
                )}
                {task.due_date && (
                  <p>Vence: {new Date(task.due_date).toLocaleDateString('es-ES')}</p>
                )}
              </div>

              {/* Footer - Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTask(task);
                  }}
                  className="px-3 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(task.id || '');
                  }}
                  className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TaskDrawer */}
      {isDrawerOpen && (
        <TaskDrawer
          task={selectedTask}
          open={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedTask(null);
          }}
          onSave={handleSaveTask}
          workspaceId={workspaceId || ''}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <ConfirmModal
          open={confirmDelete !== null}
          title="Eliminar Tarea"
          message="¿Estás seguro de que deseas eliminar esta tarea?"
          onConfirm={handleDeleteTask}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Eliminar"
          variant="danger"
        />
      )}
    </div>
  );
}
