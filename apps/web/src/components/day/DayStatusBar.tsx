import { cn } from '@/lib/utils'
import type { MOCK_DAY_DATA } from './DayTodayView'

interface DayStatusBarProps {
  data: typeof MOCK_DAY_DATA
}

export function DayStatusBar({ data }: DayStatusBarProps) {
  const { sourcesStatus, lastConsolidation } = data
  const allProcessed = sourcesStatus.processing === 0 && sourcesStatus.error === 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* System status */}
      <StatusChip
        label={allProcessed ? 'Sistema al día' : 'Procesando fuentes'}
        color={allProcessed ? 'ok' : 'processing'}
        dot
      />

      {/* Fuentes procesadas */}
      <StatusChip
        label={`${sourcesStatus.processed}/${sourcesStatus.total} fuentes procesadas`}
        color="info"
      />

      {/* Processing */}
      {sourcesStatus.processing > 0 && (
        <StatusChip
          label={`${sourcesStatus.processing} procesando…`}
          color="processing"
          dot
        />
      )}

      {/* Errors */}
      {sourcesStatus.error > 0 && (
        <StatusChip
          label={`${sourcesStatus.error} con error`}
          color="error"
          dot
        />
      )}

      {/* Last consolidation */}
      <div className="ml-auto">
        <span className="text-[11px] text-navy/35 font-mono">
          Consolidado: {lastConsolidation}
        </span>
      </div>
    </div>
  )
}

interface StatusChipProps {
  label: string
  color: 'ok' | 'info' | 'error' | 'warn' | 'processing'
  dot?: boolean
}

function StatusChip({ label, color, dot = false }: StatusChipProps) {
  const styles = {
    ok: 'bg-status-ok-bg text-status-ok',
    info: 'bg-status-info-bg text-status-info',
    error: 'bg-status-error-bg text-status-error',
    warn: 'bg-status-warn-bg text-status-warn',
    processing: 'bg-primary/8 text-primary',
  }[color]

  const dotColor = {
    ok: 'bg-status-ok',
    info: 'bg-status-info',
    error: 'bg-status-error',
    warn: 'bg-status-warn',
    processing: 'bg-primary animate-pulse-soft',
  }[color]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium',
        styles
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColor)} />
      )}
      {label}
    </span>
  )
}
