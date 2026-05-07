'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getTasks, createOrUpdateTask, deleteTask } from '@/lib/services/task-service';
import { getOrCreateWorkspace } from '@/lib/services/workspace-service';
import { categorizeItem, getResponsable } from '@/lib/services/categorization-service';
import { TaskDrawer } from '@/components/day/TaskDrawer';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todas');
  const [selectedResponsable, setSelectedResponsable] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [responsableList, setResponsableList] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

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

        // Load tasks
        const result = await getTasks(wsId);
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

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  }, [tasks, selectedTeam, selectedStatus, selectedResponsable, searchQuery]);

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
      const reloadResult = await getTasks(workspaceId);
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
        <h1 className="text-4xl font-bold text-white">Tareas</h1>
        <button
          onClick={handleNewTask}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          + Nueva Tarea
        </button>
      </div>

      {/* Debug Info */}
      <div className="bg-card rounded-lg border border-white/10 p-4 text-xs text-white/60">
        <p>Workspace: {workspaceId || 'No loaded'} | Total tasks: {tasks.length}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Total de Tareas</p>
          <p className="text-3xl font-bold text-white">{kpis.total}</p>
        </div>
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Pendientes</p>
          <p className="text-3xl font-bold text-amber-400">{kpis.pending}</p>
        </div>
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">En Progreso</p>
          <p className="text-3xl font-bold text-blue-400">{kpis.inProgress}</p>
        </div>
        <div className="bg-card rounded-2xl border border-white/10 p-6">
          <p className="text-white/60 text-sm mb-2">Completadas</p>
          <p className="text-3xl font-bold text-green-400">{kpis.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-white/10 p-6 space-y-6">
        {/* Team Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {TEAMS.map(team => (
            <button
              key={team}
              onClick={() => setSelectedTeam(team)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                selectedTeam === team
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {team}
            </button>
          ))}
        </div>

        {/* Status and Responsable */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Chips */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    selectedStatus === status
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Responsable Selector */}
          <select
            value={selectedResponsable}
            onChange={(e) => setSelectedResponsable(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/40"
          >
            <option value="">Todos los responsables</option>
            {responsableList.map(resp => (
              <option key={resp} value={resp}>{resp}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar por título..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-primary/40"
        />
      </div>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 bg-card rounded-2xl border border-white/10">
          <p className="text-white/60 mb-4">No hay tareas que coincidan con los filtros</p>
          <a
            href="/day/today"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Ir a Análisis Diario
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`bg-card rounded-[2.5rem] border p-7 hover:border-primary/40 transition-all cursor-pointer group/task ${getStatusColor(task.status)} ${
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
