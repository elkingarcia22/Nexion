import { cn } from '@/lib/utils'

interface ComingSoonProps {
  title?: string
  description?: string
  phase?: string
  className?: string
}

export function ComingSoon({
  title = 'Próximamente',
  description = 'Esta sección se activará en una fase posterior.',
  phase,
  className,
}: ComingSoonProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-8 text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      <p className="mt-1.5 text-sm text-navy/50 max-w-xs">{description}</p>
      {phase && (
        <span className="mt-4 badge badge-info font-mono text-[10px]">{phase}</span>
      )}
    </div>
  )
}
