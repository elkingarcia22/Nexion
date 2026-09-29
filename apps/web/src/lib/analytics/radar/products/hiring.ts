import type { RadarConfig } from "../config";

/** Hiring, as configured in the n8n "HIRING · Radar semanal de producto" workflow. */
export const HIRING_RADAR: RadarConfig = {
  productId: "hiring",
  productName: "Hiring",
  posthogProjectId: 202852,
  host: "talentos.ubitslearning.com",
  pathPrefix: "/recruitment",
  features: [
    { key: "candidate_review", label: "Revisión de candidatos", events: ["interaction_candidate_show", "interaction_candidate_download_cv", "interaction_candidate_add_feedback"] },
    { key: "vacancy_management", label: "Creación y edición de vacantes", events: ["job_created", "job_updated"] },
    { key: "cv_import", label: "Importación de CV", events: ["import_cv"] },
    { key: "candidate_movement", label: "Movimiento de candidatos", events: ["move_candidate"] },
    { key: "candidate_contact", label: "Intención de contacto", events: ["interaction_candidate_copy_email", "interaction_candidate_copy_phone"] },
    {
      key: "workflows",
      label: "Configuración de workflows",
      events: [
        "interaction_workflow_save_workflow",
        "interaction_workflow_create_stage",
        "interaction_workflow_edit_stage",
        "interaction_workflow_change_status",
      ],
    },
    {
      key: "serena_questions",
      label: "Preguntas de Serena",
      events: [
        "interaction_workflow_serenaQuestions_ai_questions_generated",
        "interaction_workflow_serenaQuestions_edit_question",
        "interaction_workflow_serenaQuestions_add_question",
        "interaction_workflow_serenaQuestions_delete_question",
      ],
    },
    { key: "serena_configuration", label: "Configuración de Serena", events: ["interaction_workflow_open_serena_interview_configuration"] },
  ],
  funnel: {
    label: "Creación de vacantes",
    steps: [
      { key: "basic_info", label: "Información básica", path: "/recruitment/job/create/basic-info" },
      { key: "configuration", label: "Configuración", path: "/recruitment/job/create/configuration" },
      { key: "add_members", label: "Añadir miembros", path: "/recruitment/job/create/add-members" },
      { key: "publish", label: "Publicación", path: "/recruitment/job/create/publish" },
    ],
    confirmEvent: "job_created",
    confirmLabel: "Vacante creada",
  },
  screenLabels: [
    { prefix: "/recruitment/job/create/basic-info", label: "Crear vacante · Información básica" },
    { prefix: "/recruitment/job/create/configuration", label: "Crear vacante · Configuración" },
    { prefix: "/recruitment/job/create/add-members", label: "Crear vacante · Miembros" },
    { prefix: "/recruitment/job/create/publish", label: "Crear vacante · Publicación" },
    { prefix: "/recruitment/job/detail", label: "Detalle de vacante" },
    { prefix: "/recruitment/job/dashboard", label: "Dashboard de vacantes" },
    { prefix: "/recruitment/workflows", label: "Workflows" },
    { prefix: "/recruitment", label: "Inicio de Hiring" },
  ],
  replayCategories: [
    { key: "rage_clicks_creacion", label: "Frustración en creación de vacante", priority: 3, pathFragment: "/recruitment/job/create/", minRageClicks: 5 },
    { key: "friccion_workflows", label: "Fricción en workflows", priority: 4, pathFragment: "/recruitment/workflows", minDeadClicks: 30 },
    { key: "friccion_detalle", label: "Fricción en revisión de vacantes", priority: 5, pathFragment: "/recruitment/job/detail", minDeadClicks: 50 },
    { key: "friccion_creacion", label: "Esfuerzo elevado en creación", priority: 7, pathFragment: "/recruitment/job/create/", minDeadClicks: 30 },
  ],
  vocabulary: { object: "vacante", objectPlural: "vacantes" },
};
