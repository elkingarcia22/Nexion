import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envRaw = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('='))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STOP_WORDS = ['para', 'esta', 'con', 'del', 'las', 'los', 'una', 'uno', 'que', 'por', 'como', 'entre', 'tiene', 'este', 'todo', 'más', 'pero', 'sus'];

const CATEGORY_TO_TEAM = {
  'talent': 'talent', 'hiring': 'hiring', 'ux': 'ux',
  'learn': 'learning', 'learning': 'learning',
  'core ai': 'operaciones', 'core_ia': 'operaciones',
  'operations': 'operaciones', 'other': 'otras',
};

const PRODUCT_KEYWORDS = {
  objetivos: ['objetivo', 'okr', 'key result', 'goal', 'resultado clave'],
  encuestas: ['encuesta', 'survey', 'pulse', 'engagement', 'clima'],
  matriz_talento: ['matriz de talento', '9box', 'matriz talento', 'talent matrix'],
  evaluacion_360: ['evaluación 360', 'feedback 360', 'evaluacion 360', 'assessment 360'],
  aprendizaje: ['aprendizaje', 'curso', 'training', 'capacitación', 'formación'],
  lms_creator: ['lms creator', 'lms', 'creación de curso', 'curso online'],
  planes_formacion: ['plan de formación', 'itinerario', 'ruta aprendizaje'],
  universidad_corporativa: ['universidad corporativa', 'campus virtual'],
  certificados: ['certificado', 'certification', 'diploma', 'acreditación'],
  seguimientos: ['seguimiento', 'progreso', 'avance', 'tracking'],
  metricas_empresa: ['métrica de empresa', 'métricas empresa', 'business metrics'],
  assessments: ['assessment', 'evaluación de competencias', 'skill assessment'],
  learning_map: ['learning map', 'mapa aprendizaje'],
  gestion_usuarios: ['gestión de usuarios', 'user management', 'usuarios'],
  organigrama: ['organigrama', 'org chart', 'estructura'],
  personalizacion: ['personalización', 'customization', 'branding', 'personalizar'],
  roles_permisos: ['rol', 'permiso', 'roles y permisos', 'permission', 'acceso'],
  comunicaciones: ['comunicación', 'notificación', 'email', 'aviso'],
  api: ['api', 'integración', 'webhook', 'endpoint'],
  app: ['app', 'mobile', 'móvil', 'aplicación móvil'],
  core_ia: ['core ia', 'core ai', 'inteligencia artificial', 'modelo ia', 'gemini'],
  chat_soporte: ['chat soporte', 'chat de soporte', 'support chat', 'ayuda'],
  planes_tareas: ['plan', 'tarea', 'planes y tareas', 'task', 'project plan'],
  reclutamiento: ['contratación', 'hiring', 'reclutamiento', 'vacante', 'candidate', 'entrevista'],
};

const ANALYSIS_TEAMS = [
  { key: "talent", label: "Talento", products: [{ key: "objetivos" }, { key: "encuestas" }, { key: "matriz_talento" }, { key: "evaluacion_360" }] },
  { key: "learning", label: "Learning", products: [{ key: "aprendizaje" }, { key: "lms_creator" }, { key: "certificados" }, { key: "assessments" }, { key: "learning_map" }] },
  { key: "core", label: "Core", products: [{ key: "gestion_usuarios" }, { key: "organigrama" }, { key: "personalizacion" }, { key: "roles_permisos" }, { key: "comunicaciones" }, { key: "api" }] },
  { key: "operaciones", label: "Operaciones", products: [{ key: "app" }, { key: "core_ia" }, { key: "chat_soporte" }, { key: "planes_tareas" }] },
  { key: "hiring", label: "Hiring", products: [{ key: "reclutamiento" }] },
  { key: "ux", label: "UX Team", products: [] },
];

function buildKeywords(text) {
  return (text || '').toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 3 && !STOP_WORDS.includes(w));
}

function categorizeItem(item, objectives = [], jiraTasks = []) {
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

  if (fullContext.includes("hiring") || fullContext.includes("utu") || fullContext.includes("talent-os") ||
      fullContext.includes("recruit") || fullContext.includes("contratación") || fullContext.includes("reclutamiento"))
    return 'hiring';

  if (fullContext.includes("ux") || fullContext.includes("design") || fullContext.includes("diseño") ||
      fullContext.includes("triada") || fullContext.includes("ux_team") || fullContext.includes("ux team"))
    return 'ux';

  if (fullContext.includes("learning") || fullContext.includes("learn") || fullContext.includes("formación") ||
      fullContext.includes("assessment") || fullContext.includes("training") || fullContext.includes("aprendizaje") ||
      fullContext.includes("certificados") || fullContext.includes("lms_creator") || fullContext.includes("learning_map") ||
      fullContext.includes("seguimientos") || fullContext.includes("universidad corporativa") ||
      fullContext.includes("planes de formación") || fullContext.includes("modo ia estudio"))
    return 'learning';

  if ((fullContext.includes("core") || fullContext.includes("usuarios") || fullContext.includes("organigrama") ||
       fullContext.includes("roles") || fullContext.includes("permisos") || fullContext.includes("personalizacion") ||
       fullContext.includes("gestion_empresa") || fullContext.includes("gestion de usuarios")) &&
      !fullContext.includes("core ai") && !fullContext.includes("core_ia"))
    return 'core';

if (fullContext.includes("core ai") || fullContext.includes("core_ia") || fullContext.includes("core ia") ||
       fullContext.includes("operaciones") || fullContext.includes("chat_soporte") || fullContext.includes("chat de soporte") ||
       fullContext.includes("planes_tareas") || fullContext.includes("planes y tareas") ||
       fullContext.includes("app ubit") || fullContext.includes("app móvil"))
     return 'operaciones';

  return 'otras';
}

function categorizeProduct(item, teamKey) {
  const team = ANALYSIS_TEAMS.find(t => t.key === teamKey);
  if (!team || team.products.length === 0) return null;
  const safeStr = (v) => typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v || '');
  const title = safeStr(item.title);
  const desc = safeStr(item.description);
  const content = safeStr(item.content);
  const text = `${title} ${desc} ${content}`.toLowerCase();
  for (const product of team.products) {
    const keywords = PRODUCT_KEYWORDS[product.key];
    if (keywords && keywords.some(kw => text.includes(kw))) return product.key;
  }
  return null;
}

function deriveProductFromItem(item) {
  const rawCategory = String(item.category || item.team || "").toLowerCase().trim();
  const teamKey = CATEGORY_TO_TEAM[rawCategory] || null;
  if (!teamKey) return null;
  return categorizeProduct(item, teamKey);
}

function matchObjective(entity, objs) {
  if (!objs || objs.length === 0) return null;
  const entityTitle = (entity.title || '').toLowerCase();
  const entityCategory = (entity.category || '').toLowerCase();
  const entityKeywords = buildKeywords(entityTitle);
  if (entityKeywords.length === 0 && !entityCategory) return null;
  let bestMatch = null, bestScore = 0;
  for (const obj of objs) {
    let score = 0;
    const objTitle = (obj.title || '').toLowerCase();
    const objTeam = (obj.team || '').toLowerCase();
    if (entityTitle.includes(objTitle) || objTitle.includes(entityTitle)) score += 80;
    else {
      const objKeywords = buildKeywords(objTitle);
      score += objKeywords.filter(kw => entityKeywords.includes(kw)).length * 15;
    }
    if (entityCategory && objTeam && (entityCategory === objTeam || objTeam.includes(entityCategory) || entityCategory.includes(objTeam))) {
      score = Math.round(score * 1.5);
    }
    if (score > bestScore) { bestScore = score; bestMatch = obj.id; }
  }
  return bestScore >= 60 ? bestMatch : null;
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  PRUEBA COMPLETA DEL PIPELINE DE ANÁLISIS');
  console.log('═══════════════════════════════════════════════\n');

  const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('*').limit(1);
  if (wsErr || !workspaces || workspaces.length === 0) {
    console.error('No workspace found:', wsErr?.message || 'no workspaces');
    process.exit(1);
  }

  const ws = workspaces[0];
  const workspaceId = ws.id;
  const userName = ws.name || "Usuario";
  console.log(`📋 Workspace: ${ws.name || ws.id}`);
  console.log(`📋 ID: ${workspaceId}\n`);

  const today = new Date().toISOString().split('T')[0];

  const { data: sources } = await supabase
    .from('sources')
    .select('name, type, content')
    .eq('workspace_id', workspaceId)
    .gte('source_date', today)
    .limit(20);
  console.log(`📥 Fuentes para hoy: ${sources?.length || 0}\n`);

  const { data: objectives } = await supabase
    .from('workspace_objectives')
    .select('id, title, team, key_result')
    .eq('workspace_id', workspaceId);
  console.log(`🎯 Objetivos disponibles: ${objectives?.length || 0}`);
  if (objectives && objectives.length > 0) {
    objectives.forEach(o => console.log(`   [${o.id?.substring(0,8)}] "${o.title}" (${o.team})`));
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  PRUEBA 1: categorizeItem() con casos variados');
  console.log('═══════════════════════════════════════════════');

  const testCases = [
    { title: "Implementar nuevo módulo de encuestas de clima laboral", category: "Talent", description: "encuesta de clima y engagement" },
    { title: "Revisar contratación del nuevo desarrollador UX", category: "Hiring", description: "proceso de reclutamiento" },
    { title: "Diseñar nueva interfaz de usuario para el dashboard", category: "UX", description: "diseño de experiencia de usuario" },
    { title: "Crear curso de capacitación en liderazgo", category: "Learn", description: "formación para managers" },
    { title: "Configurar roles y permisos para administradores", category: "Core AI", description: "gestión de accesos" },
    { title: "Optimizar el chat de soporte al cliente", category: "Operations", description: "chat de soporte automatizado" },
    { title: "Evaluar plataforma de aprendizaje corporativo", category: "Learn", description: "learning management system" },
    { title: "Actualizar organigrama con nuevos puestos", category: "Core AI", description: "estructura organizacional" },
    { title: "Preparar assessment de competencias técnicas", category: "Learn", description: "evaluación de competencias" },
    { title: "Resolver incidencia de usuarios con problemas de acceso", category: "Operations", description: "soporte a usuarios app" },
    { title: "Revisión de métricas de engagement trimestrales", category: "Talent", description: "métricas de empresa" },
    { title: "Configurar API para integración con sistema de nómina", category: "Operations", description: "integración api" },
  ];

  for (const tc of testCases) {
    const result = categorizeItem(tc);
    const product = deriveProductFromItem(tc);
    const teamLabel = ANALYSIS_TEAMS.find(t => t.key === result)?.label || result;
    const expected = CATEGORY_TO_TEAM[(tc.category || '').toLowerCase()] || '?';
    const ok = result === expected || (expected === 'operaciones' && (result === 'core' || result === 'operaciones'));
    console.log(`  ${ok ? '✓' : '✗'} ${teamLabel.padEnd(15)} | ${(product || '—').padEnd(20)} | ${tc.title.substring(0, 50)}${!ok ? ` (esperado: ${expected})` : ''}`);
  }

  if (sources && sources.length > 0) {
    console.log('\n═══════════════════════════════════════════════');
    console.log('  PRUEBA 2: categorizeItem() con fuentes reales');
    console.log('═══════════════════════════════════════════════');
    for (const src of sources.slice(0, 5)) {
      const testItem = { title: src.name || 'Sin título', description: src.content?.substring(0, 200) };
      const team = categorizeItem(testItem);
      const teamLabel = ANALYSIS_TEAMS.find(t => t.key === team)?.label || team;
      const product = deriveProductFromItem(testItem);
      console.log(`  📁 ${teamLabel.padEnd(15)} | ${(product || '—').padEnd(20)} | ${(testItem.title || '').substring(0, 50)}`);
    }
  }

  if (objectives && objectives.length > 0) {
    console.log('\n═══════════════════════════════════════════════');
    console.log('  PRUEBA 3: matchObjective() re-linking semántico');
    console.log('═══════════════════════════════════════════════');

    for (const tc of testCases.slice(0, 8)) {
      const match = matchObjective(tc, objectives);
      const ok = match ? '✓' : '—';
      const obj = match ? objectives.find(o => o.id === match) : null;
      console.log(`  ${ok} "${tc.title.substring(0, 45)}"`);
      if (obj) console.log(`     → ${obj.title.substring(0, 60)} [${match.substring(0, 8)}]`);
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  PRUEBA 4: Pipeline completo (datos simulados)');
  console.log('═══════════════════════════════════════════════\n');

  const mockAnalysis = {
    summary: "Análisis del día con múltiples hallazgos",
    tasks: [
      { title: "Actualizar encuesta de clima laboral para Q3", priority: "alta", category: "Talent", responsible: userName },
      { title: "Corregir error en módulo de evaluación 360", priority: "alta", category: "Talent", responsible: userName },
      { title: "Programar entrevistas para nuevo reclutamiento", priority: "media", category: "Hiring", responsible: "María García" },
      { title: "Re-diseñar flujo de onboarding de usuarios", priority: "media", category: "UX", responsible: "Carlos López" },
      { title: "Crear curso de capacitación sobre liderazgo", priority: "baja", category: "Learn", responsible: userName },
      { title: "Configurar roles y permisos en nueva sede", priority: "alta", category: "Core AI", responsible: "IT Team" },
      { title: "Optimizar chat de soporte con respuestas automáticas", priority: "media", category: "Operations", responsible: "Soporte" },
      { title: "Preparar assessment de competencias para equipo comercial", priority: "baja", category: "Learn", responsible: userName },
      { title: "Actualizar matriz de talento con resultados del trimestre", priority: "alta", category: "Talent", responsible: "Ana Martínez" },
      { title: "Resolver incidencia crítica en app móvil", priority: "critica", category: "Operations", responsible: "Dev Team" },
    ],
    insights: [
      { title: "La encuesta de clima muestra mejora del 12% en satisfacción", description: "Resultados preliminares positivos", category: "Talent" },
      { title: "Nuevo LMS Creator reduce 40% tiempo de creación de cursos", description: "Equipos reportan mayor eficiencia", category: "Learn" },
    ],
    metrics: [
      { title: "Satisfacción general", value: "82%", change: "+12%", status: "alta", category: "Talent" },
      { title: "Tiempo creación cursos", value: "3 días", change: "-40%", status: "alta", category: "Learn" },
    ],
    alerts: [
      { title: "Vencimiento de certificaciones de seguridad este mes", description: "3 certificaciones vencen pronto", priority: "alta", category: "Operations" },
      { title: "Baja adherencia a evaluación 360 (solo 45%)", description: "Urge campaña de comunicación", priority: "critica", category: "Talent" },
    ],
    feedback: [
      { title: "Mejorar interfaz de reportes", content: "Usuarios encuentran confusa la navegación", type: "producto", category: "UX" },
      { title: "Chat de soporte ha mejorado la atención", content: "Comentario positivo de varios usuarios", type: "producto", category: "Operations" },
    ],
  };

  for (const type of ['tasks', 'insights', 'alerts', 'feedback']) {
    if (mockAnalysis[type]) {
      for (const entity of mockAnalysis[type]) {
        entity.product = deriveProductFromItem(entity);
        const match = (type !== 'feedback' && type !== 'metrics')
          ? matchObjective(entity, objectives || []) : null;
        if (match) entity.goal_id = match;
      }
    }
  }

  const allEntities = [
    ...mockAnalysis.tasks.map(e => ({ ...e, _type: 'TASK' })),
    ...mockAnalysis.insights.map(e => ({ ...e, _type: 'INSIGHT' })),
    ...mockAnalysis.metrics.map(e => ({ ...e, _type: 'METRIC' })),
    ...mockAnalysis.alerts.map(e => ({ ...e, _type: 'ALERT' })),
    ...mockAnalysis.feedback.map(e => ({ ...e, _type: 'FEEDBACK' })),
  ];

  console.log(`📦 Total entidades: ${allEntities.length}`);
  console.log(`   Tareas: ${mockAnalysis.tasks.length}`);
  console.log(`   Insights: ${mockAnalysis.insights.length}`);
  console.log(`   Métricas: ${mockAnalysis.metrics.length}`);
  console.log(`   Alertas: ${mockAnalysis.alerts.length}`);
  console.log(`   Feedback: ${mockAnalysis.feedback.length}\n`);

  console.log('  ' + '─'.repeat(55));
  console.log('  📊 DISTRIBUCIÓN POR CATEGORÍA (cómo agrupa):');
  const catGroups = {};
  for (const e of allEntities) {
    const cat = e.category || 'sin_categoria';
    if (!catGroups[cat]) catGroups[cat] = { total: 0, TASK: 0, INSIGHT: 0, METRIC: 0, ALERT: 0, FEEDBACK: 0 };
    catGroups[cat].total++;
    catGroups[cat][e._type]++;
  }
  for (const [cat, g] of Object.entries(catGroups).sort((a, b) => b[1].total - a[1].total)) {
    const parts = Object.entries(g).filter(([k]) => k !== 'total').filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`);
    console.log(`   📁 ${cat.padEnd(20)} → ${g.total} [${parts.join(', ')}]`);
  }

  console.log('\n  ' + '─'.repeat(55));
  console.log('  🏷️ DISTRIBUCIÓN POR PRODUCTO:');
  const prodGroups = {};
  for (const e of allEntities) {
    const prod = e.product || 'sin_producto';
    if (!prodGroups[prod]) prodGroups[prod] = { total: 0, TASK: 0, INSIGHT: 0, ALERT: 0, FEEDBACK: 0 };
    prodGroups[prod].total++; prodGroups[prod][e._type]++;
  }
  for (const [prod, g] of Object.entries(prodGroups).sort((a, b) => b[1].total - a[1].total)) {
    const parts = Object.entries(g).filter(([k]) => k !== 'total').filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`);
    console.log(`   🏷️ ${prod.padEnd(25)} → ${g.total} [${parts.join(', ')}]`);
  }

  console.log('\n  ' + '─'.repeat(55));
  console.log('  👤 DISTRIBUCIÓN POR RESPONSABLE:');
  const respGroups = {};
  for (const e of allEntities) {
    const r = e.responsible || 'sin_asignar';
    respGroups[r] = (respGroups[r] || 0) + 1;
  }
  for (const [r, c] of Object.entries(respGroups).sort((a, b) => b[1] - a[1])) {
    console.log(`   👤 ${r.padEnd(20)} → ${c}`);
  }

  const withGoal = allEntities.filter(e => e.goal_id);
  console.log(`\n  🎯 VINCULACIÓN A OBJETIVOS:`);
  console.log(`   ✅ ${withGoal.length}/${allEntities.length} vinculados`);
  if (withGoal.length > 0) {
    const goalMap = {};
    for (const e of withGoal) {
      if (!goalMap[e.goal_id]) goalMap[e.goal_id] = [];
      goalMap[e.goal_id].push(e._type);
    }
    for (const [gid, types] of Object.entries(goalMap)) {
      const u = [...new Set(types)];
      const obj = objectives?.find(o => o.id === gid);
      console.log(`   🔗 ${gid.substring(0, 8)}... → ${types.length} entidades [${u.join(', ')}] — "${(obj?.title || '').substring(0, 50)}"`);
    }
  }

  console.log('\n  ' + '─'.repeat(55));
  console.log('  📋 DUMP TAREAS:');
  mockAnalysis.tasks.forEach((t, i) => {
    const team = CATEGORY_TO_TEAM[(t.category || '').toLowerCase()] || t.category;
    const match = withGoal.find(e => e.title === t.title);
    console.log(`   ${i+1}. [${t.priority}] ${t.title.substring(0, 55)}`);
    console.log(`      eq:${team} prod:${t.product || '—'} resp:${t.responsible}${match ? ` → obj:${match.goal_id?.substring(0, 8)}` : ''}`);
  });

  console.log('\n  🚨 ALERTAS:');
  mockAnalysis.alerts.forEach((a, i) => {
    console.log(`   ${i+1}. [${a.priority}] ${a.title.substring(0, 55)} (${a.category} / ${a.product || '—'})`);
  });

  console.log('\n  💬 FEEDBACK:');
  mockAnalysis.feedback.forEach((f, i) => {
    console.log(`   ${i+1}. [${f.type}] ${f.title.substring(0, 55)} (${f.category} / ${f.product || '—'})`);
  });

  console.log('\n  ' + '─'.repeat(55));
  console.log('  🔗 MATRIZ DE ASOCIACIÓN CRUZADA:');
  if (withGoal.length > 0) {
    const goalTypes = {};
    for (const e of withGoal) {
      if (!goalTypes[e.goal_id]) goalTypes[e.goal_id] = new Set();
      goalTypes[e.goal_id].add(e._type);
    }
    const multi = Object.entries(goalTypes).filter(([, s]) => s.size > 1);
    if (multi.length > 0) {
      console.log('   Por OBJETIVO compartido:');
      for (const [gid, types] of multi) {
        console.log(`   🔗 ${gid.substring(0, 8)}... → asocia: ${[...types].join(' ⟷ ')}`);
      }
    } else {
      console.log('   (sin asociaciones multi-tipo por objetivo)');
    }
  }

  // Verify existing DB data in task_proposals
  const { data: dbTasks } = await supabase
    .from('task_proposals')
    .select('title, team, responsable, goal_id, linked_jira_key, category')
    .eq('workspace_id', workspaceId)
    .limit(10);
  console.log('\n  ' + '─'.repeat(55));
  console.log('  🗄️ TAREAS EXISTENTES EN DB:');
  if (dbTasks && dbTasks.length > 0) {
    dbTasks.forEach((t, i) => {
      console.log(`   ${i+1}. "${t.title?.substring(0, 50)}" eq:${t.team || t.category || '—'} resp:${t.responsable || '—'}`);
      if (t.goal_id) console.log(`      → obj:${t.goal_id.substring(0, 8)}`);
      if (t.linked_jira_key) console.log(`      → jira:${t.linked_jira_key}`);
    });
  } else {
    console.log('   (sin tareas en DB)');
  }

  // Verify existing data in day_summaries
  const { data: summaries } = await supabase
    .from('day_summaries')
    .select('summary_date, kpi_data')
    .eq('workspace_id', workspaceId)
    .order('summary_date', { ascending: false })
    .limit(3);
  console.log('\n  ' + '─'.repeat(55));
  console.log('  📅 DAY SUMMARIES RECIENTES:');
  if (summaries && summaries.length > 0) {
    for (const s of summaries) {
      const kpi = s.kpi_data || {};
      const taskCount = kpi.tasks?.length || 0;
      const insightCount = kpi.insights?.length || 0;
      const metricCount = kpi.metrics?.length || 0;
      const alertCount = kpi.alerts?.length || 0;
      const feedbackCount = kpi.feedback?.length || 0;
      console.log(`   📅 ${s.summary_date} → T:${taskCount} I:${insightCount} M:${metricCount} A:${alertCount} F:${feedbackCount}`);
    }
  } else {
    console.log('   (sin day summaries)');
  }

  // Verify existing data in metrics table
  const { data: existingMetrics, count: metricCount } = await supabase
    .from('metrics')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  console.log('\n  ' + '─'.repeat(55));
  console.log(`  📈 MÉTRICAS EN DB: ${metricCount || 0}`);

  if (metricCount && metricCount > 0) {
    const { data: metricSamples } = await supabase
      .from('metrics')
      .select('name, category, current_value, unit')
      .eq('workspace_id', workspaceId)
      .limit(5);
    if (metricSamples) {
      for (const m of metricSamples) {
        console.log(`   📊 ${m.name}: ${m.current_value} ${m.unit || ''} (${m.category})`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ PRUEBA COMPLETADA');
  if (!env.GEMINI_API_KEY) {
    console.log('  ⚠️  GEMINI_API_KEY no configurada en .env.local');
    console.log('     Para probar con Gemini real, configura la key y ejecuta:');
    console.log('     node scripts/test-analysis-pipeline.mjs');
  }
  console.log('═══════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
