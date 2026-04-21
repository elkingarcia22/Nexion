import { cn } from '@/lib/utils'
import { PriorityBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import type { MOCK_DAY_DATA } from './DayTodayView'

interface DayPendingProposalsProps {
  proposals: typeof MOCK_DAY_DATA['proposals']
}

export function DayPendingProposals({ proposals }: DayPendingProposalsProps) {
  if (proposals.length === 0) return null

  return (
    <div className="page-card-sm border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-navy">Propuestas pendientes</h2>
          <span className="badge badge-primary font-mono">{proposals.length}</span>
        </div>
      </div>

      <p className="text-[11px] text-navy/45 mb-3">
        Propuestas de tarea detectadas por Nexión. Revisa y aprueba.
      </p>

      <div className="space-y-2">
        {proposals.map((p) => (
          <div
            key={p.id}
            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-primary/4 border border-primary/10"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-navy leading-snug">{p.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <PriorityBadge priority={p.prioritySuggested} />
                <span className="text-[10px] text-navy/35 font-mono">
                  {Math.round(p.confidence * 100)}% confianza
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA — activado en Fase 8 */}
      <div className="mt-3 pt-3 border-t border-border-gray">
        <button
          disabled
          className="w-full btn-primary text-xs py-2 opacity-40 cursor-not-allowed"
          title="Aprobación de propuestas activa en Fase 8"
        >
          Revisar propuestas
        </button>
        <p className="text-center text-[10px] text-navy/30 mt-1.5">Disponible en Fase 8</p>
      </div>
    </div>
  )
}
