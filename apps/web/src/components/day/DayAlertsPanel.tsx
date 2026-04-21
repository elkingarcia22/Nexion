import { cn } from '@/lib/utils'
import { PriorityBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import type { MOCK_DAY_DATA } from './DayTodayView'

interface DayAlertsPanelProps {
  alerts: typeof MOCK_DAY_DATA['alerts']
}

export function DayAlertsPanel({ alerts }: DayAlertsPanelProps) {
  const hasHighAlerts = alerts.some((a) => a.priority === 'alta')

  return (
    <div className={cn('page-card-sm', hasHighAlerts && 'border-status-error/30')}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('flex-shrink-0', hasHighAlerts ? 'text-status-error' : 'text-navy/40')}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h2 className="text-sm font-semibold text-navy">Alertas</h2>
          {alerts.length > 0 && (
            <span
              className={cn(
                'badge font-mono',
                hasHighAlerts ? 'badge-error' : 'badge-warn'
              )}
            >
              {alerts.length}
            </span>
          )}
        </div>
        <a href="/day/alerts" className="text-[11px] text-primary hover:underline">
          Ver todas
        </a>
      </div>

      {alerts.length === 0 ? (
        <EmptyState title="Sin alertas activas" className="py-6" />
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-2.5 py-2">
              <div
                className={cn(
                  'w-1 h-1 rounded-full mt-1.5 flex-shrink-0',
                  alert.priority === 'alta'
                    ? 'bg-status-error'
                    : alert.priority === 'media'
                    ? 'bg-status-warn'
                    : 'bg-navy/20'
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-navy leading-snug">{alert.title}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <PriorityBadge priority={alert.priority} />
                  <span className="text-[10px] text-navy/35">{alert.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
