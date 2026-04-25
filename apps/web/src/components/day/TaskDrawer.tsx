"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createOrUpdateTask } from "@/lib/services/task-service";

/* ─── Icons (Inline SVGs) ─────────────────────────────────────── */

const XIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const CheckCircleIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const HistoryIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline><polyline points="12 7 12 12 15 15"></polyline></svg>;
const TagIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const UserIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const UsersIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const CalendarIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const AlertCircleIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const LayoutIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>;
const TargetIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
const ShareIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>;
const MoreIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const DragHandleIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>;

const PriorityIcon = ({ value }: { value: string }) => {
  switch (value) {
    case 'highest': return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m17 11-5-5-5 5M17 18l-5-5-5 5"/></svg>;
    case 'high': return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
    case 'medium': return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>;
    case 'low': return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
    case 'lowest': return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m7 6 5 5 5-5M7 13l5 5 5-5"/></svg>;
    default: return null;
  }
};

/* ─── Types & Constants ─────────────────────────────────────── */

interface TaskDrawerProps {
  open: boolean;
  onClose: () => void;
  task?: any;
  onSave: (task: any) => void;
  workspaceId: string;
  profiles?: any[];
  objectives?: any[];
  currentUserProfileId?: string;
}

const PRIORITIES = [
  { value: "highest", label: "Highest", color: "text-rose-600", bg: "bg-rose-50" },
  { value: "high", label: "High", color: "text-rose-500", bg: "bg-rose-50/50" },
  { value: "medium", label: "Medium", color: "text-amber-500", bg: "bg-amber-50" },
  { value: "low", label: "Low", color: "text-blue-500", bg: "bg-blue-50" },
  { value: "lowest", label: "Lowest", color: "text-blue-400", bg: "bg-blue-50/50" },
];

const STATUSES = [
  { value: "backlog", label: "Backlog", color: "text-navy/40", bg: "bg-navy/5" },
  { value: "todo", label: "Tareas por hacer", color: "text-navy/60", bg: "bg-navy/5" },
  { value: "in_progress", label: "En curso", color: "text-blue-600", bg: "bg-blue-50" },
  { value: "blocked", label: "Blocked/On Hold", color: "text-red-500", bg: "bg-red-50" },
  { value: "review", label: "En aprobación", color: "text-amber-600", bg: "bg-amber-50" },
  { value: "done", label: "Finalizada", color: "text-green-600", bg: "bg-green-500/10" },
];

/* ─── Component ─────────────────────────────────────────────── */

export function TaskDrawer({ 
  open, 
  onClose, 
  task, 
  onSave, 
  workspaceId,
  profiles: propsProfiles = [],
  objectives: propsObjectives = [],
  currentUserProfileId
}: TaskDrawerProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "pendiente",
    assignee_id: "",
    reporter_id: "",
    due_date: "",
    team: "",
    labels: [] as string[],
    subtasks: [] as any[],
    activity: [] as any[],
    goal_id: "",
  });

  const [activeTab, setActiveTab] = useState<"comentarios" | "historial">("comentarios");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<number | null>(null);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        status: task.status || "pendiente",
        assignee_id: task.assignee_id || "",
        reporter_id: task.reporter_id || "",
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : "",
        team: task.team || "",
        labels: task.labels || [],
        subtasks: task.subtasks || [],
        activity: task.activity || [],
        goal_id: task.goal_id || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "pendiente",
        assignee_id: "",
        reporter_id: "",
        due_date: "",
        team: "",
        labels: [],
        subtasks: [],
        activity: [],
        goal_id: "",
      });
    }
  }, [task, open]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load Current User if not provided
        if (!currentUserProfileId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (profile) setCurrentUser(profile);
          } else if (localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
            setCurrentUser({ id: "demo-user", full_name: "Elkin García", avatar_url: "https://github.com/elkingarcia.png" });
          }
        } else {
          const profile = propsProfiles.find(p => p.id === currentUserProfileId);
          if (profile) setCurrentUser(profile);
        }

        // Use profiles from props or load if empty
        if (propsProfiles && propsProfiles.length > 0) {
          setProfiles(propsProfiles);
        } else {
          const { data: profileData } = await supabase.from("profiles").select("id, full_name, avatar_url");
          if (profileData) setProfiles(profileData);
        }

        // Use objectives from props or load if empty
        if (propsObjectives && propsObjectives.length > 0) {
          setObjectives(propsObjectives);
        } else {
          const { data: objectiveData } = await supabase
            .from("workspace_objectives")
            .select("id, title, team")
            .eq("workspace_id", workspaceId);
          if (objectiveData) {
            setObjectives(objectiveData);
          }
        }
      } catch (err) {
        console.error("Error loading drawer data:", err);
      }
    }
    if (open) loadData();
  }, [open, workspaceId, propsProfiles, propsObjectives, currentUserProfileId]);

  // Set default assignee if new task
  useEffect(() => {
    if (!task && (currentUserProfileId || currentUser?.id) && !formData.assignee_id && open) {
      setFormData(prev => ({ ...prev, assignee_id: currentUserProfileId || currentUser?.id }));
    }
  }, [currentUserProfileId, currentUser, task, open]);

  const handleAddSubtask = () => {
    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, { 
        id: Date.now(), 
        title: "", 
        status: "todo", 
        priority: "medium", 
        assignee_id: currentUser?.id || "" 
      }]
    }));
  };

  const handleUpdateSubtask = (id: number, fields: any) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(s => s.id === id ? { ...s, ...fields } : s)
    }));
  };

  const handleRemoveSubtask = (id: number) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(s => s.id !== id)
    }));
  };

  const handleDragStart = (id: number) => {
    setDraggedSubtaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (draggedSubtaskId === null || draggedSubtaskId === id) return;
    
    const items = [...formData.subtasks];
    const draggedIdx = items.findIndex(i => i.id === draggedSubtaskId);
    const overIdx = items.findIndex(i => i.id === id);
    
    const [draggedItem] = items.splice(draggedIdx, 1);
    items.splice(overIdx, 0, draggedItem);
    
    setFormData(prev => ({ ...prev, subtasks: items }));
  };

  const handleDragEnd = () => {
    setDraggedSubtaskId(null);
  };

  // Sync team when goal changes
  useEffect(() => {
    if (formData.goal_id && objectives.length > 0) {
      const selectedObj = objectives.find(o => o.id === formData.goal_id);
      if (selectedObj && selectedObj.team && !formData.team) {
        setFormData(prev => ({ ...prev, team: selectedObj.team }));
      }
    }
  }, [formData.goal_id, objectives]);

  const handleAddLabel = () => {
    if (!newLabel.trim()) return;
    if (!formData.labels.includes(newLabel.trim())) {
      setFormData(prev => ({
        ...prev,
        labels: [...prev.labels, newLabel.trim()]
      }));
    }
    setNewLabel("");
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now(),
      type: "comment",
      user: currentUser?.full_name || "Tú",
      text: newComment,
      timestamp: new Date().toISOString(),
    };
    setFormData(prev => ({
      ...prev,
      activity: [comment, ...prev.activity]
    }));
    setNewComment("");
  };

  const handleDeleteComment = (id: number) => {
    setFormData(prev => ({
      ...prev,
      activity: prev.activity.filter(a => a.id !== id)
    }));
  };

  const handleStartEditComment = (id: number, text: string) => {
    setEditingCommentId(id);
    setEditCommentText(text);
  };

  const handleSaveEditComment = () => {
    if (!editCommentText.trim()) return;
    setFormData(prev => ({
      ...prev,
      activity: prev.activity.map(a => a.id === editingCommentId ? { ...a, text: editCommentText } : a)
    }));
    setEditingCommentId(null);
    setEditCommentText("");
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setSubmitting(true);
    
    try {
      // Automatic history tracking
      const newActivity = [...formData.activity];
      if (task) {
        if (task.status !== formData.status) {
          newActivity.unshift({
            id: Date.now() + 1,
            type: "history",
            user: "Tú",
            text: `cambió el estado de "${task.status}" a "${formData.status}"`,
            timestamp: new Date().toISOString(),
          });
        }
        if (task.priority !== formData.priority) {
          newActivity.unshift({
            id: Date.now() + 2,
            type: "history",
            user: "Tú",
            text: `cambió la prioridad de "${task.priority}" a "${formData.priority}"`,
            timestamp: new Date().toISOString(),
          });
        }
        if (task.assignee_id !== formData.assignee_id) {
          const newAssignee = profiles.find(p => p.id === formData.assignee_id)?.full_name || "alguien";
          newActivity.unshift({
            id: Date.now() + 3,
            type: "history",
            user: "Tú",
            text: `asignó la tarea a ${newAssignee}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const result = await createOrUpdateTask({
        id: task?.id,
        workspace_id: workspaceId,
        ...formData,
        activity: newActivity,
        proposal_status: "approved"
      });

      if (result.success) {
        onSave(result.data);
        onClose();
      } else {
        alert("Error al guardar la tarea: " + result.error);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Error inesperado al guardar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task?.id) return;
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from("task_proposals").delete().eq("id", task.id);
      if (error) throw error;
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error al eliminar la tarea.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      <div
        className={`absolute inset-0 bg-navy/20 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`relative h-full w-full md:w-[950px] bg-white flex flex-col shadow-hard transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-black/5 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-navy/40">
              <LayoutIcon />
              <span>DÍA</span>
              <span>/</span>
              <span className="text-primary font-black">NEX-{task?.id?.slice(0, 4).toUpperCase() || "NUEVA"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-black/5 rounded-md text-navy/40 transition-colors">
              <ShareIcon />
            </button>
            <div className="relative group/menu">
              <button className="p-2 hover:bg-black/5 rounded-md text-navy/40 transition-colors">
                <MoreIcon />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-black/5 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-[120]">
                <button 
                  onClick={handleDeleteTask}
                  className="w-full px-4 py-2 text-left text-xs font-black text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <TrashIcon /> ELIMINAR TAREA
                </button>
              </div>
            </div>
            <div className="w-[1px] h-4 bg-black/10 mx-1" />
            <button 
              onClick={onClose}
              className="p-2 hover:bg-black/5 rounded-md text-navy/40 transition-colors"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content (Left) */}
          <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar border-r border-black/5">
            {/* Title Section */}
            <div className="space-y-4">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título de la tarea"
                className="w-full text-4xl font-black text-navy placeholder:text-navy/5 border-none focus:ring-0 p-0 bg-transparent leading-tight"
              />
              
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-black/5 hover:bg-black/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-navy/60 transition-all">
                  <PlusIcon />
                  Añadir descripción
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-navy/30">Descripción</h3>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Escribe una descripción detallada..."
                className="w-full h-32 p-4 bg-gray-50/50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-navy placeholder:text-navy/20 resize-none transition-all"
              />
            </div>

            {/* Subtasks */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-navy/30">Subtareas</h3>
                  {formData.subtasks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-1.5 bg-black/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500" 
                          style={{ width: `${Math.round((formData.subtasks.filter(s => s.status === 'done').length / formData.subtasks.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-black text-navy/40">
                        {Math.round((formData.subtasks.filter(s => s.status === 'done').length / formData.subtasks.length) * 100)}% COMPLETADO
                      </span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleAddSubtask}
                  className="flex items-center gap-2 text-[10px] font-black text-primary hover:opacity-70 transition-all uppercase tracking-widest"
                >
                  <PlusIcon />
                  Añadir subtarea
                </button>
              </div>
              
              <div className="border border-black/5 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 border-b border-black/5">
                    <tr>
                      <th className="p-3 w-8"></th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-navy/40">Actividad</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-navy/40 w-24">Prioridad</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-navy/40 w-28">Responsable</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-navy/40 w-32">Estado</th>
                      <th className="p-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.subtasks.map((subtask) => (
                      <tr 
                        key={subtask.id} 
                        draggable
                        onDragStart={() => handleDragStart(subtask.id)}
                        onDragOver={(e) => handleDragOver(e, subtask.id)}
                        onDragEnd={handleDragEnd}
                        className={`group border-b border-black/5 hover:bg-gray-50/50 transition-colors ${draggedSubtaskId === subtask.id ? "opacity-30 bg-gray-100" : ""}`}
                      >
                        <td className="p-3 cursor-grab active:cursor-grabbing opacity-20 group-hover:opacity-100">
                          <DragHandleIcon />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-navy/20 whitespace-nowrap">NEX-{String(subtask.id).slice(-3)}</span>
                            <input
                              type="text"
                              value={subtask.title}
                              onChange={(e) => handleUpdateSubtask(subtask.id, { title: e.target.value })}
                              placeholder="Título de la subtarea"
                              className={`flex-1 text-[13px] font-medium bg-transparent border-none focus:ring-0 p-0 ${subtask.status === 'done' ? "text-navy/30 line-through" : "text-navy"}`}
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <PriorityIcon value={subtask.priority} />
                            <select
                              value={subtask.priority}
                              onChange={(e) => handleUpdateSubtask(subtask.id, { priority: e.target.value })}
                              className="bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 cursor-pointer text-navy/60"
                            >
                              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label[0]}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-navy/5 flex items-center justify-center text-[8px] font-black overflow-hidden border border-black/5 flex-shrink-0">
                              {profiles.find(p => p.id === subtask.assignee_id)?.avatar_url ? (
                                <img src={profiles.find(p => p.id === subtask.assignee_id)?.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                profiles.find(p => p.id === subtask.assignee_id)?.full_name?.[0] || "?"
                              )}
                            </div>
                            <select
                              value={subtask.assignee_id}
                              onChange={(e) => handleUpdateSubtask(subtask.id, { assignee_id: e.target.value })}
                              className="bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 cursor-pointer text-navy/60 max-w-[60px]"
                            >
                              <option value="">User</option>
                              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name.split(' ')[0]}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={subtask.status}
                            onChange={(e) => handleUpdateSubtask(subtask.id, { status: e.target.value })}
                            className={`px-2 py-1 rounded text-[9px] font-black uppercase border-none focus:ring-0 cursor-pointer ${STATUSES.find(s => s.value === subtask.status)?.bg} ${STATUSES.find(s => s.value === subtask.status)?.color}`}
                          >
                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="p-3">
                          <button onClick={() => handleRemoveSubtask(subtask.id)} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-red-500 transition-all"><XIcon /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {formData.subtasks.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-20">
                    <CheckCircleIcon />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sin subtareas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity / Comments */}
            <div className="space-y-6">
              <div className="flex border-b border-black/5">
                <button 
                  onClick={() => setActiveTab("comentarios")}
                  className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                    activeTab === "comentarios" ? "text-primary" : "text-navy/30 hover:text-navy"
                  }`}
                >
                  Actividad
                  {activeTab === "comentarios" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab("historial")}
                  className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                    activeTab === "historial" ? "text-primary" : "text-navy/30 hover:text-navy"
                  }`}
                >
                  Historial
                  {activeTab === "historial" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              </div>

              <div className="space-y-6">
                {activeTab === "comentarios" && (
                  <>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">TÚ</div>
                      <div className="flex-1 space-y-3">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Escribe un comentario..."
                          className="w-full p-4 bg-gray-50/50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-navy placeholder:text-navy/20 resize-none transition-all h-24"
                        />
                        <button 
                          onClick={handleAddComment}
                          className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                        >
                          Comentar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6 pt-4">
                      {formData.activity.filter(a => a.type === "comment").map((item) => (
                        <div key={item.id} className="flex gap-4 group">
                          <div className="w-8 h-8 rounded-full bg-navy/5 flex items-center justify-center text-navy/40 text-[10px] font-black overflow-hidden">
                            {profiles.find(p => p.full_name === item.user)?.avatar_url ? (
                              <img src={profiles.find(p => p.full_name === item.user)?.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              item.user[0]
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-navy">{item.user}</span>
                                <span className="text-[9px] font-medium text-navy/30">{new Date(item.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all">
                                <button onClick={() => handleStartEditComment(item.id, item.text)} className="p-1 hover:bg-black/5 rounded text-navy/40"><EditIcon /></button>
                                <button onClick={() => handleDeleteComment(item.id)} className="p-1 hover:bg-black/5 rounded text-red-400"><TrashIcon /></button>
                              </div>
                            </div>
                            
                            {editingCommentId === item.id ? (
                              <div className="space-y-2 mt-2">
                                <textarea
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  className="w-full p-3 bg-gray-50 border-black/5 rounded-xl text-sm text-navy focus:ring-primary/20 h-20"
                                />
                                <div className="flex gap-2">
                                  <button onClick={handleSaveEditComment} className="px-3 py-1.5 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Guardar</button>
                                  <button onClick={() => setEditingCommentId(null)} className="px-3 py-1.5 bg-black/5 text-navy/60 rounded-lg text-[9px] font-black uppercase tracking-widest">Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-navy/70 leading-relaxed">{item.text}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === "historial" && (
                  <div className="space-y-6">
                    {formData.activity.filter(a => a.type === "history").map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-navy/20">
                          <HistoryIcon />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-navy/60">
                            <span className="font-black text-navy">{item.user}</span> {item.text}
                          </p>
                          <span className="text-[9px] font-medium text-navy/30">{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    {formData.activity.filter(a => a.type === "history").length === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-20">
                        <HistoryIcon />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sin historial de cambios</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar (Right) */}
          <div className="w-[320px] bg-gray-50/30 overflow-y-auto p-8 space-y-8 no-scrollbar border-l border-black/5">
            {/* Status & Priority */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-navy/40">Estado</label>
                <div className="relative group">
                  <div className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all ${STATUSES.find(s => s.value === formData.status)?.bg} ${STATUSES.find(s => s.value === formData.status)?.color} border-transparent shadow-sm`}>
                    <AlertCircleIcon />
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="flex-1 appearance-none bg-transparent border-none p-0 text-xs font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                    >
                      {STATUSES.map(s => (
                        <option key={s.value} value={s.value} className="bg-white text-navy">{s.label.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-navy/40">Prioridad</label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                      className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                        formData.priority === p.value 
                          ? `${p.bg} ${p.color} border-transparent shadow-sm` 
                          : "bg-white border-black/5 text-navy/30 hover:border-black/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* People Section */}
            <div className="space-y-6 pt-6 border-t border-black/5">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-navy/40">
                  <UserIcon /> Responsable
                </label>
                <select
                  value={formData.assignee_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignee_id: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-black/5 rounded-xl text-xs font-black text-navy focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Sin asignar</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-navy/40">
                  <UsersIcon /> Informador
                </label>
                <select
                  value={formData.reporter_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, reporter_id: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-black/5 rounded-xl text-xs font-black text-navy focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Sin asignar</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Context */}
            <div className="space-y-6 pt-6 border-t border-black/5">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-navy/40">
                  <TargetIcon /> Objetivo Relacionado
                </label>
                <select
                  value={formData.goal_id}
                  onChange={(e) => {
                    const selectedObj = objectives.find(o => o.id === e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      goal_id: e.target.value,
                      // Auto-suggest team if objective is selected and team is empty
                      team: !prev.team && selectedObj ? selectedObj.team : prev.team
                    }));
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-black/5 rounded-xl text-xs font-black text-navy focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Ninguno</option>
                  {objectives.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-navy/40">
                  <UsersIcon /> Equipo / Producto
                </label>
                <div className="relative">
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-black/5 rounded-xl text-xs font-black text-navy focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    <option value="">Sin equipo</option>
                    {Array.from(new Set(objectives.map(o => o.team).filter(Boolean))).map(team => (
                      <option key={team} value={team}>{team.toUpperCase()}</option>
                    ))}
                    {!Array.from(new Set(objectives.map(o => o.team).filter(Boolean))).includes(formData.team) && formData.team && (
                      <option value={formData.team}>{formData.team.toUpperCase()}</option>
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                <input 
                  type="text"
                  value={formData.team}
                  onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value }))}
                  placeholder="O escribe un nuevo equipo..."
                  className="w-full px-4 py-2 bg-transparent border-b border-black/5 text-[10px] font-bold text-navy placeholder:text-navy/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-navy/40">
                  <CalendarIcon /> Fecha de vencimiento
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-black/5 rounded-xl text-xs font-black text-navy focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-4 pt-6 border-t border-black/5">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-navy/40">
                <TagIcon /> Etiquetas
              </label>
              <div className="flex flex-wrap gap-1.5">
                {formData.labels.map((label, idx) => (
                  <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-md">
                    {label}
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, labels: prev.labels.filter((_, i) => i !== idx) }))}
                      className="hover:text-navy transition-colors"
                    >
                      <XIcon />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1 flex-1 min-w-[80px]">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                    placeholder="Nueva..."
                    className="w-full text-[10px] font-black uppercase bg-transparent border-none focus:ring-0 p-0 text-navy placeholder:text-navy/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-black/5 bg-white flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-black/5 text-[10px] font-black text-navy/40 hover:bg-gray-50 transition-all uppercase tracking-widest"
          >
            DESCARTAR
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSave}
              disabled={!formData.title.trim() || submitting}
              className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[12px] font-black tracking-[0.15em] text-white shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-30 disabled:hover:translate-y-0`}
              style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  GUARDANDO...
                </>
              ) : (
                <>
                  <CheckCircleIcon />
                  {task ? 'GUARDAR CAMBIOS' : 'CREAR TAREA'}
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
