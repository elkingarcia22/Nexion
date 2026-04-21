import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Alertas' }

export default function AlertsPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Alertas"
        subtitle="Alertas activas y riesgos del workspace"
        badge="Release 4"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Módulo global de Alertas"
          description="Riesgos, bloqueos y señales críticas consolidadas a nivel de workspace. Las alertas de alta prioridad se destacan en Día > Hoy."
          phase="Fase 11 — Métricas, Insights y Alertas"
        />
      </div>
    </div>
  )
}
