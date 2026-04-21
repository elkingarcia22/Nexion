// Route constants — use these instead of string literals in components
export const ROUTES = {
  root: '/',
  login: '/login',
  dashboard: '/dashboard',
  day: {
    today: '/day/today',
    sources: '/day/sources',
    analysisSummary: '/day/analysis-summary',
    tasksGenerated: '/day/tasks-generated',
    insights: '/day/insights',
    metrics: '/day/metrics',
    alerts: '/day/alerts',
    feedback: '/day/feedback',
  },
  tasks: '/tasks',
  objectives: '/objectives',
  metrics: '/metrics',
  insights: '/insights',
  alerts: '/alerts',
} as const

// Source status display config
export const SOURCE_STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    badgeClass: 'badge-ghost',
    dotColor: 'bg-navy/30',
  },
  processing: {
    label: 'Procesando',
    badgeClass: 'badge-info',
    dotColor: 'bg-bright animate-pulse-soft',
  },
  processed: {
    label: 'Procesado',
    badgeClass: 'badge-ok',
    dotColor: 'bg-status-ok',
  },
  reprocessing: {
    label: 'Reprocesando',
    badgeClass: 'badge-info',
    dotColor: 'bg-bright animate-pulse-soft',
  },
  error: {
    label: 'Error',
    badgeClass: 'badge-error',
    dotColor: 'bg-status-error',
  },
} as const

// Task status display config
export const TASK_STATUS_CONFIG = {
  por_iniciar: { label: 'Por iniciar', badgeClass: 'badge-ghost' },
  completada: { label: 'Completada', badgeClass: 'badge-ok' },
  incompleta: { label: 'Incompleta', badgeClass: 'badge-warn' },
  en_pausa: { label: 'En pausa', badgeClass: 'badge-warn' },
  deprecada: { label: 'Deprecada', badgeClass: 'badge-ghost' },
} as const

// Priority display config
export const PRIORITY_CONFIG = {
  alta: { label: 'Alta', badgeClass: 'badge-error', dotColor: 'bg-status-error' },
  media: { label: 'Media', badgeClass: 'badge-warn', dotColor: 'bg-status-warn' },
  baja: { label: 'Baja', badgeClass: 'badge-ghost', dotColor: 'bg-navy/20' },
} as const
