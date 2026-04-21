import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { ComingSoon } from '@/components/shared/ComingSoon'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Dashboard"
        subtitle="Vista ejecutiva global"
        badge="Fase 14"
        badgeColor="ghost"
      />
      <div className="mt-6 page-card">
        <ComingSoon
          title="Dashboard panorámico"
          description="Vista ejecutiva con señales globales, métricas clave y alertas destacadas. Se construye en Fase 14 del roadmap."
          phase="Fase 14"
        />
      </div>
    </div>
  )
}
