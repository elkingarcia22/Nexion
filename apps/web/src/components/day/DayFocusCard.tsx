import { cn } from '@/lib/utils'
import type { MOCK_DAY_DATA } from './DayTodayView'

interface DayFocusCardProps {
  focus: string | null
  summary: string | null
  metrics: typeof MOCK_DAY_DATA['metrics']
}

export function DayFocusCard({ focus, summary, metrics }: DayFocusCardProps) {
  return (
    <div className="page-card">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-5 rounded-full bg-gradient-blue" />
        <h2 className="text-sm font-semibold text-navy">Foco del día</h2>
      </div>

      {/* Focus statement */}
      {focus ? (
        <p className="text-[15px] font-medium text-navy leading-snug">{focus}</p>
      ) : (
        <p className="text-sm text-navy/40 italic">Sin foco definido para hoy.</p>
      )}

      {/* Summary */}
      {summary && (
        <p className="mt-3 text-[13px] text-navy/55 leading-relaxed border-t border-border-gray pt-3">
          {summary}
        </p>
      )}

      {/* Metrics strip */}
      {metrics.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-gray grid grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.id} className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="font-mono text-2xl font-semibold text-navy">{m.value}</span>
                {m.trend === 'up' && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-status-error flex-shrink-0">
                    <path d="M8 3l5 5H3l5-5z" fill="currentColor" />
                  </svg>
                )}
                {m.trend === 'down' && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-status-ok flex-shrink-0">
                    <path d="M8 13L3 8h10l-5 5z" fill="currentColor" />
                  </svg>
                )}
              </div>
              <p className="text-[10px] text-navy/45 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
