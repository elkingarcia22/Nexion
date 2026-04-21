import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Tareas' }

export default function TasksPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Tareas"
        subtitle="Módulo global de tareas del workspace"
        badge="Release 2"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Módulo de Tareas"
          description="Gestión global de tareas del workspace. Las tareas se crean a partir de propuestas aprobadas por el humano — nunca automáticamente. Trazabilidad completa: tarea → propuesta → hallazgo → análisis → fuente."
          phase="Fase 9 — Aprobación humana y módulo Tareas"
        />
      </div>
    </div>
  )
}
