import { cn } from '@/lib/utils'
import { SOURCE_STATUS_CONFIG, TASK_STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/constants'
import type { SourceStatus, TaskStatus, Priority } from '@nexion/types'

interface SourceStatusBadgeProps {
  status: SourceStatus
  withDot?: boolean
}

export function SourceStatusBadge({ status, withDot = false }: SourceStatusBadgeProps) {
  const config = SOURCE_STATUS_CONFIG[status]
  return (
    <span className={cn('badge', config.badgeClass)}>
      {withDot && (
        <span className={cn('mr-1.5 w-1.5 h-1.5 rounded-full inline-block', config.dotColor)} />
      )}
      {config.label}
    </span>
  )
}

interface TaskStatusBadgeProps {
  status: TaskStatus
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = TASK_STATUS_CONFIG[status]
  return <span className={cn('badge', config.badgeClass)}>{config.label}</span>
}

interface PriorityBadgeProps {
  priority: Priority
  withDot?: boolean
}

export function PriorityBadge({ priority, withDot = false }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <span className={cn('badge', config.badgeClass)}>
      {withDot && (
        <span className={cn('mr-1.5 w-1.5 h-1.5 rounded-full inline-block', config.dotColor)} />
      )}
      {config.label}
    </span>
  )
}
