/**
 * What each product needs for its biweekly business pulse (BigQuery through the Ubits MCP, plus
 * Jira). Tables hold one row per company that has the product contracted, per month.
 */
export interface PulseMetric {
  key: string;
  label: string;
  /** Column of the usability table, summed over companies. */
  column: string;
}

export interface PulseConfig {
  productId: string;
  productName: string;
  /** Table in data-mart-cs.product_metrics. */
  table: string;
  /** SQL condition (on the usability table) meaning the company used the product that month. */
  usageCondition: string;
  usageLabel: string;
  /** How the NSM is defined for this product (from product_metrics.mcp_column_logic). */
  nsmCriterion: string;
  /** producto_categoria in arr_hubspot and arr_vs_spend_consolidated. */
  arrCategory: string;
  activity: PulseMetric[];
  /** Jira: words that tie a PTG ticket to this product, and words of other products that exclude it. */
  jiraTerms: string[];
  jiraExcludeTerms: string[];
}

export const PULSE_CONFIGS: Record<string, PulseConfig> = {
  hiring: {
    productId: "hiring",
    productName: "Hiring",
    table: "hiring_usability_history",
    usageCondition: "total_eventos_mes > 0",
    usageLabel: "Empresas con actividad",
    nsmCriterion: "2 o más semanas con actividad de Hiring (vacantes o candidatos) en el mes",
    arrCategory: "Hiring",
    activity: [
      { key: "vacancies_created", label: "Vacantes creadas", column: "vacantes_creadas_mes" },
      { key: "candidates_loaded", label: "Candidatos cargados", column: "candidatos_cargados_mes" },
      { key: "candidates_moved", label: "Movimientos de candidatos", column: "candidatos_movidos_mes" },
      { key: "serena_interviews", label: "Entrevistas con Serena", column: "entrevistas_serena_mes" },
      { key: "serena_completed", label: "Entrevistas Serena completadas", column: "entrevistas_completadas_mes" },
    ],
    jiraTerms: ["hiring", "vacante", "reclutamiento", "candidato", "serena"],
    jiraExcludeTerms: [],
  },
  objetivos: {
    productId: "objetivos",
    productName: "Objetivos",
    table: "goals_usability_history",
    usageCondition: "usuarios_con_objetivos_unicos_mes > 0",
    usageLabel: "Empresas con usuarios en Objetivos",
    nsmCriterion: "15 o más usuarios únicos con objetivos en los últimos 12 meses",
    arrCategory: "Objetivos",
    activity: [
      { key: "users_with_goals", label: "Usuarios con objetivos", column: "usuarios_con_objetivos_unicos_mes" },
      { key: "new_cycles", label: "Ciclos nuevos", column: "ciclos_nuevos_mes" },
    ],
    jiraTerms: ["objetivo", "okr", "ciclo", "desempeño", "cargue de objetivos", "carga masiva"],
    jiraExcludeTerms: ["encuesta", "matriz", "360", "hiring"],
  },
  "matriz-talento": {
    productId: "matriz-talento",
    productName: "Matriz de talento",
    table: "matrix_usability_history",
    usageCondition: "matrices_creadas_mes > 0",
    usageLabel: "Empresas que crearon matrices",
    nsmCriterion: "al menos 1 matriz creada en los últimos 12 meses",
    arrCategory: "Matrix",
    activity: [{ key: "matrices_created", label: "Matrices creadas", column: "matrices_creadas_mes" }],
    jiraTerms: ["matriz", "matrix", "9 box", "9-box", "nine box"],
    jiraExcludeTerms: [],
  },
  encuestas: {
    productId: "encuestas",
    productName: "Encuestas",
    table: "survey_usability_history",
    usageCondition: "encuestas_creadas_mes > 0 OR usuarios_con_encuestas_unicas_mes > 0",
    usageLabel: "Empresas con encuestas activas",
    nsmCriterion: "30 o más usuarios únicos con encuesta en los últimos 6 meses",
    arrCategory: "Encuestas",
    activity: [
      { key: "surveys_created", label: "Encuestas creadas", column: "encuestas_creadas_mes" },
      { key: "users_assigned", label: "Usuarios asignados", column: "usuarios_asignados_mes" },
      { key: "users_with_surveys", label: "Usuarios con encuestas", column: "usuarios_con_encuestas_unicas_mes" },
    ],
    jiraTerms: ["encuesta", "survey", "clima", "nom035", "nom 035"],
    jiraExcludeTerms: [],
  },
  "evaluacion-360": {
    productId: "evaluacion-360",
    productName: "Evaluación 360",
    table: "axs_360_usability_history",
    usageCondition: "axs_creadas_mes > 0 OR usuarios_con_axs_360_enviada_unicos_mes > 0",
    usageLabel: "Empresas con evaluaciones 360",
    nsmCriterion: "15 o más usuarios únicos con evaluación 360 enviada en los últimos 12 meses",
    arrCategory: "360",
    activity: [
      { key: "evaluations_created", label: "Evaluaciones 360 creadas", column: "axs_creadas_mes" },
      { key: "users_sent", label: "Usuarios con evaluación enviada", column: "usuarios_con_axs_360_enviada_unicos_mes" },
      { key: "users_assigned", label: "Usuarios con 360 asignada", column: "usuarios_con_axs_360_unicos_mes" },
    ],
    jiraTerms: ["360", "evaluación de desempeño", "evaluacion de desempeño", "retroalimentación"],
    jiraExcludeTerms: [],
  },
};
