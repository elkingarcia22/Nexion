import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Métricas' }

export default function MetricsPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Métricas"
        subtitle="Métricas globales persistentes del workspace"
        badge="Release 4"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Módulo global de Métricas"
          description="Métricas persistentes y tendencias de negocio a nivel de workspace. Diferenciadas de las señales métricas diarias contextuales."
          phase="Fase 11 — Métricas, Insights y Alertas"
        />
      </div>
    </div>
  )
}
