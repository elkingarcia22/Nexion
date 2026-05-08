"use client";

import { useState } from "react";

interface Task {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "done";
}

interface Insight {
  id: string;
  text: string;
  type: "opportunity" | "risk" | "info";
}

interface Metric {
  label: string;
  value: string;
  change: number;
}

export default function DayTodayView() {
  const [activeTab, setActiveTab] = useState<"summary" | "tasks" | "insights" | "metrics">("summary");

  // Mock data
  const tasks: Task[] = [
    { id: "1", title: "Revisar análisis de fuentes del día", priority: "high", status: "pending" },
    { id: "2", title: "Validar hallazgos de reunión de operaciones", priority: "medium", status: "in_progress" },
    { id: "3", title: "Actualizar progreso de objetivos Q2", priority: "medium", status: "pending" },
  ];

  const insights: Insight[] = [
    { id: "1", text: "La reunión de operaciones destacó retraso en entregas", type: "risk" },
    { id: "2", text: "Oportunidad de automatizar reporte semanal", type: "opportunity" },
    { id: "3", text: "Satisfacción del cliente subió 12% este mes", type: "info" },
  ];

  const metrics: Metric[] = [
    { label: "Tareas completadas", value: "12", change: 8 },
    { label: "Tiempo promedio resolución", value: "2.3h", change: -15 },
    { label: "Fuentes procesadas", value: "8", change: 25 },
  ];

  const summary = {
    date: new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    totalSources: 8,
    processedToday: 3,
    pendingTasks: 5,
    activeAlerts: 2,
  };

  return (
    <div className="min-h-screen bg-bg p-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dia &gt; Hoy</h1>
        <p className="text-white/60">{summary.date}</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Fuentes totales" value={summary.totalSources.toString()} icon="📊" />
        <StatCard title="Procesadas hoy" value={summary.processedToday.toString()} icon="✅" />
        <StatCard title="Tareas pendientes" value={summary.pendingTasks.toString()} icon="📋" />
        <StatCard title="Alertas activas" value={summary.activeAlerts.toString()} icon="⚠️" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-white/10">
        <TabButton label="Resumen" tab="summary" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Tareas" tab="tasks" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Hallazgos" tab="insights" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Métricas" tab="metrics" activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Content */}
      <div className="bg-card rounded-xl border border-white/10 p-6">
        {activeTab === "summary" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Resumen del día</h2>
            <p className="text-white/70 mb-4">
              Se han procesado {summary.processedToday} fuentes hoy. Hay {summary.pendingTasks} tareas pendientes y {summary.activeAlerts} alertas activas.
            </p>
            <div className="bg-bg/50 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Estado general</h3>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent"></div>
                <span className="text-white/70 text-sm">Operación estable, atender alertas pendientes</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Tareas generadas</h2>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-bg/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <PriorityDot priority={task.priority} />
                    <span className="text-white">{task.title}</span>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Hallazgos del análisis</h2>
            <div className="space-y-3">
              {insights.map((insight) => (
                <div key={insight.id} className="p-4 bg-bg/50 rounded-lg flex items-start gap-3">
                  <InsightIcon type={insight.type} />
                  <span className="text-white/80">{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "metrics" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Métricas operativas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.map((metric, index) => (
                <div key={index} className="p-4 bg-bg/50 rounded-lg">
                  <p className="text-white/60 text-sm mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold text-white font-mono">{metric.value}</p>
                  <p className={`text-sm ${metric.change >= 0 ? "text-bright" : "text-accent"}`}>
                    {metric.change >= 0 ? "+" : ""}{metric.change}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-card rounded-xl border border-white/10 p-4">
      <p className="text-white/60 text-sm mb-1">{title}</p>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold text-white font-mono">{value}</span>
      </div>
    </div>
  );
}

function TabButton({ label, tab, activeTab, setActiveTab }: {
  label: string;
  tab: string;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}) {
  return (
    <button
      onClick={() => setActiveTab(tab)}
      className={`pb-2 px-1 ${
        activeTab === tab
          ? "border-b-2 border-primary text-primary"
          : "text-white/60 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };
  return <div className={`w-2 h-2 rounded-full ${colors[priority as keyof typeof colors]}`}></div>;
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-yellow-500/20 text-yellow-400",
    in_progress: "bg-blue-500/20 text-blue-400",
    done: "bg-green-500/20 text-green-400",
  };
  const labels = {
    pending: "Pendiente",
    in_progress: "En progreso",
    done: "Completada",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function InsightIcon({ type }: { type: string }) {
  const icons = {
    opportunity: <span className="text-bright">💡</span>,
    risk: <span className="text-accent">⚠️</span>,
    info: <span className="text-primary">ℹ️</span>,
  };
  return icons[type as keyof typeof icons];
}
