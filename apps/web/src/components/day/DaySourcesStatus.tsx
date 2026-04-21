import { cn } from '@/lib/utils'
import type { MOCK_DAY_DATA } from './DayTodayView'

interface DaySourcesStatusProps {
  status: typeof MOCK_DAY_DATA['sourcesStatus']
}

export function DaySourcesStatus({ status }: DaySourcesStatusProps) {
  const { total, processed, processing, pending, error } = status
  const processedPct = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <div className="page-card-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-navy">Fuentes del día</h2>
        <a href="/day/sources" className="text-[11px] text-primary hover:underline">
          Ver todas
        </a>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-navy/40">{processed} procesadas</span>
          <span className="text-[10px] font-mono text-navy/40">{processedPct}%</span>
        </div>
        <div className="h-1.5 bg-navy/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-blue rounded-full transition-all duration-500"
            style={{ width: `${processedPct}%` }}
          />
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <SourceStat label="Total" value={total} color="navy" />
        <SourceStat label="Procesadas" value={processed} color="ok" />
        {processing > 0 && <SourceStat label="Procesando" value={processing} color="info" pulse />}
        {pending > 0 && <SourceStat label="Pendientes" value={pending} color="ghost" />}
        {error > 0 && <SourceStat label="Con error" value={error} color="error" />}
      </div>
    </div>
  )
}

function SourceStat({
  label,
  value,
  color,
  pulse = false,
}: {
  label: string
  value: number
  color: 'navy' | 'ok' | 'info' | 'error' | 'ghost'
  pulse?: boolean
}) {
  const textColor = {
    navy: 'text-navy',
    ok: 'text-status-ok',
    info: 'text-status-info',
    error: 'text-status-error',
    ghost: 'text-navy/40',
  }[color]

  return (
    <div className="bg-bg rounded-lg px-2.5 py-2 flex items-center gap-2">
      <span className={cn('font-mono text-lg font-semibold leading-none', textColor)}>
        {value}
      </span>
      <div>
        <p className="text-[10px] text-navy/45 leading-tight">{label}</p>
        {pulse && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-bright animate-pulse-soft" />
        )}
      </div>
    </div>
  )
}
