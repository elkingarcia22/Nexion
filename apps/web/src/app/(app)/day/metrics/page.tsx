import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Métricas del día' }

export default function DayMetricsPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Día · Métricas"
        subtitle="Señales métricas del día"
        badge="Fase 11"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Métricas diarias"
          description="Señales métricas contextuales del día extraídas del análisis de fuentes. Diferenciadas de métricas globales persistentes."
          phase="Fase 11 — Métricas, Insights y Alertas"
        />
      </div>
    </div>
  )
}
