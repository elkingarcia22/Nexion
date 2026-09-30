"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REPORT_TYPE_LABELS, REPORT_TYPES, type ReportType } from "@/lib/analytics/periods";
import type { ActionStatus, AnalyticsAction, AnalyticsProduct, AnalyticsReport } from "@/lib/analytics/types";
import { canGenerate } from "@/lib/analytics/generators";
import {
  generateAnalyticsReport,
  getAnalyticsReportsByIds,
  listAnalyticsActions,
  listAnalyticsProducts,
  listAnalyticsReports,
  publishAnalyticsReport,
  updateAnalyticsAction,
} from "@/lib/services/analytics-client-service";
import { ReportTimeline } from "@/components/analytics/ReportTimeline";
import { ReportViewer } from "@/components/analytics/ReportViewer";
import { ActionsPanel } from "@/components/analytics/ActionsPanel";

/** Last day of a YYYY-MM month as YYYY-MM-DD, so "jump to" includes every period starting that month. */
function endOfMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10);
}

function levelsOf(product: AnalyticsProduct | undefined): ReportType[] {
  return REPORT_TYPES.filter((type) => product?.enabled_reports.includes(type));
}

function AnalyticsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productParam = searchParams.get("product");
  const levelParam = searchParams.get("level") as ReportType | null;
  const reportParam = searchParams.get("report");
  const monthParam = searchParams.get("until") ?? "";

  const [products, setProducts] = useState<AnalyticsProduct[]>([]);
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [selected, setSelected] = useState<AnalyticsReport | null>(null);
  const [actions, setActions] = useState<AnalyticsAction[]>([]);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"generate" | "publish" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const product = products.find((p) => p.id === productParam) ?? products[0];
  const levels = levelsOf(product);
  const level = levelParam && levels.includes(levelParam) ? levelParam : levels[0];

  const navigate = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      router.replace(`/analytics?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    listAnalyticsProducts().then((result) => {
      if (result.success) setProducts(result.data);
      else setError(result.error);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!product || !level) {
      setReports([]);
      return;
    }
    listAnalyticsReports(product.id, level, monthParam ? endOfMonth(monthParam) : undefined).then((result) => {
      if (result.success) setReports(result.data);
      else setError(result.error);
    });
  }, [product, level, monthParam, reloadKey]);

  useEffect(() => {
    if (!product) return;
    listAnalyticsActions(product.id).then((result) => setActions(result.success ? result.data : []));
  }, [product, reloadKey]);

  // The selected report comes from the URL; a drilled-down child may be outside the loaded page, so fetch it.
  useEffect(() => {
    const inList = reports.find((r) => r.id === reportParam);
    if (inList || !reportParam) {
      setSelected(inList ?? reports[0] ?? null);
      return;
    }
    getAnalyticsReportsByIds([reportParam]).then((result) => {
      setSelected(result.success && result.data[0] ? result.data[0] : reports[0] ?? null);
    });
  }, [reports, reportParam]);

  const handleGenerate = async () => {
    if (!product || !level) return;
    setBusy("generate");
    setError(null);
    setNotice(null);
    // With a month picked in "Ir a una fecha", build the period of this level that contains it.
    const result = await generateAnalyticsReport(product.id, level, monthParam ? `${monthParam}-15` : undefined);
    setBusy(null);
    if (!result.success) {
      setError(`No se pudo generar el reporte: ${result.error}`);
      return;
    }
    setNotice(result.data.status === "failed" ? `El reporte quedó con error: ${result.data.error}` : "Vista previa lista. Revísala y publícala en Slack cuando quieras.");
    navigate({ report: result.data.id, until: null });
    setReloadKey((key) => key + 1);
  };

  const handlePublish = async () => {
    if (!selected) return;
    setBusy("publish");
    setError(null);
    setNotice(null);
    const result = await publishAnalyticsReport(selected.id);
    setBusy(null);
    if (!result.success) {
      setError(`No se publicó en Slack: ${result.error}`);
      return;
    }
    setSelected(result.data);
    setNotice(`Publicado en #${product?.slack_channel_name}.`);
    setReloadKey((key) => key + 1);
  };

  const handleChangeActionStatus = async (action: AnalyticsAction, status: ActionStatus) => {
    setPendingActionId(action.id);
    const result = await updateAnalyticsAction(action.id, { status });
    if (result.success) setActions((current) => current.map((a) => (a.id === action.id ? { ...a, status } : a)));
    else setError(`No se pudo actualizar la acción: ${result.error}`);
    setPendingActionId(null);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-white">Analítica de producto</h1>
        <p className="text-xs text-white/40 mt-1">
          Reportes por producto: el radar semanal y el pulso quincenal alimentan los cortes mensual, trimestral, semestral y anual
        </p>
      </header>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3">
          {notice}
        </p>
      )}

      {!loading && !error && products.length === 0 && (
        <p className="text-sm text-white/40 bg-card/50 border border-white/5 rounded-2xl px-5 py-8 text-center">
          Aún no hay productos configurados.
        </p>
      )}

      {product && (
        <>
          <div role="tablist" aria-label="Producto" className="flex flex-wrap gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={p.id === product.id}
                onClick={() => navigate({ product: p.id, level: null, report: null, until: null })}
                className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-focus ${
                  p.id === product.id
                    ? "bg-primary border-primary text-white"
                    : "border-white/10 text-white/60 hover:border-primary/40 hover:text-white"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {levels.length === 0 ? (
            <p className="text-sm text-white/40 bg-card/50 border border-white/5 rounded-2xl px-5 py-8 text-center">
              {product.name} todavía no tiene fuentes de datos conectadas. Sus reportes aparecerán aquí cuando se configuren.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div role="tablist" aria-label="Nivel" className="flex flex-wrap rounded-xl border border-white/10 overflow-hidden">
                  {levels.map((type) => (
                    <button
                      key={type}
                      role="tab"
                      aria-selected={type === level}
                      onClick={() => navigate({ level: type, report: null })}
                      className={`px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${
                        type === level ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {REPORT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
                {level && canGenerate(product.id, level) && (
                  <button
                    onClick={handleGenerate}
                    disabled={busy !== null}
                    title={monthParam ? "Genera el periodo que contiene el mes elegido, como vista previa" : "Genera el último periodo completo como vista previa, sin publicarlo"}
                    className="px-3 py-2 rounded-xl border border-primary/40 text-[11px] font-black uppercase tracking-widest text-white hover:bg-primary/15 transition-colors disabled:opacity-50"
                  >
                    {busy === "generate" ? "Generando… (≈1 min)" : "Generar vista previa"}
                  </button>
                )}
                <span className="text-xs text-white/40">
                  Se publica en <span className="font-mono text-white/60">#{product.slack_channel_name}</span>
                  {!product.slack_channel_id && " (canal pendiente de conectar)"}
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="space-y-6">
                  <ReportTimeline
                    reports={reports}
                    selectedId={selected?.id ?? null}
                    onSelect={(report) => navigate({ report: report.id })}
                    jumpTo={monthParam}
                    onJump={(month) => navigate({ until: month || null, report: null })}
                  />
                  <section aria-labelledby="actions-heading">
                    <h2 id="actions-heading" className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                      Acciones propuestas
                    </h2>
                    <ActionsPanel actions={actions} pendingId={pendingActionId} onChangeStatus={handleChangeActionStatus} />
                  </section>
                </aside>

                {selected ? (
                  <ReportViewer
                    report={selected}
                    onPublish={handlePublish}
                    publishing={busy === "publish"}
                    onOpenChild={(child) => navigate({ level: child.report_type, report: child.id, until: null })}
                  />
                ) : (
                  <p className="text-sm text-white/40 bg-card/50 border border-white/5 rounded-2xl px-5 py-12 text-center self-start">
                    Selecciona un periodo para ver su reporte.
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsView />
    </Suspense>
  );
}
