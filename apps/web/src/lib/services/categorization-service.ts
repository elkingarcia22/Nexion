import { ANALYSIS_TEAMS } from "./analysis-config-service";

export const CATEGORY_TO_TEAM: Record<string, string> = {
  'talent': 'talent',
  'hiring': 'hiring',
  'ux': 'ux',
  'learn': 'learning',
  'learning': 'learning',
  'core ai': 'transversal',
  'core_ia': 'transversal',
  'operations': 'transversal',
  'other': 'otras',
};

const PRODUCT_KEYWORDS: Record<string, string[]> = {
  objetivos: ['objetivo', 'okr', 'key result', 'meta estratégica', 'goal', 'resultado clave'],
  encuestas: ['encuesta', 'survey', 'pulse', 'engagement', 'clima'],
  matriz_talento: ['matriz de talento', '9box', 'nine box', 'matriz talento', 'talent matrix'],
  evaluacion_360: ['evaluación 360', 'feedback 360', 'evaluacion 360', 'assessment 360', 'retroalimentación 360'],
  aprendizaje: ['aprendizaje', 'curso', 'training', 'capacitación', 'formación', 'entrenamiento'],
  modo_ia_estudio: ['modo ia estudio', 'modo ia', 'ia estudio', 'study ia'],
  lms_creator: ['lms creator', 'lms', 'creación de curso', 'curso online'],
  planes_formacion: ['plan de formación', 'plan formativo', 'itinerario', 'ruta aprendizaje'],
  universidad_corporativa: ['universidad corporativa', 'corp university', 'campus virtual'],
  certificados: ['certificado', 'certification', 'diploma', 'acreditación'],
  seguimientos: ['seguimiento', 'seguimientos', 'progreso', 'avance', 'tracking'],
  metricas_empresa: ['métrica de empresa', 'métricas empresa', 'business metrics', 'kpi empresa'],
  assessments: ['assessment', 'evaluación de competencias', 'skill assessment'],
  learning_map: ['learning map', 'mapa aprendizaje', 'mapa de aprendizaje'],
  gestion_usuarios: ['gestión de usuarios', 'user management', 'usuarios', 'alta de usuario'],
  organigrama: ['organigrama', 'org chart', 'estructura'],
  gestion_empresa: ['gestión de empresa', 'company settings', 'configuración empresa'],
  personalizacion: ['personalización', 'customization', 'branding', 'personalizar'],
  roles_permisos: ['rol', 'permiso', 'roles y permisos', 'permission', 'role', 'acceso'],
  comunicaciones: ['comunicación', 'comunicaciones', 'notificación', 'email', 'aviso'],
  api: ['api', 'integración', 'webhook', 'api key', 'endpoint'],
  app: ['app', 'mobile', 'móvil', 'aplicación móvil', 'app ubit'],
  core_ia: ['core ia', 'core ai', 'inteligencia artificial', 'modelo ia', 'gemini', 'ia'],
  chat_soporte: ['chat soporte', 'chat de soporte', 'support chat', 'ayuda'],
  planes_tareas: ['plan', 'tarea', 'planes y tareas', 'task', 'project plan'],
  contratacion: ['contratación', 'hiring', 'reclutamiento', 'vacante', 'candidate', 'entrevista'],
};

export const categorizeProduct = (item: any, teamKey: string): string | null => {
  const team = ANALYSIS_TEAMS.find(t => t.key === teamKey);
  if (!team || team.products.length === 0) return null;

  const safeStr = (v: any) => typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v || '');
  const title = safeStr(item.title);
  const desc = safeStr(item.description);
  const content = safeStr(item.content);
  const text = `${title} ${desc} ${content}`.toLowerCase();

  for (const product of team.products) {
    const keywords = PRODUCT_KEYWORDS[product.key];
    if (keywords && keywords.some(kw => text.includes(kw))) {
      console.log(`  📦 categorizeProduct → match: "${product.key}" (kw: "${keywords.find(kw => text.includes(kw))}" in "${title.substring(0, 40)}")`);
      return product.key;
    }
  }

  console.log(`  📦 categorizeProduct → no match for team "${teamKey}" item "${title.substring(0, 40)}"`);
  return null;
};

export const PRODUCT_TO_KEYWORDS = PRODUCT_KEYWORDS;

export const deriveProductFromItem = (item: any): string | null => {
  const rawCategory = String(item.category || item.team || "").toLowerCase().trim();
  const teamKey = CATEGORY_TO_TEAM[rawCategory] || null;
  if (!teamKey) {
    console.log(`  📦 deriveProductFromItem → no team for category "${rawCategory}" on "${String(item.title || '').substring(0, 40)}"`);
    return null;
  }
  const product = categorizeProduct(item, teamKey);
  console.log(`  📦 deriveProductFromItem → cat:"${rawCategory}" team:"${teamKey}" product:${product} for "${String(item.title || '').substring(0, 50)}"`);
  return product;
};

export const categorizeItem = (item: any, objectives: any[] = [], jiraTasks: any[] = []) => {
  const rawCategory = String(item.category || item.team || "").toLowerCase().trim();
  if (rawCategory && CATEGORY_TO_TEAM[rawCategory]) return CATEGORY_TO_TEAM[rawCategory];
  if (rawCategory) {
    for (const [key, val] of Object.entries(CATEGORY_TO_TEAM)) {
      if (rawCategory.includes(key)) return val;
    }
  }

  const title = String(item.title || "").toLowerCase();
  const content = String(item.description || item.content || item.comentario || "").toLowerCase();
  const combinedText = `${title} ${content}`.toLowerCase();

  const linkedGoal = objectives.find(o => o.id === item.goal_id);
  const goalContext = linkedGoal ? `${linkedGoal.title} ${linkedGoal.team}`.toLowerCase() : "";

  const linkedJira = jiraTasks.find(j => j.external_key === item.linked_jira_key);
  const jiraContext = linkedJira ? `${linkedJira.title} ${linkedJira.team}`.toLowerCase() : "";

  const fullContext = `${combinedText} ${goalContext} ${jiraContext}`;

  if ((fullContext.includes("talent") || fullContext.includes("culture") || fullContext.includes("growth") ||
       fullContext.includes("nom 035") || fullContext.includes("nom-035")) &&
      !fullContext.includes("hiring") && !fullContext.includes("utu") && !fullContext.includes("talent-os") &&
      !fullContext.includes("core ai") && !fullContext.includes("core_ia") &&
      !fullContext.includes("learning") && !fullContext.includes("formación") &&
      !fullContext.includes("assessment") && !fullContext.includes("training") &&
      !fullContext.includes("aprendizaje") && !fullContext.includes("certificados"))
    return 'talent';

  if (fullContext.includes("hiring") || fullContext.includes("utu") || fullContext.includes("talent-os") || fullContext.includes("recruit") ||
      fullContext.includes("contratación") || fullContext.includes("reclutamiento")) return 'hiring';

  if (fullContext.includes("ux") || fullContext.includes("design") || fullContext.includes("diseño") || fullContext.includes("triada") ||
      fullContext.includes("ux_team") || fullContext.includes("ux team")) return 'ux';

  if (fullContext.includes("learning") || fullContext.includes("learn") || fullContext.includes("formación") ||
      fullContext.includes("assessment") || fullContext.includes("training") || fullContext.includes("aprendizaje") ||
      fullContext.includes("certificados") || fullContext.includes("lms_creator") || fullContext.includes("learning_map") ||
      fullContext.includes("seguimientos") || fullContext.includes("universidad corporativa") ||
      fullContext.includes("planes de formación") || fullContext.includes("modo ia estudio"))
    return 'learning';

  if ((fullContext.includes("core") || fullContext.includes("usuarios") || fullContext.includes("organigrama") ||
       fullContext.includes("roles") || fullContext.includes("permisos") || fullContext.includes("personalizacion") ||
       fullContext.includes("gestion_empresa") || fullContext.includes("gestion de usuarios")) &&
      !fullContext.includes("core ai") && !fullContext.includes("core_ia") && !fullContext.includes("core ia"))
    return 'core';

  if (fullContext.includes("core ai") || fullContext.includes("core_ia") || fullContext.includes("core ia") ||
      fullContext.includes("transversal") || fullContext.includes("chat_soporte") || fullContext.includes("chat de soporte") ||
      fullContext.includes("planes_tareas") || fullContext.includes("planes y tareas") ||
      fullContext.includes("app ubit") || fullContext.includes("app móvil"))
    return 'transversal';

  return 'otras';
};

export const getResponsable = (item: any): string => {
  return item.responsible ||
         item.assignee_name ||
         item.metadata?.responsable ||
         item.assignee?.displayName ||
         "Sin asignar";
};

export const isUserMatch = (item: any, userName: string): boolean => {
  if (userName === "Usuario" || userName === "Sin asignar") return false;
  const responsable = getResponsable(item).toLowerCase().trim();
  const name = userName.toLowerCase().trim();
  if (responsable === name) return true;
  if (responsable.includes(name)) return true;
  const firstName = name.split(' ')[0];
  if (firstName && responsable.includes(firstName)) return true;
  return false;
};
