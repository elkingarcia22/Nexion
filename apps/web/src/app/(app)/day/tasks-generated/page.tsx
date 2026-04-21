import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Tareas generadas' }

export default function DayTasksGeneratedPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Día · Tareas generadas"
        subtitle="Propuestas de tarea detectadas por Nexión"
        badge="Fase 8"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Motor de propuestas de tarea"
          description="Las propuestas de tarea se generan a partir de hallazgos accionables detectados en el análisis de fuentes. Requieren aprobación humana antes de convertirse en tareas reales."
          phase="Fase 8 — Task Proposals"
        />
      </div>
    </div>
  )
}
