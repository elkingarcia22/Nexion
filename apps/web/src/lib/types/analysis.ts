// Estructura del análisis completo generado por Gemini IA

export interface DaySummaryAnalysis {
  // Datos generales del análisis
  id?: string;
  workspace_id?: string;
  date: string;
  created_at?: string;

  // Resumen ejecutivo
  summary_text?: string;

  // Informe detallado
  informe?: {
    resumen: string;
    hallazgos_clave?: {
      decisiones?: string[];
      riesgos?: string[];
      oportunidades?: string[];
    };
    proximos_pasos?: Array<{
      id: number;
      texto: string;
      prioridad: "critica" | "media" | "baja";
    }>;
  };

  // Tareas generadas por el análisis
  tasks?: Array<{
    id: number;
    title: string;
    description?: string;
    category?: string;
    priority: "alta" | "media" | "baja";
    source_file?: string;
  }>;

  // Insights y hallazgos
  insights?: Array<{
    id: number;
    title: string;
    description: string;
    category: "RETENCIÓN DE CLIENTES" | "OPTIMIZACIÓN UX" | "SATISFACCIÓN CLIENTE" | "EXPANSIÓN MERCADO" | "EFICIENCIA OPERATIVA" | string;
    source_file?: string;
    action?: string; // Botón "Convertir a tarea"
  }>;

  // Métricas del día
  metrics?: Array<{
    id: number;
    title: string;
    value: string | number;
    change: string; // e.g., "+15%", "-8%"
    status: "critica" | "normal";
    trend?: "up" | "down" | "stable";
    details?: string;
    action_label?: string;
    action_value?: string;
  }>;

  // Alertas detectadas
  alerts?: Array<{
    id: number;
    title: string;
    description: string;
    priority: "critica" | "media";
    date: string;
    action_date?: string;
    action_label?: string;
    source_file?: string;
  }>;

  // Feedback de usuarios/clientes
  feedback?: Array<{
    id: number;
    title: string;
    type: string; // e.g., "PRODUCTO", "LABORAL", "PERSONAL"
    content: string;
    priority: "critica" | "alta" | "media";
    source_file?: string;
  }>;

  // Metadatos
  source_count?: number;
  sources?: Array<{
    id: string;
    title: string;
    type: string;
    url?: string;
  }>;
}

// Estructura de respuesta del análisis
export interface AnalysisResponse {
  success: boolean;
  data?: DaySummaryAnalysis;
  error?: string;
}
