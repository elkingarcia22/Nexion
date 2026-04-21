import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = { title: 'Objetivos' }

export default function ObjectivesPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Objetivos"
        subtitle="OKRs y Key Results del workspace"
        badge="Release 3"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Objetivos y KRs"
          description="Sincronización con el Google Sheet oficial de OKRs. Las tareas pueden vincularse a Key Results para medir impacto estratégico del trabajo operativo."
          phase="Fase 10 — Objetivos y KRs"
        />
      </div>
    </div>
  )
}
