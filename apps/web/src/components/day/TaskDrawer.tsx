"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { createOrUpdateTask } from "@/lib/services/task-service";
import { DatePicker } from "../ui/DatePicker";

/* ─── Custom Components ─────────────────────────────────────── */

const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Selecciona...", 
  icon: Icon,
  className = ""
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string; label: string; icon?: any }[];
  placeholder?: string;
  icon?: any;
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

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#161927]/50 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:border-primary/40 transition-all text-left"
      >
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          {Icon && <Icon className="w-3 h-3 text-white/40" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <svg 
          className={`w-3 h-3 text-white/20 transition-transform ${isOpen ? "rotate-180" : ""}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[150] bg-[#161927] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-left transition-colors ${
                value === opt.value ? "bg-primary text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {opt.icon && <opt.icon className="w-3 h-3" />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

const SubtaskRow = ({ 
  subtask, 
  profiles, 
  PRIORITIES, 
  STATUSES, 
  onUpdate, 
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragged
}: any) => {
  const assigneeOptions = useMemo(() => {
    const base = profiles.map((p: any) => ({ value: p.id, label: p.full_name }));
    if (subtask.assignee_id && !profiles.find((p: any) => p.id === subtask.assignee_id)) {
      base.unshift({ value: subtask.assignee_id, label: subtask.assignee_name || "Jira User" });
    } else if (!subtask.assignee_id) {
      base.unshift({ value: "", label: "Sin asignar" });
    }
    return base;
  }, [profiles, subtask.assignee_id, subtask.assignee_name]);

  return (
    <tr 
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`group border-b border-white/[0.03] hover:bg-white/[0.02] transition-all ${isDragged ? "opacity-30 bg-card" : ""}`}
    >
      {/* Drag Handle */}
      <td className="p-2 w-8">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-white/20">
          <DragHandleIcon />
        </div>
      </td>

      {/* Subtask Main Info: Icon + Key + Title */}
      <td className="p-2">
        <div className="flex items-center gap-3">
          {/* Jira Subtask Icon (Blue branch icon style) */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4c9aff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 18V5l12 2-12 11Z"/><path d="M12 11h9"/><path d="M12 7h9"/><path d="M12 15h9"/></svg>
          
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black text-primary/60 tracking-tighter whitespace-nowrap">
              {subtask.key || `NEX-${String(subtask.id).slice(-3)}`}
            </span>
            <input
              type="text"
              value={subtask.title}
              onChange={(e) => onUpdate(subtask.id, { title: e.target.value })}
              placeholder="Título de la subtarea"
              className={`bg-transparent border-none focus:ring-0 p-0 text-[13px] font-medium transition-all w-full ${subtask.status.toLowerCase() === 'done' || subtask.status.toLowerCase() === 'finalizada' ? "text-white/20 line-through" : "text-white/80 hover:text-white"}`}
            />
          </div>
        </div>
      </td>

      {/* Jira Style Metadatos (Right Aligned) */}
      <td className="p-2 w-[350px]">
        <div className="flex items-center justify-end gap-5">
          {/* Priority Icon (Using defined PriorityIcon component) */}
          <div className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-colors cursor-pointer" title={`Prioridad: ${subtask.priority}`}>
            <PriorityIcon value={subtask.priority.toLowerCase()} />
          </div>

          {/* Assignee Avatar */}
          <div className="flex items-center justify-center group/avatar relative">
            <div 
              className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden shadow-sm cursor-help"
              title={subtask.assignee_name || "Sin asignar"}
            >
              {subtask.assignee_name ? (
                subtask.assignee_name.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase()
              ) : (
                <UserIcon className="w-3.5 h-3.5 opacity-30" />
              )}
            </div>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[9px] font-bold text-white rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
              {subtask.assignee_name || "Sin asignar"}
            </div>
          </div>

          {/* Status Badge */}
          <div className="min-w-[100px] flex justify-end">
            <button className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest border transition-all ${
              subtask.status.toLowerCase() === 'done' || subtask.status.toLowerCase() === 'finalizada' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
              subtask.status.toLowerCase() === 'in progress' || subtask.status.toLowerCase() === 'en curso' || subtask.status.toLowerCase() === 'in_progress' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
              'bg-white/5 border-white/10 text-white/40'
            }`}>
              {subtask.status}
            </button>
          </div>

          {/* Trash Action */}
          <button 
            onClick={() => onRemove(subtask.id)}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg text-white/10 hover:text-red-500 transition-all"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

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
  jiraTasks?: any[];
}

const PRIORITIES = [
  { value: "highest", label: "Highest", color: "text-rose-600", bg: "bg-rose-50" },
  { value: "high", label: "High", color: "text-rose-500", bg: "bg-rose-50/50" },
  { value: "medium", label: "Medium", color: "text-amber-500", bg: "bg-amber-500/10" },
  { value: "low", label: "Low", color: "text-blue-500", bg: "bg-primary/100/10" },
  { value: "lowest", label: "Lowest", color: "text-blue-400", bg: "bg-primary/100/50" },
];

const STATUSES = [
  { value: "backlog", label: "Backlog", color: "text-white/40", bg: "bg-[#161927]/5" },
  { value: "todo", label: "Tareas por hacer", color: "text-white/60", bg: "bg-[#161927]/5" },
  { value: "in_progress", label: "En curso", color: "text-blue-600", bg: "bg-primary/100/10" },
  { value: "blocked", label: "Blocked/On Hold", color: "text-red-500", bg: "bg-red-500/100/10" },
  { value: "review", label: "En aprobación", color: "text-amber-600", bg: "bg-amber-500/10" },
  { value: "done", label: "Finalizada", color: "text-green-600", bg: "bg-green-500/100/10" },
];

/* ─── Helpers ────────────────────────────────────────────────── */

const mapJiraStatus = (jiraStatus: string) => {
  if (!jiraStatus) return "todo";
  const s = jiraStatus.toLowerCase().replace(/\s+/g, "_");
  if (s === "to_do" || s === "todo" || s === "tareas_por_hacer" || s === "tareas_por_hacer") return "todo";
  if (s === "in_progress" || s === "en_curso") return "in_progress";
  if (s === "done" || s === "finalizada") return "done";
  if (s === "backlog") return "backlog";
  if (s === "review" || s === "en_aprobación") return "review";
  return "todo";
};

const mapJiraPriority = (jiraPriority: string) => {
  if (!jiraPriority) return "medium";
  const p = jiraPriority.toLowerCase();
  if (p === "highest") return "highest";
  if (p === "high") return "high";
  if (p === "medium") return "medium";
  if (p === "low") return "low";
  if (p === "lowest") return "lowest";
  return "medium";
};

const parseJiraDescription = (node: any): string => {
  if (!node) return "";
  if (typeof node === 'string') return node;
  
  // If it's a Jira ADF text node
  if (node.text) return node.text;
  
  // If it's a mention
  if (node.type === 'mention') return `@${node.attrs?.text || 'User'}`;
  
  // If it has content (ADF structure)
  if (node.content && Array.isArray(node.content)) {
    const content = node.content.map((child: any) => parseJiraDescription(child)).join("");
    
    // Add spacing for block elements
    if (['paragraph', 'heading', 'listItem', 'bulletList', 'orderedList'].includes(node.type)) {
      return content + "\n";
    }
    return content;
  }

  // Fallback for objects that might have a value property
  if (node.value && typeof node.value === 'string') return node.value;
  
  return "";
};

export function TaskDrawer({ 
  open, 
  onClose, 
  task, 
  onSave, 
  workspaceId,
  profiles: propsProfiles = [],
  objectives: propsObjectives = [],
  currentUserProfileId,
  jiraTasks = []
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
    linked_jira_key: "",
    linked_jira_subtask_id: "",
  });

  const [activeTab, setActiveTab] = useState<"comentarios" | "historial">("comentarios");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [profiles, setProfiles] = useState<any[]>(propsProfiles);
  const [objectives, setObjectives] = useState<any[]>(propsObjectives);
  const [submitting, setSubmitting] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<number | null>(null);

  useEffect(() => {
    console.log("TaskDrawer Received Task:", task);
    if (task) {
      console.log("Setting formData for task:", task.title);
      const isJira = task.origin === 'jira';
      
      // Parse Jira comments into activity format
      const jiraComments = (task.comments || []).map((c: any) => ({
        id: c.id,
        type: "comment",
        user: c.author?.displayName || "Jira User",
        text: parseJiraDescription(c.body),
        timestamp: c.created,
        isJira: true
      }));

      // Jira history is already parsed in page.tsx and passed in task.activity
      const combinedActivity = [...jiraComments, ...(task.activity || [])].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setFormData({
        title: task.title || "",
        description: parseJiraDescription(task.description),
        priority: isJira ? mapJiraPriority(task.priority) : (task.priority || "medium"),
        status: isJira ? mapJiraStatus(task.status) : (task.status || "pendiente"),
        assignee_id: task.assignee_id || "",
        reporter_id: task.reporter_id || "",
        due_date: task.due_date ? (task.due_date.includes('T') ? task.due_date.split('T')[0] : task.due_date) : "",
        team: task.team || "",
        labels: task.labels || [],
        subtasks: (task.subtasks || []).map((sub: any) => {
          if (sub.fields) { // Jira format
            return {
              id: sub.id,
              title: sub.fields.summary,
              status: mapJiraStatus(sub.fields.status.name),
              priority: mapJiraPriority(sub.fields.priority?.name || "medium"),
              assignee_id: sub.fields.assignee?.accountId || ""
            };
          }
          return sub;
        }),
        activity: combinedActivity,
        goal_id: task.goal_id || "",
        linked_jira_key: task.linked_jira_key || "",
        linked_jira_subtask_id: task.linked_jira_subtask_id || "",
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
        linked_jira_key: "",
        linked_jira_subtask_id: "",
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
    if (propsProfiles?.length > 0) setProfiles(propsProfiles);
  }, [propsProfiles]);

  useEffect(() => {
    if (propsObjectives?.length > 0) setObjectives(propsObjectives);
  }, [propsObjectives]);

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

  // Memoized options for people selects to avoid hook rule violations
  const assigneeOptions = useMemo(() => {
    const base = profiles.map(p => ({ value: p.id, label: p.full_name }));
    if (formData.assignee_id && !profiles.find(p => p.id === formData.assignee_id)) {
      base.unshift({ value: formData.assignee_id, label: task?.assignee?.displayName || "Jira Assignee" });
    } else if (!formData.assignee_id) {
      base.unshift({ value: "", label: "Sin asignar" });
    }
    return base;
  }, [profiles, formData.assignee_id, task]);

  const reporterOptions = useMemo(() => {
    const base = profiles.map(p => ({ value: p.id, label: p.full_name }));
    if (formData.reporter_id && !profiles.find(p => p.id === formData.reporter_id)) {
      base.unshift({ value: formData.reporter_id, label: task?.reporter?.displayName || "Jira Reporter" });
    } else if (!formData.reporter_id) {
      base.unshift({ value: "", label: "Sin asignar" });
    }
    return base;
  }, [profiles, formData.reporter_id, task]);

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

  if (!open || typeof document === 'undefined') return null;
  
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className={`fixed inset-y-0 right-0 z-[100] w-full max-w-[1400px] bg-[#0A0C14] shadow-2xl transition-transform duration-500 ease-out flex flex-col border-l border-white/5 ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#161927]/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-white/40">
              <LayoutIcon />
              <span>DÍA</span>
              <span>/</span>
              <span className="text-primary font-black">NEX-{task?.id?.slice(0, 4).toUpperCase() || "NUEVA"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-[#161927]/5 rounded-md text-white/40 transition-colors">
              <ShareIcon />
            </button>
            <div className="relative group/menu">
              <button className="p-2 hover:bg-[#161927]/5 rounded-md text-white/40 transition-colors">
                <MoreIcon />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-white/5 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-[120]">
                <button 
                  onClick={handleDeleteTask}
                  className="w-full px-4 py-2 text-left text-xs font-black text-red-500 hover:bg-red-500/100/10 transition-colors flex items-center gap-2"
                >
                  <TrashIcon /> ELIMINAR TAREA
                </button>
              </div>
            </div>
            <div className="w-[1px] h-4 bg-[#161927]/10 mx-1" />
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#161927]/5 rounded-md text-white/40 transition-colors"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content (Left) */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar border-r border-white/5">
            {/* Title Section */}
            <div className="space-y-4">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título de la tarea"
                className="w-full text-4xl font-black text-white placeholder:text-white/5 border-none focus:ring-0 p-0 bg-transparent leading-tight"
              />
              
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-[#161927]/5 hover:bg-[#161927]/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/60 transition-all">
                  <PlusIcon />
                  Añadir descripción
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Descripción</h3>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Escribe una descripción detallada..."
                className="w-full h-32 p-4 bg-[#161927]/50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-white placeholder:text-white/20 resize-none transition-all"
              />
            </div>

            {/* Subtasks */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Subtareas</h3>
                  {formData.subtasks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-1.5 bg-[#161927]/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500/100 transition-all duration-500" 
                          style={{ width: `${Math.round((formData.subtasks.filter(s => s.status === 'done').length / formData.subtasks.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-black text-white/40">
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
              
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-card shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="hidden">
                    <tr>
                      <th className="p-3 w-8"></th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-white/40">Subtarea</th>
                      <th className="p-3">Prioridad</th>
                      <th className="p-3">Responsable</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.subtasks.map((subtask) => (
                      <SubtaskRow
                        key={subtask.id}
                        subtask={subtask}
                        profiles={profiles}
                        PRIORITIES={PRIORITIES}
                        STATUSES={STATUSES}
                        onUpdate={handleUpdateSubtask}
                        onRemove={handleRemoveSubtask}
                        onDragStart={() => handleDragStart(subtask.id)}
                        onDragOver={(e: any) => handleDragOver(e, subtask.id)}
                        onDragEnd={handleDragEnd}
                        isDragged={draggedSubtaskId === subtask.id}
                      />
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
              <div className="flex border-b border-white/5">
                <button 
                  onClick={() => setActiveTab("comentarios")}
                  className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                    activeTab === "comentarios" ? "text-primary" : "text-white/30 hover:text-white"
                  }`}
                >
                  Actividad
                  {activeTab === "comentarios" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab("historial")}
                  className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                    activeTab === "historial" ? "text-primary" : "text-white/30 hover:text-white"
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
                          className="w-full p-4 bg-[#161927]/50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm text-white placeholder:text-white/20 resize-none transition-all h-24"
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
                          <div className="w-8 h-8 rounded-full bg-[#161927]/5 flex items-center justify-center text-white/40 text-[10px] font-black overflow-hidden">
                            {profiles.find(p => p.full_name === item.user)?.avatar_url ? (
                              <img src={profiles.find(p => p.full_name === item.user)?.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              item.user[0]
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-white">{item.user}</span>
                                {item.isJira && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 tracking-tighter">JIRA</span>
                                )}
                                <span className="text-[9px] font-medium text-white/30">{new Date(item.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all">
                                <button onClick={() => handleStartEditComment(item.id, item.text)} className="p-1 hover:bg-[#161927]/5 rounded text-white/40"><EditIcon /></button>
                                <button onClick={() => handleDeleteComment(item.id)} className="p-1 hover:bg-[#161927]/5 rounded text-red-400"><TrashIcon /></button>
                              </div>
                            </div>
                            
                            {editingCommentId === item.id ? (
                              <div className="space-y-2 mt-2">
                                <textarea
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  className="w-full p-3 bg-card border-white/5 rounded-xl text-sm text-white focus:ring-primary/20 h-20"
                                />
                                <div className="flex gap-2">
                                  <button onClick={handleSaveEditComment} className="px-3 py-1.5 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Guardar</button>
                                  <button onClick={() => setEditingCommentId(null)} className="px-3 py-1.5 bg-[#161927]/5 text-white/60 rounded-lg text-[9px] font-black uppercase tracking-widest">Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-white/70 leading-relaxed">{item.text}</p>
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
                        <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-white/20">
                          <HistoryIcon />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white/60">
                            <span className="font-black text-white">{item.user}</span> {item.text}
                          </p>
                          <span className="text-[9px] font-medium text-white/30">{new Date(item.timestamp).toLocaleString()}</span>
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
          <div className="w-[320px] bg-[#161927]/30 overflow-y-auto p-8 space-y-8 no-scrollbar border-l border-white/5">
            {/* Status & Priority */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Estado</label>
                <div className="relative group">
                  <div className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all ${STATUSES.find(s => s.value === formData.status)?.bg} ${STATUSES.find(s => s.value === formData.status)?.color} border-transparent shadow-sm`}>
                    <AlertCircleIcon />
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="flex-1 appearance-none bg-transparent border-none p-0 text-xs font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                    >
                      {STATUSES.map(s => (
                        <option key={s.value} value={s.value} className="bg-card text-white">{s.label.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Prioridad</label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                      className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                        formData.priority === p.value 
                          ? `${p.bg} ${p.color} border-transparent shadow-sm` 
                          : "bg-card border-white/5 text-white/30 hover:border-black/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* People Section */}
            <div className="space-y-6 pt-6 border-t border-white/5">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <UserIcon /> Responsable
                </label>
                <CustomSelect
                  value={formData.assignee_id}
                  onChange={(val) => setFormData(prev => ({ ...prev, assignee_id: val }))}
                  options={assigneeOptions}
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <UsersIcon /> Informador
                </label>
                <CustomSelect
                  value={formData.reporter_id}
                  onChange={(val) => setFormData(prev => ({ ...prev, reporter_id: val }))}
                  options={reporterOptions}
                />
              </div>
            </div>

            {/* Project Context */}
            <div className="space-y-6 pt-6 border-t border-white/5">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <TargetIcon /> Objetivo Relacionado
                </label>
                <CustomSelect
                  value={formData.goal_id}
                  onChange={(val) => {
                    const selectedObj = objectives.find(o => o.id === val);
                    setFormData(prev => ({ 
                      ...prev, 
                      goal_id: val,
                      team: !prev.team && selectedObj ? selectedObj.team : prev.team
                    }));
                  }}
                  options={[
                    { value: "", label: "Ninguno" },
                    ...objectives.map(obj => ({ value: obj.id, label: obj.title }))
                  ]}
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <UsersIcon /> Equipo / Producto
                </label>
                <CustomSelect
                  value={formData.team}
                  onChange={(val) => setFormData(prev => ({ ...prev, team: val }))}
                  options={[
                    { value: "", label: "Sin equipo" },
                    ...Array.from(new Set(objectives.map(o => o.team).filter(Boolean))).map(team => ({ 
                      value: String(team), 
                      label: String(team).toUpperCase() 
                    }))
                  ]}
                />
                <input 
                  type="text"
                  value={formData.team}
                  onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value }))}
                  placeholder="O escribe un nuevo equipo..."
                  className="w-full px-4 py-2 bg-transparent border-b border-white/5 text-[10px] font-bold text-white placeholder:text-white/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <CalendarIcon /> Fecha de Vencimiento
                </label>
                <DatePicker 
                  value={formData.due_date ? new Date(formData.due_date) : new Date()} 
                  onChange={(date) => setFormData(prev => ({ ...prev, due_date: date.toISOString().split('T')[0] }))}
                  allowFuture={true}
                />
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-4 pt-6 border-t border-white/5">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                <TagIcon /> Etiquetas
              </label>
              <div className="flex flex-wrap gap-1.5">
                {formData.labels.map((label, idx) => (
                  <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-md">
                    {label}
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, labels: prev.labels.filter((_, i) => i !== idx) }))}
                      className="hover:text-white transition-colors"
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
                    className="w-full text-[10px] font-black uppercase bg-transparent border-none focus:ring-0 p-0 text-white placeholder:text-white/20"
                  />
                </div>
              </div>
            </div>

            {/* Jira Linking Section */}
            <div className="space-y-6 pt-6 border-t border-white/5">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z"/></svg>
                Vínculo con Jira
              </label>
              
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Historia de Usuario (HU)</label>
                <CustomSelect
                  value={formData.linked_jira_key}
                  onChange={(val) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      linked_jira_key: val,
                      linked_jira_subtask_id: "" // Reset subtask when story changes
                    }));
                  }}
                  options={[
                    { value: "", label: "Sin vincular" },
                    ...jiraTasks.map(jt => ({ value: jt.external_key, label: `${jt.external_key}: ${jt.title}` }))
                  ]}
                />
              </div>

              {formData.linked_jira_key && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Le pega a la subtarea:</label>
                  <CustomSelect
                    value={formData.linked_jira_subtask_id}
                    onChange={(val) => setFormData(prev => ({ ...prev, linked_jira_subtask_id: val }))}
                    options={[
                      { value: "", label: "General (Toda la HU)" },
                      ...(jiraTasks.find(jt => jt.external_key === formData.linked_jira_key)?.subtasks || []).map((st: any) => ({ 
                        value: st.id, 
                        label: st.title 
                      }))
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/5 bg-card flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-white/5 text-[10px] font-black text-white/40 hover:bg-card transition-all uppercase tracking-widest"
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
      </div>
    </div>,
    document.body
  );
}
