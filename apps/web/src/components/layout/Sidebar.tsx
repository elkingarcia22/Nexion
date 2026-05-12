"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  {
    href: "/day/today",
    label: "Día",
    matchPrefix: "/day",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/tasks",
    label: "Tareas",
    matchPrefix: "/tasks",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    href: "/objectives",
    label: "Objetivos",
    matchPrefix: "/objectives",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  {
    href: "/metrics",
    label: "Métricas",
    matchPrefix: "/metrics",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/alerts",
    label: "Alertas",
    matchPrefix: "/alerts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "Insights",
    matchPrefix: "/insights",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
  activeModules?: string[] | null;
}

const ALWAYS_VISIBLE = ["/day", "/settings"];

export function Sidebar({ expanded, onToggle, activeModules }: SidebarProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter(item => {
    if (ALWAYS_VISIBLE.some(p => item.matchPrefix.startsWith(p))) return true;
    if (!activeModules) return true;
    return activeModules.some(m => item.matchPrefix === `/${m}`);
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-50 border-r border-white/5 transition-all duration-300 ease-in-out"
      style={{
        width: expanded ? "224px" : "64px",
        background: "var(--sidebar-bg)",
      }}
    >
      {/* Header: logo + name + toggle */}
      <div className="flex items-center h-16 px-3 gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        {expanded && (
          <span className="text-white font-bold text-base tracking-tight whitespace-nowrap overflow-hidden">
            Nexión
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-card/60 transition-all flex-shrink-0"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${expanded ? "" : "rotate-180"}`}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3 overflow-hidden">
        {filteredNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.matchPrefix);

          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all duration-150 ${
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-white/40 hover:bg-card/5 hover:text-white"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {expanded && (
                  <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                    {item.label}
                  </span>
                )}
              </Link>

              {/* Tooltip when collapsed */}
              {!expanded && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="bg-[#1f212e] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-hard">
                    {item.label}
                  </div>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1f212e]" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="px-2 pb-1 flex-shrink-0">
        <div className="relative group">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all duration-150 ${
              pathname.startsWith("/settings")
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-white/40 hover:bg-card/5 hover:text-white"
            }`}
          >
            <span className="flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            {expanded && (
              <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                Configuración
              </span>
            )}
          </Link>
          {!expanded && (
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="bg-card text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-hard">
                Configuración
              </div>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1f212e]" />
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="px-2 pb-4 flex-shrink-0">
        <div className="relative group">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-xl px-2.5 py-2.5 text-white/40 hover:bg-card/60 hover:text-white/70 transition-all duration-150"
          >
            <span className="flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            {expanded && (
              <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                Cerrar sesión
              </span>
            )}
          </button>

          {!expanded && (
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="bg-card text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-hard">
                Cerrar sesión
              </div>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1f212e]" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
