'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UbitsLogo } from '@/components/brand/UbitsLogo'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Sunrise,
  ListTodo,
  Target,
  BarChart2,
  Lightbulb,
  BellRing,
  Home,
  Database,
  FileSearch,
  ClipboardList,
  TrendingUp,
  Bell,
  MessageSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'DÍA',
    items: [
      { href: '/day/today', label: 'Hoy', icon: Home },
      { href: '/day/sources', label: 'Fuentes', icon: Database },
      { href: '/day/analysis-summary', label: 'Análisis', icon: FileSearch },
      { href: '/day/tasks-generated', label: 'Tareas generadas', icon: ClipboardList },
      { href: '/day/insights', label: 'Insights', icon: Lightbulb },
      { href: '/day/metrics', label: 'Métricas', icon: TrendingUp },
      { href: '/day/alerts', label: 'Alertas', icon: Bell },
      { href: '/day/feedback', label: 'Feedback', icon: MessageSquare },
    ],
  },
  {
    title: 'TRABAJO',
    items: [
      { href: '/tasks', label: 'Tareas', icon: ListTodo },
      { href: '/objectives', label: 'Objetivos', icon: Target },
    ],
  },
  {
    title: 'SEÑALES',
    items: [
      { href: '/metrics', label: 'Métricas', icon: BarChart2 },
      { href: '/insights', label: 'Insights', icon: Lightbulb },
      { href: '/alerts', label: 'Alertas', icon: BellRing },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/day/today') return pathname === '/day/today'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className="flex flex-col w-[240px] flex-shrink-0 bg-navy border-r border-white/5"
      style={{ height: '100vh', position: 'sticky', top: 0 }}
      aria-label="Navegación principal"
    >
      {/* Brand */}
      <div className="flex flex-col gap-0 px-4 pt-5 pb-4 border-b border-white/5">
        <UbitsLogo color="white" width={68} />
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-white font-semibold text-[15px] tracking-tight">
            Nexión
          </span>
          <span className="text-[9px] font-mono text-white/25 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            v0.1
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navigation.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <p className="sidebar-section-label">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn('sidebar-item', active && 'sidebar-item-active')}
                    aria-current={active ? 'page' : undefined}
                  >
                    <item.icon size={14} className="flex-shrink-0" strokeWidth={2} />
                    <span className="truncate">{item.label}</span>
                    {/* Pending indicator for future features */}
                    {!active &&
                      [
                        '/day/analysis-summary',
                        '/day/tasks-generated',
                        '/tasks',
                        '/objectives',
                        '/metrics',
                        '/insights',
                        '/alerts',
                        '/dashboard',
                      ].includes(item.href) && (
                        <span className="ml-auto text-[9px] font-mono text-white/20">
                          soon
                        </span>
                      )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* System status */}
      <div className="px-3 py-2 border-t border-white/5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-bright animate-pulse-soft flex-shrink-0" />
          <span className="text-[10px] text-white/30 font-mono truncate">Sistema operativo</span>
        </div>
      </div>

      {/* User area */}
      <div className="px-3 pb-4 border-t border-white/5 pt-2">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-dark-ui cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-semibold text-primary">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white/80 truncate">Workspace</p>
            <p className="text-[10px] text-white/30 truncate">ubits.co</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
