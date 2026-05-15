import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envRaw = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('=')).filter(([k]) => k).map(([k, ...v]) => [k.trim(), v.join('=').trim()])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const WS_ID = '406370f6-50bc-45d0-9f93-3e83bce60de6';

// ── Existing objectives lookup ──
const { data: objectives } = await supabase
  .from('workspace_objectives')
  .select('id, team, title')
  .in('team', ['Talent', 'Hiring', 'UX', 'Learn', 'Core AI', 'Operations', 'Learning', 'talent', 'hiring', 'ux', 'learning', 'operaciones', 'core']);

const objByTeam = {};
for (const o of objectives || []) {
  const t = o.team?.toLowerCase().trim();
  if (!objByTeam[t]) objByTeam[t] = [];
  objByTeam[t].push(o);
}

const pickObj = (team) => {
  const arr = objByTeam[team.toLowerCase()] || objByTeam[team] || [];
  return arr.length > 0 ? arr[0].id : null;
};

console.log('Objectives loaded:', objectives?.length);

// ── Helper to generate dates ──
const today = new Date();
const fmt = (d) => d.toISOString().split('T')[0];
const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const threeDaysAgo = new Date(today); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

// ── Cross-linked mock data ──
const days = [
  {
    summary_date: fmt(threeDaysAgo),
    summary_text: 'Jornada enfocada en análisis de métricas de producto y planificación de sprints. Se revisaron indicadores clave de Talent y Learning, y se identificaron oportunidades de mejora en la experiencia de onboarding.',
    focus_text: 'Análisis de métricas y planificación de sprints',
    source_count: 4,
    finding_count: 8,
    kpi_data: {
      tasks: [
        { title: 'Rediseñar flujo de onboarding para nuevos usuarios', description: 'Simplificar el proceso de registro y primera experiencia del usuario basado en feedback de UX.', priority: 'high', category: 'ux', product: null, responsible: 'Elkin Garcia', due_date: fmt(new Date(today.getTime() + 7*86400000)), goal_id: pickObj('ux'), linked_jira_key: 'UX-123', linked_metric_names: [], team: 'ux', metadata: { auto_generated: true } },
        { title: 'Actualizar matriz de talento con datos Q2', description: 'Incorporar resultados de evaluaciones 360 a la matriz de talento para el review trimestral.', priority: 'high', category: 'talent', product: 'matriz_talento', responsible: 'María López', due_date: fmt(new Date(today.getTime() + 3*86400000)), goal_id: pickObj('talent'), linked_jira_key: 'TAL-45', linked_metric_names: ['ARR Matriz de Talento'], team: 'talent', metadata: { auto_generated: true } },
        { title: 'Configurar encuesta de clima para equipo Learning', description: 'Diseñar y programar encuesta pulse para el equipo de Learning con preguntas focales.', priority: 'medium', category: 'talent', product: 'encuestas', responsible: 'Elkin Garcia', due_date: fmt(new Date(today.getTime() + 10*86400000)), goal_id: pickObj('talent'), linked_jira_key: null, linked_metric_names: [], team: 'talent', metadata: { auto_generated: true } },
        { title: 'Revisar candidatos para posición de Senior Developer', description: 'Preseleccionar los 5 candidatos más fuertes de la bolsa de empleo para la vacante de Senior Fullstack.', priority: 'high', category: 'hiring', product: 'reclutamiento', responsible: 'Ana Martínez', due_date: fmt(new Date(today.getTime() + 2*86400000)), goal_id: pickObj('hiring'), linked_jira_key: 'HIR-89', linked_metric_names: [], team: 'hiring', metadata: { auto_generated: true } },
        { title: 'Analizar dropout rate en curso de capacitación', description: 'Identificar causas de abandono en el curso de Leadership Fundamentals.', priority: 'medium', category: 'learn', product: 'aprendizaje', responsible: 'Carlos Ruiz', due_date: fmt(new Date(today.getTime() + 5*86400000)), goal_id: pickObj('learning'), linked_jira_key: 'LRN-34', linked_metric_names: ['ARR Aprendizaje Q2'], team: 'learning', metadata: { auto_generated: true } },
      ],
      insights: [
        { title: 'NPS de onboarding mejora después del rediseño', description: 'El NPS del proceso de onboarding subió de 42 a 58 tras los cambios en el flujo de registro.', category: 'ux', product: null, responsible: null, goal_id: pickObj('ux'), linked_jira_key: null },
        { title: 'Alta correlación entre feedback 360 y retención', description: 'Los equipos que completaron evaluación 360 muestran 23% más retención a 6 meses.', category: 'talent', product: 'evaluacion_360', responsible: null, goal_id: pickObj('talent'), linked_jira_key: null },
        { title: 'Tiempo de contratación se reduce con el nuevo flujo', description: 'El tiempo promedio para cubrir una vacante bajó de 18 a 12 días hábiles.', category: 'hiring', product: 'reclutamiento', responsible: null, goal_id: pickObj('hiring'), linked_jira_key: null },
      ],
      alerts: [
        { title: 'Vencimiento de certificaciones masivas en 7 días', description: '15 certificados de la cohorte de marzo están por vencer. Recordar a los usuarios.', priority: 'alta', category: 'Talent', product: 'certificados', responsible: null, goal_id: null, linked_jira_key: null },
        { title: 'Caída en tasa de respuesta de encuestas', description: 'La tasa de respuesta de la última encuesta pulse cayó al 34%, por debajo del umbral del 50%.', priority: 'critica', category: 'Talent', product: 'encuestas', responsible: null, goal_id: null, linked_jira_key: null },
      ],
      feedback: [
        { title: 'Solicitud de mejoras en módulo de evaluaciones', content: 'Los managers reportan que el módulo de evaluación 360 necesita una vista de progreso más clara.', type: 'producto', category: 'talent', product: 'evaluacion_360', responsible: null, goal_id: null },
        { title: 'Sugerencia de contenido para Learning', content: 'El equipo de ventas solicita un curso de negociación para clientes enterprise.', type: 'producto', category: 'learning', product: 'aprendizaje', responsible: null, goal_id: null },
        { title: 'Carga laboral alta en equipo de Hiring', content: 'Tres reclutadores reportan sobrecarga de trabajo con el volumen actual de vacantes.', type: 'laboral', category: 'hiring', product: null, responsible: null, goal_id: null },
      ],
      tasks_count: 5,
      insights_count: 3,
      alerts_count: 2,
      feedback_count: 3,
      source_count: 4,
    },
  },
  {
    summary_date: fmt(twoDaysAgo),
    summary_text: 'Sesión de refinamiento con equipos de producto. Se definieron prioridades para el sprint incluyendo integraciones con IA, mejoras en la app móvil y optimización del módulo de planes de formación.',
    focus_text: 'Refinamiento de producto y definición de sprint',
    source_count: 6,
    finding_count: 12,
    kpi_data: {
      tasks: [
        { title: 'Implementar agente de IA para recomendación de cursos', description: 'Desarrollar el core IA que recomiende cursos basados en el perfil del usuario y su historial de aprendizaje.', priority: 'high', category: 'core ai', product: 'core_ia', responsible: 'Nexión Team', due_date: fmt(new Date(today.getTime() + 14*86400000)), goal_id: pickObj('cross') || pickObj('core'), linked_jira_key: 'AI-56', linked_metric_names: ['ARR LMS Creator Q2'], team: 'operaciones', metadata: { auto_generated: true } },
        { title: 'Mejorar rendimiento de app móvil en Android', description: 'Optimizar tiempos de carga de la app en dispositivos Android de gama media.', priority: 'medium', category: 'core ai', product: 'app', responsible: 'Carlos Ruiz', due_date: fmt(new Date(today.getTime() + 21*86400000)), goal_id: pickObj('core'), linked_jira_key: 'APP-12', linked_metric_names: [], team: 'operaciones', metadata: { auto_generated: true } },
        { title: 'Diseñar nuevos planes de formación por roles', description: 'Crear 3 itinerarios formativos para los roles más solicitados: Developer, PM y Sales.', priority: 'medium', category: 'learn', product: 'planes_formacion', responsible: 'María López', due_date: fmt(new Date(today.getTime() + 10*86400000)), goal_id: pickObj('learning'), linked_jira_key: 'LRN-41', linked_metric_names: [], team: 'learning', metadata: { auto_generated: true } },
        { title: 'Automatizar reporte semanal de métricas de aprendizaje', description: 'Crear dashboard automatizado con las métricas clave de aprendizaje para el equipo directivo.', priority: 'low', category: 'learn', product: 'metricas_empresa', responsible: 'Elkin Garcia', due_date: fmt(new Date(today.getTime() + 30*86400000)), goal_id: pickObj('learning'), linked_jira_key: null, linked_metric_names: ['ARR Aprendizaje Q2', 'NPS Q2'], team: 'learning', metadata: { auto_generated: true } },
        { title: 'Revisión de roles y permisos en módulo de evaluaciones', description: 'Auditar y corregir permisos de acceso a evaluaciones 360 por nivel organizacional.', priority: 'high', category: 'operations', product: 'roles_permisos', responsible: 'Ana Martínez', due_date: fmt(new Date(today.getTime() + 5*86400000)), goal_id: pickObj('cross') || pickObj('hiring'), linked_jira_key: 'SEC-23', linked_metric_names: [], team: 'operaciones', metadata: { auto_generated: true } },
      ],
      insights: [
        { title: 'Adopción de IA crece 40% entre usuarios recurrentes', description: 'Los usuarios que usaron el modo IA estudio al menos 3 veces muestran 40% más retención.', category: 'core ai', product: 'core_ia', responsible: null, goal_id: null, linked_jira_key: null },
        { title: 'Planes de formación incrementan engagement semanal', description: 'Usuarios con planes de formación asignados tienen 2.5x más sesiones semanales.', category: 'learning', product: 'planes_formacion', responsible: null, goal_id: pickObj('learning'), linked_jira_key: null },
        { title: 'La app móvil concentra el 35% del tráfico total', description: 'El tráfico desde dispositivos móviles sigue creciendo. Optimizar experiencia móvil es prioritario.', category: 'core ai', product: 'app', responsible: null, goal_id: null, linked_jira_key: null },
        { title: 'Operaciones reporta 30% menos tickets con nuevo chat de soporte', description: 'El chat de soporte basado en IA resolvió el 30% de los tickets sin intervención humana.', category: 'operations', product: 'chat_soporte', responsible: null, goal_id: null, linked_jira_key: null },
      ],
      alerts: [
        { title: 'Límite de API de Gemini próximo a alcanzarse', description: 'El consumo de la API de Gemini está al 82% del límite mensual. Considerar escalar el plan.', priority: 'critica', category: 'Core AI', product: 'core_ia', responsible: null, goal_id: null, linked_jira_key: null },
        { title: 'Certificados SSL expirarán en 15 días', description: '3 certificados SSL del entorno de producción expiran este mes. Programar renovación.', priority: 'alta', category: 'Operations', product: null, responsible: null, goal_id: null, linked_jira_key: null },
        { title: 'Baja adopción de módulo de seguimientos', description: 'Solo el 12% de los usuarios activos usa la funcionalidad de seguimientos. Evaluar su relevancia.', priority: 'media', category: 'Learn', product: 'seguimientos', responsible: null, goal_id: null, linked_jira_key: null },
      ],
      feedback: [
        { title: 'Mejora solicitada en búsqueda de cursos', description: 'Los usuarios encuentran difícil buscar cursos específicos. Solicitan filtros más avanzados.', type: 'producto', category: 'learning', product: 'aprendizaje', responsible: null, goal_id: null },
        { title: 'Problemas de rendimiento en app iOS', description: 'Usuarios de iPhone 12 reportan lentitud al cargar la biblioteca de cursos.', type: 'producto', category: 'core ai', product: 'app', responsible: null, goal_id: null },
        { title: 'Sugerencia: recordatorios inteligentes de evaluaciones', description: 'Los managers piden notificaciones push cuando un miembro del equipo tenga evaluación 360 pendiente.', type: 'producto', category: 'talent', product: 'evaluacion_360', responsible: null, goal_id: null },
        { title: 'Ambiente positivo tras taller de team building', description: 'El equipo de Hiring reporta mejor comunicación después del taller de integración.', type: 'personal', category: 'hiring', product: null, responsible: null, goal_id: null },
      ],
      tasks_count: 5,
      insights_count: 4,
      alerts_count: 3,
      feedback_count: 4,
      source_count: 6,
    },
  },
  {
    summary_date: fmt(yesterday),
    summary_text: 'Jornada operativa con foco en reclutamiento, experiencia de usuario y preparación de arquitectura de IA para la fábrica de agentes. Se avanzó en el diseño del comparativo de encuestas y en la planificación del sprint de Hiring.',
    focus_text: 'Reclutamiento, UX y arquitectura de IA',
    source_count: 5,
    finding_count: 10,
    kpi_data: {
      tasks: [
        { title: 'Finalizar diseño de reportes comparativos de Encuestas 2.0', description: 'Completar el diseño y lógica de los reportes comparativos con persistencia de datos y descarga PDF.', priority: 'high', category: 'talent', product: 'encuestas', responsible: 'Elkin Garcia', due_date: fmt(today), goal_id: pickObj('talent'), linked_jira_key: 'ENC-17', linked_metric_names: ['ARR Encuestas'], team: 'talent', metadata: { auto_generated: true } },
        { title: 'Codificar agente comercial de IA para Market AI', description: 'Desarrollar el agente de ventas de la Fábrica de Agentes de Market AI (Fase 1).', priority: 'high', category: 'core ai', product: 'core_ia', responsible: 'Nexión Team', due_date: fmt(new Date(today.getTime() + 14*86400000)), goal_id: pickObj('core'), linked_jira_key: 'AI-67', linked_metric_names: [], team: 'operaciones', metadata: { auto_generated: true } },
        { title: 'Implementar nueva vista de candidatos en Hiring', description: 'Desarrollar la nueva vista de candidatos con filtros avanzados y visualización de pipeline.', priority: 'high', category: 'hiring', product: 'reclutamiento', responsible: 'Ana Martínez', due_date: fmt(new Date(today.getTime() + 7*86400000)), goal_id: pickObj('hiring'), linked_jira_key: 'HIR-102', linked_metric_names: [], team: 'hiring', metadata: { auto_generated: true } },
        { title: 'Corregir botones de acción manual en vista de candidatos', description: 'Los botones de acción manual no responden correctamente en la vista de detalle del candidato.', priority: 'high', category: 'hiring', product: 'reclutamiento', responsible: 'Elkin Garcia', due_date: fmt(today), goal_id: pickObj('hiring'), linked_jira_key: 'HIR-105', linked_metric_names: [], team: 'hiring', metadata: { auto_generated: true } },
        { title: 'Preparar propuesta de arquitectura para agentes de IA', description: 'Documentar la arquitectura de plataforma ligera para centralizar y escalar agentes de IA.', priority: 'medium', category: 'core ai', product: 'core_ia', responsible: 'Elkin Garcia', due_date: fmt(new Date(today.getTime() + 4*86400000)), goal_id: pickObj('core'), linked_jira_key: 'AI-68', linked_metric_names: [], team: 'operaciones', metadata: { auto_generated: true } },
        { title: 'Revisar y optimizar flujo de entrevistas', description: 'Simplificar el proceso de agendamiento de entrevistas basado en feedback de reclutadores.', priority: 'medium', category: 'hiring', product: 'reclutamiento', responsible: 'Elkin Garcia', due_date: fmt(new Date(today.getTime() + 10*86400000)), goal_id: pickObj('hiring'), linked_jira_key: null, linked_metric_names: [], team: 'hiring', metadata: { auto_generated: true } },
      ],
      insights: [
        { title: 'Encuestas 2.0 incrementarán tasa de respuesta esperada', description: 'El nuevo diseño de encuestas con reportes comparativos proyecta un aumento del 25% en tasa de respuesta.', category: 'talent', product: 'encuestas', responsible: null, goal_id: pickObj('talent'), linked_jira_key: null },
        { title: 'La Fábrica de Agentes automatizará el 40% del proceso comercial', description: 'Estimación inicial muestra que los agentes de IA pueden automatizar el 40% de las tareas comerciales repetitivas.', category: 'core ai', product: 'core_ia', responsible: null, goal_id: null, linked_jira_key: null },
        { title: 'Nueva vista de candidatos reduce tiempo de revisión', description: 'La vista con pipeline visual permite a los reclutadores revisar candidatos 2x más rápido.', category: 'hiring', product: 'reclutamiento', responsible: null, goal_id: pickObj('hiring'), linked_jira_key: null },
      ],
      alerts: [
        { title: '3 vacantes críticas sin candidatos preseleccionados', description: 'Las posiciones de Senior Backend, PM y Diseñador UX no tienen candidatos en etapa de entrevista.', priority: 'critica', category: 'Hiring', product: 'reclutamiento', responsible: null, goal_id: null, linked_jira_key: null },
        { title: 'Encuesta de clima con baja participación en equipo Core', description: 'Solo el 28% del equipo Core ha respondido la encuesta de clima. Quedan 3 días.', priority: 'alta', category: 'Talent', product: 'encuestas', responsible: null, goal_id: null, linked_jira_key: null },
      ],
      feedback: [
        { title: 'Mejora en proceso de entrevistas', description: 'Los candidatos reportan una mejor experiencia con el nuevo formato de entrevista estructurada.', type: 'producto', category: 'hiring', product: 'reclutamiento', responsible: null, goal_id: null },
        { title: 'Curso de IA muy bien recibido', description: 'El piloto del curso de fundamentos de IA tuvo 4.8/5 de calificación promedio.', type: 'producto', category: 'learning', product: 'aprendizaje', responsible: null, goal_id: null },
        { title: 'Estrés por carga de trabajo en equipo de producto', description: 'Tres PMs reportan dificultad para cubrir todos los frentes del sprint actual.', type: 'laboral', category: 'ux', product: null, responsible: null, goal_id: null },
      ],
      tasks_count: 6,
      insights_count: 3,
      alerts_count: 2,
      feedback_count: 3,
      source_count: 5,
    },
  },
];

// ── Insert day_summaries ──
for (const day of days) {
  const payload = {
    workspace_id: WS_ID,
    summary_date: day.summary_date,
    summary_text: day.summary_text,
    focus_text: day.focus_text,
    source_count: day.source_count,
    finding_count: day.finding_count,
    proposal_count: day.kpi_data.tasks_count,
    alert_count: day.kpi_data.alerts_count,
    insight_count: day.kpi_data.insights_count,
    feedback_count: day.kpi_data.feedback_count,
    kpi_data: day.kpi_data,
  };

  const { error, status } = await supabase
    .from('day_summaries')
    .upsert(payload, { onConflict: 'workspace_id,summary_date' });

  if (error) {
    console.error(`  ❌ day_summary ${day.summary_date}: ${error.message}`);
  } else {
    console.log(`  ✅ day_summary ${day.summary_date} (status ${status})`);
  }

  // ── Insert task_proposals for each task ──
  for (const task of day.kpi_data.tasks) {
    const { error: tpErr } = await supabase
      .from('task_proposals')
      .insert({
        workspace_id: WS_ID,
        title: task.title,
        description: task.description,
        priority: task.priority,
        team: task.team,
        responsible: task.responsible,
        due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
        suggested_date: day.summary_date,
        goal_id: task.goal_id,
        linked_jira_key: task.linked_jira_key,
        status: 'pending_review',
        proposal_status: 'pending_review',
        metadata: { auto_generated: true, origin: 'mock_seed', kpi_data_summary_date: day.summary_date },
        labels: [task.team, task.category],
      });

    if (tpErr) {
      console.error(`  ❌ task "${task.title.substring(0, 40)}": ${tpErr.message}`);
    } else {
      console.log(`  ✅ task "${task.title.substring(0, 50)}"`);
    }
  }
}

// ── Verify ──
console.log('\n══════════ VERIFICACIÓN ══════════');

const tables = ['day_summaries', 'task_proposals', 'analyses'];
for (const t of tables) {
  const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
  console.log(`  ${t}: ${count}`);
}

const { data: ds } = await supabase
  .from('day_summaries')
  .select('summary_date, kpi_data->tasks, kpi_data->insights, kpi_data->alerts, kpi_data->feedback')
  .eq('workspace_id', WS_ID)
  .order('summary_date', { ascending: false });

console.log('\n📋 DAY SUMMARIES:');
for (const d of ds || []) {
  const tasks = d.tasks?.length || 0;
  const insights = d.insights?.length || 0;
  const alerts = d.alerts?.length || 0;
  const feedback = d.feedback?.length || 0;
  console.log(`  ${d.summary_date} → tasks:${tasks} insights:${insights} alerts:${alerts} feedback:${feedback}`);
}

console.log('\n✅ SEED COMPLETADO');
