import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Insights del día' }

export default function DayInsightsPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Día · Insights"
        subtitle="Patrones y señales de negocio del día"
        badge="Fase 11"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Insights diarios"
          description="Patrones, tendencias y señales de negocio detectadas en las fuentes del día. Se consolidan junto con métricas y alertas en Fase 11."
          phase="Fase 11 — Métricas, Insights y Alertas"
        />
      </div>
    </div>
  )
}
