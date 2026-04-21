import { DayStatusBar } from './DayStatusBar'
import { DayFocusCard } from './DayFocusCard'
import { DayTasksPanel } from './DayTasksPanel'
import { DayAlertsPanel } from './DayAlertsPanel'
import { DaySourcesStatus } from './DaySourcesStatus'
import { DayPendingProposals } from './DayPendingProposals'

// ⚠️ Mock data — replace with Supabase queries once Day Engine + schema are live (Phase 3+)
export const MOCK_DAY_DATA = {
  focusOfDay:
    'Cerrar los bloqueos críticos de producto del Q2 y consolidar el roadmap de releases para el equipo.',
  analysisSummary:
    'Se procesaron 4 fuentes hoy. Se detectaron 3 alertas activas y 2 propuestas de tarea pendientes de revisión.',
  sourcesStatus: { total: 4, processed: 3, processing: 1, pending: 0, error: 0 },
  lastConsolidation: 'hoy 18:00',
  tasks: [
    {
      id: 't1',
      title: 'Revisar y aprobar propuesta de arquitectura de automatización',
      priority: 'alta' as const,
      status: 'por_iniciar' as const,
      dueDate: 'hoy',
    },
    {
      id: 't2',
      title: 'Actualizar criterios de cierre de Release 1 con el equipo',
      priority: 'alta' as const,
      status: 'por_iniciar' as const,
      dueDate: 'hoy',
    },
    {
      id: 't3',
      title: 'Revisar setup de Google OAuth con infraestructura',
      priority: 'media' as const,
      status: 'por_iniciar' as const,
      dueDate: 'mañana',
    },
  ],
  alerts: [
    {
      id: 'a1',
      title: 'Google OAuth aún sin configurar — bloquea Fase 2',
      priority: 'alta' as const,
      category: 'bloqueo',
    },
    {
      id: 'a2',
      title: 'Credenciales de Gemini API pendientes — necesarias para Fase 6',
      priority: 'media' as const,
      category: 'configuración',
    },
    {
      id: 'a3',
      title: 'Vercel sin proyecto creado — requerido antes del primer deploy',
      priority: 'media' as const,
      category: 'infraestructura',
    },
  ],
  proposals: [
    {
      id: 'p1',
      title: 'Crear proyecto Vercel y conectar repo Nexion',
      prioritySuggested: 'alta' as const,
      confidence: 0.91,
    },
    {
      id: 'p2',
      title: 'Activar Google Cloud project para OAuth y APIs',
      prioritySuggested: 'alta' as const,
      confidence: 0.87,
    },
  ],
  metrics: [
    { id: 'm1', label: 'Fuentes hoy', value: '4', trend: 'stable' as const },
    { id: 'm2', label: 'Alertas activas', value: '3', trend: 'up' as const },
    { id: 'm3', label: 'Pendientes de aprobación', value: '2', trend: 'stable' as const },
  ],
}

export function DayTodayView() {
  return (
    <div className="mt-5 space-y-4">
      {/* Status bar */}
      <DayStatusBar data={MOCK_DAY_DATA} />

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left column — focus + tasks */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <DayFocusCard
            focus={MOCK_DAY_DATA.focusOfDay}
            summary={MOCK_DAY_DATA.analysisSummary}
            metrics={MOCK_DAY_DATA.metrics}
          />
          <DayTasksPanel tasks={MOCK_DAY_DATA.tasks} />
        </div>

        {/* Right column — alerts + sources + proposals */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <DayAlertsPanel alerts={MOCK_DAY_DATA.alerts} />
          <DaySourcesStatus status={MOCK_DAY_DATA.sourcesStatus} />
          <DayPendingProposals proposals={MOCK_DAY_DATA.proposals} />
        </div>
      </div>

      {/* Mock data notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-status-info-bg rounded-lg border border-status-info/20">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-status-info">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-[11px] text-status-info">
          Datos de ejemplo (mock). Se reemplazarán con datos reales de Supabase en Fase 3+.
        </p>
      </div>
    </div>
  )
}
