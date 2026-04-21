import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Insights' }

export default function InsightsPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Insights"
        subtitle="Patrones y señales globales del workspace"
        badge="Release 4"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Módulo global de Insights"
          description="Patrones, tendencias y aprendizajes consolidados a nivel de workspace. Detectados automáticamente por el motor de análisis y revisados por el equipo."
          phase="Fase 11 — Métricas, Insights y Alertas"
        />
      </div>
    </div>
  )
}
