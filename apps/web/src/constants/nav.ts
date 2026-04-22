export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
}

export const mainNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    label: "Día",
    href: "/day/today",
    children: [
      { label: "Hoy", href: "/day/today" },
      { label: "Fuentes", href: "/day/sources" },
      { label: "Resumen", href: "/day/analysis-summary" },
      { label: "Tareas Generadas", href: "/day/tasks-generated" },
    ],
  },
  {
    label: "Tareas",
    href: "/tasks",
  },
  {
    label: "Objetivos",
    href: "/objectives",
  },
  {
    label: "Métricas",
    href: "/metrics",
  },
  {
    label: "Insights",
    href: "/insights",
  },
  {
    label: "Alertas",
    href: "/alerts",
  },
];
