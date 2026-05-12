import { supabase } from "@/lib/supabase";

export interface SectionConfig {
  selected_products: string[];
  selected_teams: string[];
  filter_teams: boolean;
}

export interface AnalysisConfig {
  tasks: SectionConfig & { selected_responsibles?: string[]; custom_categories?: string[]; filter_active?: boolean };
  open: SectionConfig & { custom_categories: string[] };
  filter_responsibles: boolean;
  selected_responsibles: string[];
  active_modules?: string[];
  source_types?: string[];
}

export const SOURCE_TYPES = [
  { key: "slack", label: "Slack", description: "Canales de Slack" },
  { key: "google_docs", label: "Google Docs", description: "Documentos de Google" },
  { key: "sheets", label: "Google Sheets", description: "Hojas de cálculo" },
  { key: "pdf", label: "PDFs", description: "Documentos PDF" },
  { key: "notas_gemini", label: "Notas de Gemini", description: "Notas generadas por IA" },
] as const;

export const MODULES = [
  { key: "tasks", label: "Tareas", href: "/tasks" },
  { key: "objectives", label: "Objetivos", href: "/objectives" },
  { key: "metrics", label: "Métricas", href: "/metrics" },
  { key: "alerts", label: "Alertas", href: "/alerts" },
  { key: "insights", label: "Insights", href: "/insights" },
] as const;

export const ANALYSIS_TEAMS = [
  {
    key: "talent",
    label: "Talento",
    color: "#2ec6ff",
    products: [
      { key: "objetivos", label: "Objetivos" },
      { key: "encuestas", label: "Encuestas" },
      { key: "matriz_talento", label: "Matriz de Talento" },
      { key: "evaluacion_360", label: "Evaluación 360" },
    ],
  },
  {
    key: "learning",
    label: "Learning",
    color: "#f49e04",
    products: [
      { key: "aprendizaje", label: "Aprendizaje" },
      { key: "modo_ia_estudio", label: "Modo IA Estudio" },
      { key: "lms_creator", label: "LMS Creator" },
      { key: "planes_formacion", label: "Planes de Formación" },
      { key: "universidad_corporativa", label: "Universidad Corporativa" },
      { key: "certificados", label: "Certificados" },
      { key: "seguimientos", label: "Seguimientos" },
      { key: "metricas_empresa", label: "Métricas de Empresa" },
      { key: "assessments", label: "Assessments" },
      { key: "learning_map", label: "Learning Map" },
    ],
  },
  {
    key: "core",
    label: "Core",
    color: "#10b981",
    products: [
      { key: "gestion_usuarios", label: "Gestión de Usuarios" },
      { key: "organigrama", label: "Organigrama" },
      { key: "gestion_empresa", label: "Gestión de Empresa" },
      { key: "personalizacion", label: "Personalización" },
      { key: "roles_permisos", label: "Roles y Permisos" },
      { key: "comunicaciones", label: "Comunicaciones" },
      { key: "api", label: "API" },
    ],
  },
  {
    key: "transversal",
    label: "Transversal",
    color: "#8b5cf6",
    products: [
      { key: "app", label: "App" },
      { key: "core_ia", label: "Core IA" },
      { key: "chat_soporte", label: "Chat de Soporte" },
      { key: "planes_tareas", label: "Planes y Tareas" },
    ],
  },
  {
    key: "hiring",
    label: "Hiring",
    color: "#ec4899",
    products: [
      { key: "contratacion", label: "Hiring" },
    ],
  },
  {
    key: "ux",
    label: "UX Team",
    color: "#06b6d4",
    products: [],
  },
];

export const ALL_PRODUCTS = ANALYSIS_TEAMS.flatMap(t => t.products);

function defaultSection(): SectionConfig {
  return { selected_products: [], selected_teams: [], filter_teams: false };
}

function migrateConfig(raw: any): AnalysisConfig {
  const c = raw || {};
  const tasks = c.tasks || {};
  const open = c.open || {};
  return {
    tasks: {
      selected_products: tasks.selected_products || c.selected_products || [],
      selected_teams: tasks.selected_teams || c.selected_teams || [],
      filter_teams: tasks.filter_teams ?? c.filter_teams ?? false,
      selected_responsibles: tasks.selected_responsibles || c.selected_responsibles || [],
      custom_categories: tasks.custom_categories || c.custom_categories || [],
      filter_active: tasks.filter_active ?? c.filter_active ?? true,
    },
    open: {
      selected_products: open.selected_products || c.selected_products || [],
      selected_teams: open.selected_teams || c.selected_teams || [],
      filter_teams: open.filter_teams ?? c.filter_teams ?? false,
      custom_categories: open.custom_categories || c.custom_categories || [],
    },
    filter_responsibles: c.filter_responsibles ?? false,
    selected_responsibles: c.selected_responsibles || [],
    active_modules: c.active_modules || MODULES.map(m => m.key),
    source_types: c.source_types || SOURCE_TYPES.map(s => s.key),
  };
}

export async function getAnalysisConfig(workspaceId: string): Promise<{ success: boolean; data?: AnalysisConfig; error?: string }> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("analysis_config")
    .eq("id", workspaceId)
    .single();
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: migrateConfig(data?.analysis_config),
  };
}

export interface SaveAnalysisConfig {
  tasks?: Partial<SectionConfig & { selected_responsibles?: string[]; custom_categories?: string[]; filter_active?: boolean }>;
  open?: Partial<SectionConfig & { custom_categories: string[] }>;
  filter_responsibles?: boolean;
  selected_responsibles?: string[];
  active_modules?: string[];
  source_types?: string[];
}

export async function updateAnalysisConfig(workspaceId: string, config: SaveAnalysisConfig): Promise<{ success: boolean; error?: string }> {
  const existing = await getAnalysisConfig(workspaceId);
  const merged = existing.success && existing.data ? existing.data : migrateConfig({});

  const payload: AnalysisConfig = {
    tasks: { ...merged.tasks, ...config.tasks },
    open: { ...merged.open, ...config.open },
    filter_responsibles: config.filter_responsibles ?? merged.filter_responsibles,
    selected_responsibles: config.selected_responsibles ?? merged.selected_responsibles,
    active_modules: config.active_modules ?? merged.active_modules,
    source_types: config.source_types ?? merged.source_types,
  };

  const { error } = await supabase
    .from("workspaces")
    .update({ analysis_config: payload, updated_at: new Date().toISOString() })
    .eq("id", workspaceId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
