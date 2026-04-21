import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Feedback del día' }

export default function DayFeedbackPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Día · Feedback"
        subtitle="Feedback de usuarios y clientes procesado hoy"
        badge="Fase 11"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Feedback procesado"
          description="Items de feedback extraídos de fuentes como reuniones, documentos y notas. Categorizados y vinculados a objetivos cuando aplica."
          phase="Fase 11 — Métricas, Insights y Alertas"
        />
      </div>
    </div>
  )
}
