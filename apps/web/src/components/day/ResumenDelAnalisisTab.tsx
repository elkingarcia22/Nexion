"use client";

interface ResumenAnalisis {
  summary_text?: string;
  hallazgos_clave?: {
    decisiones?: string[];
    riesgos?: string[];
    oportunidades?: string[];
  };
  proximos_pasos?: Array<{
    id: number;
    texto: string;
    prioridad: "critica" | "media" | "baja";
  }>;
}

export function ResumenDelAnalisisTab({ data }: { data: ResumenAnalisis }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Resumen del Informe */}
      {data.summary_text && (
        <div className="bg-white rounded-[2.5rem] border border-border/10 p-8 shadow-soft">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy">Resumen del Informe</h3>
          </div>
          <p className="text-base text-navy/80 leading-relaxed font-medium">
            {data.summary_text}
          </p>
        </div>
      )}

      {/* Hallazgos Clave */}
      {data.hallazgos_clave && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Decisiones */}
          {data.hallazgos_clave.decisiones && data.hallazgos_clave.decisiones.length > 0 && (
            <div className="bg-white rounded-3xl border border-border/20 p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-navy uppercase tracking-widest">Decisiones</h4>
              </div>
              <ul className="space-y-3">
                {data.hallazgos_clave.decisiones.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <span className="text-sm text-navy/70 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Riesgos */}
          {data.hallazgos_clave.riesgos && data.hallazgos_clave.riesgos.length > 0 && (
            <div className="bg-white rounded-3xl border border-border/20 p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-600">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-navy uppercase tracking-widest">Riesgos</h4>
              </div>
              <ul className="space-y-3">
                {data.hallazgos_clave.riesgos.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
                    <span className="text-sm text-navy/70 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Oportunidades */}
          {data.hallazgos_clave.oportunidades && data.hallazgos_clave.oportunidades.length > 0 && (
            <div className="bg-white rounded-3xl border border-border/20 p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                    <path d="M9 17h6" />
                    <path d="M12 14v6" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-navy uppercase tracking-widest">Oportunidades</h4>
              </div>
              <ul className="space-y-3">
                {data.hallazgos_clave.oportunidades.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                    <span className="text-sm text-navy/70 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Próximos Pasos Sugeridos */}
      {data.proximos_pasos && data.proximos_pasos.length > 0 && (
        <div className="bg-white rounded-3xl border border-border/20 p-8 shadow-soft">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy">Próximos Pasos Sugeridos</h3>
          </div>
          <div className="space-y-3">
            {data.proximos_pasos.map((paso, i) => (
              <div key={paso.id} className="flex items-start gap-4 pb-4 border-b border-border/10 last:border-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-navy/5 flex items-center justify-center text-navy font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-base text-navy/80 font-medium">{paso.texto}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest whitespace-nowrap ${
                  paso.prioridad === "critica"
                    ? "bg-red-50 text-red-600"
                    : paso.prioridad === "media"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-blue-50 text-blue-600"
                }`}>
                  {paso.prioridad}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
