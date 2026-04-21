import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/PageHeader'
import { DayTodayView } from '@/components/day/DayTodayView'

export const metadata: Metadata = {
  title: 'Hoy',
}

// Mock date label — replaced with dynamic value once Day Engine is live
const TODAY_LABEL = new Date().toLocaleDateString('es-CO', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default function DayTodayPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Día · Hoy"
        subtitle={TODAY_LABEL}
        badge="Home operativo"
        badgeColor="primary"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-navy/40 font-mono">
              Última consolidación: hoy 18:00
            </span>
            <button className="btn-secondary text-xs py-1.5 px-3">
              Actualizar
            </button>
          </div>
        }
      />
      <DayTodayView />
    </div>
  )
}
