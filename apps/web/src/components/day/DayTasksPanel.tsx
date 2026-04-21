import { cn } from '@/lib/utils'
import { PriorityBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import type { MOCK_DAY_DATA } from './DayTodayView'

interface DayTasksPanelProps {
  tasks: typeof MOCK_DAY_DATA['tasks']
}

export function DayTasksPanel({ tasks }: DayTasksPanelProps) {
  return (
    <div className="page-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-navy">Tareas relevantes hoy</h2>
          {tasks.length > 0 && (
            <span className="badge badge-ghost font-mono">{tasks.length}</span>
          )}
        </div>
        <a href="/tasks" className="text-[11px] text-primary hover:underline">
          Ver todas
        </a>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="Sin tareas pendientes"
          description="No hay tareas asignadas para hoy."
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task }: { task: typeof MOCK_DAY_DATA['tasks'][0] }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg transition-colors group">
      {/* Checkbox placeholder */}
      <div className="w-4 h-4 rounded border border-border-gray mt-0.5 flex-shrink-0 group-hover:border-primary transition-colors" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-navy leading-snug">{task.title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <PriorityBadge priority={task.priority} withDot />
          <span className="text-[10px] text-navy/35">{task.dueDate}</span>
        </div>
      </div>
    </div>
  )
}
