/** One HR process per week, each visit with a different editorial focus. */
export interface ProcessDefinition {
  key: string;
  label: string;
  /** What the explainer should help readers understand. */
  goal: string;
}

/** Keys match the catalog's process pillars (metadata.processes). */
export const PROCESSES: ProcessDefinition[] = [
  { key: "RECLUTAMIENTO_Y_TALENTO", label: "Reclutamiento y selección", goal: "bajar el proceso de reclutamiento a pasos claros para el equipo de talento" },
  { key: "ONBOARDING", label: "Onboarding de nuevos colaboradores", goal: "describir cómo se ve un buen onboarding de 30-60-90 días" },
  { key: "DESEMPENO_Y_FEEDBACK", label: "Desempeño y feedback", goal: "conectar la evaluación y el feedback con decisiones de talento y desarrollo" },
  { key: "OKRS", label: "OKRs y objetivos", goal: "explicar qué son los OKRs y cómo se conectan con el negocio" },
  { key: "FORMACION_Y_DESARROLLO", label: "Formación y desarrollo", goal: "priorizar, diseñar y medir el aprendizaje" },
  { key: "CLIMA_Y_COMPROMISO", label: "Clima y compromiso", goal: "explicar el ciclo de encuestas de clima y planes de acción" },
  { key: "SALUD_Y_BIENESTAR", label: "Salud y bienestar", goal: "bajar a tierra un programa de bienestar sostenible" },
  { key: "SUCESION_Y_MOVILIDAD", label: "Sucesión y movilidad interna", goal: "explicar cómo identificar y preparar talento para roles clave" },
  { key: "COMPENSACION_Y_BENEFICIOS", label: "Compensación y beneficios", goal: "explicar cómo se estructura una estrategia de compensación justa" },
  { key: "PEOPLE_ANALYTICS", label: "People analytics", goal: "mostrar cómo usar datos de personas para tomar mejores decisiones" },
  { key: "CULTURA_Y_DEI", label: "Cultura, diversidad e inclusión", goal: "explicar cómo se construye y se mide una cultura inclusiva" },
  { key: "OFFBOARDING", label: "Offboarding", goal: "describir una salida ordenada que cuide la marca empleadora y el conocimiento" },
  { key: "HR_OPERATIONS", label: "Operaciones de RR. HH.", goal: "explicar cómo se organiza la operación y el servicio de RR. HH." },
  { key: "HR_TECH_AUTOMATIZACION", label: "HR tech y automatización", goal: "mostrar dónde la tecnología y la IA quitan trabajo manual a RR. HH." },
  { key: "EMPLOYEE_RELATIONS", label: "Relaciones laborales", goal: "explicar cómo prevenir y gestionar conflictos con confianza" },
  { key: "NOM035_MX", label: "NOM-035 y riesgo psicosocial", goal: "explicar qué exige la norma y cómo se implementa en la práctica" },
  { key: "GENERAL_PROCESOS_RH", label: "El mapa de procesos de RR. HH.", goal: "explicar cómo se conectan los procesos de RR. HH. a lo largo del ciclo del colaborador" },
];

export const FOCUS_VARIANTS = [
  "con foco en la visión general del proceso",
  "con foco en la implementación paso a paso",
  "centrado en los errores más comunes y cómo evitarlos",
  "centrado en buenas prácticas de empresas referentes",
  "centrado en cómo medir el éxito del proceso",
  "centrado en cómo comunicar el proceso a líderes y colaboradores",
  "centrado en el rol de RR. HH. frente al rol de los managers",
  "centrado en cómo apoyar el proceso con tecnología y datos",
  "adaptado a empresas pequeñas o en etapa inicial",
  "adaptado a empresas en rápido crecimiento",
  "adaptado a corporativos grandes y multipaís",
  "centrado en el primer paso si hoy el proceso casi no existe",
];

const WEEK_MS = 7 * 86_400_000;
/** Monday 2025-01-06 00:00 in Bogotá (UTC-5): week 0 of the rotation. */
const ROTATION_START = Date.UTC(2025, 0, 6, 5);

export interface WeeklyTopic {
  week: number;
  process: ProcessDefinition;
  focus: string;
}

/**
 * Deterministic topic for the week containing `now`: every day of a week returns the same topic
 * (so a preview matches what gets published), and all 17 × 12 combinations run before any repeats.
 */
export function topicForWeek(now: Date): WeeklyTopic {
  const week = Math.floor((now.getTime() - ROTATION_START) / WEEK_MS);
  const index = ((week % PROCESSES.length) + PROCESSES.length) % PROCESSES.length;
  const lap = Math.floor(week / PROCESSES.length);
  const focus = FOCUS_VARIANTS[((lap % FOCUS_VARIANTS.length) + FOCUS_VARIANTS.length) % FOCUS_VARIANTS.length];
  return { week, process: PROCESSES[index], focus };
}
