import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center mb-3 text-navy/30">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-navy/70">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-navy/40 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
