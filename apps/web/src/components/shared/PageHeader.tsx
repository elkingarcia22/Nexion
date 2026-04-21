import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  badgeColor?: 'primary' | 'ok' | 'warn' | 'error' | 'info' | 'ghost'
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  badge,
  badgeColor = 'ghost',
  actions,
  className,
}: PageHeaderProps) {
  const badgeClass = {
    primary: 'badge-primary',
    ok: 'badge-ok',
    warn: 'badge-warn',
    error: 'badge-error',
    info: 'badge-info',
    ghost: 'badge-ghost',
  }[badgeColor]

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-navy tracking-tight">{title}</h1>
          {badge && <span className={cn('badge', badgeClass)}>{badge}</span>}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-sm text-navy/50 capitalize">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
