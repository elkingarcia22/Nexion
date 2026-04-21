import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Análisis del día' }

export default function DayAnalysisSummaryPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Día · Análisis"
        subtitle="Resumen estructurado del análisis diario"
        badge="Fase 6"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Resumen de análisis"
          description="Vista consolidada de hallazgos, insights y señales extraídas por el motor de análisis con IA. Se activa en Fase 6 (capa de análisis real con Gemini)."
          phase="Fase 6 — Gemini Analysis"
        />
      </div>
    </div>
  )
}
