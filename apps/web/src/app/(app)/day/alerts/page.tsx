import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Alertas del día' }

export default function DayAlertsPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Día · Alertas"
        subtitle="Riesgos y señales críticas del día"
        badge="Fase 11"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Alertas del día"
          description="Riesgos, bloqueos y señales críticas detectadas en las fuentes. Las alertas de alta prioridad aparecen también en Día > Hoy."
          phase="Fase 11 — Métricas, Insights y Alertas"
        />
      </div>
    </div>
  )
}
