export interface AnalysisRequest {
  date: string;
  meetings: any[];
  sources: any[];
}

export interface AnalysisResult {
  success: boolean;
  summary?: string;
  tasks?: any[];
  insights?: any[];
  metrics?: any[];
  alerts?: any[];
  feedback?: any[];
  error?: string;
}

export async function analyzeDay(data: AnalysisRequest): Promise<AnalysisResult> {
  try {
    console.log("Starting Day Analysis...");

    // Simulate analysis with mock data for now
    // TODO: Replace with actual API call to /api/analyze when backend is ready
    const mockSummary = `Resumen del análisis del día ${data.date}. Se analizaron ${data.sources.length} fuentes y ${data.meetings.length} reuniones. El equipo identificó 3 decisiones críticas, 2 riesgos potenciales y 4 oportunidades de mejora. Se proponen 5 tareas inmediatas para las próximas 48 horas.`;

    const mockTasks = [
      {
        id: "1",
        title: "Implementar feedback del cliente",
        descripción: "Aplicar cambios sugeridos en la reunión de hoy con el cliente",
        prioridad: "alta",
        objetivo: "SATISFACCIÓN",
        documento: "Reporte Cliente.pdf",
        fecha_vencimiento: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        id: "2",
        title: "Revisar especificaciones técnicas",
        descripción: "Revisar y validar las especificaciones compartidas en Drive",
        prioridad: "media",
        objetivo: "CERTIFICADOS",
        documento: "Specs_Técnicas.docx",
        fecha_vencimiento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        id: "3",
        title: "Comunicar decisiones al equipo",
        descripción: "Compartir decisiones críticas identificadas en el análisis",
        prioridad: "alta",
        objetivo: "ESTRATÉGICO",
        documento: "Minuta Reunión.docx",
        fecha_vencimiento: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];

    const mockInsights = [
      {
        id: "1",
        category: "RETENCIÓN DE CLIENTES",
        categoryColor: "blue",
        description: "El incremento en el churn de usuarios de nivel medio se debe a la falta de integraciones con CRM externos.",
        source: "analysis_report_q3_final.pdf",
        sourceType: "pdf",
      },
      {
        id: "2",
        category: "OPTIMIZACIÓN UX",
        categoryColor: "teal",
        description: "La optimización del funnel de ventas en dispositivos móviles podría aumentar la conversión directa en un 12%.",
        source: "sales_funnel_tracking_oct.csv",
        sourceType: "sheet",
      },
      {
        id: "3",
        category: "SATISFACCIÓN CLIENTE",
        categoryColor: "red",
        description: "Existe una saturación de tickets de soporte relacionados con la configuración inicial del dashboard.",
        source: "intercom_logs_summary.json",
        sourceType: "doc",
      },
      {
        id: "4",
        category: "EXPANSIÓN MERCADO",
        categoryColor: "blue",
        description: "El mercado LatAm muestra un interés creciente (+45%) en soluciones de automatización fiscal.",
        source: "market_trends_global_2023.pdf",
        sourceType: "pdf",
      },
      {
        id: "5",
        category: "EFICIENCIA OPERATIVA",
        categoryColor: "teal",
        description: "Las empresas del sector Fintech reducen su tiempo de onboarding si se les proporciona un tutorial guiado.",
        source: "onboarding_flow_metrics.xlsx",
        sourceType: "sheet",
      },
    ];

    const mockMetrics = [
      {
        id: "1",
        nombre: "Fuentes analizadas",
        valor: data.sources.length,
        unidad: "documentos",
      },
      {
        id: "2",
        nombre: "Reuniones procesadas",
        valor: data.meetings.length,
        unidad: "eventos",
      },
      {
        id: "3",
        nombre: "Decisiones identificadas",
        valor: 3,
        unidad: "decisiones",
      },
      {
        id: "4",
        nombre: "Tareas propuestas",
        valor: mockTasks.length,
        unidad: "acciones",
      },
    ];

    const mockAlerts = [
      {
        id: "1",
        title: "Dependencia crítica en flujo de aprobación",
        description: "El proceso de validación de contratos depende de la firma digital de un proveedor externo que no estará disponible hasta el viernes.",
        priority: "critica",
        source: "contract_pipeline_status.pdf",
        sourceType: "pdf",
        fecha_accion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fecha_registro: new Date().toISOString().split('T')[0],
      },
      {
        id: "2",
        title: "Riesgo de incumplimiento en entrega del sprint",
        description: "Tres tickets críticos del sprint actual aún no tienen asignado responsable técnico, poniendo en riesgo el cierre del ciclo.",
        priority: "media",
        source: "sprint_board_export_oct.csv",
        sourceType: "sheet",
        fecha_accion: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fecha_registro: new Date().toISOString().split('T')[0],
      },
      {
        id: "3",
        title: "Escalamiento de cliente sin respuesta en 48h",
        description: "El cliente Acme Corp reportó un error crítico hace 48 horas y aún no recibe respuesta formal del equipo de soporte.",
        priority: "critica",
        source: "intercom_escalations_log.json",
        sourceType: "doc",
        fecha_accion: new Date().toISOString().split('T')[0],
        fecha_registro: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];

    const mockFeedback = [
      {
        id: "1",
        description: "Se detectó inconsistencia entre los requisitos funcionales y técnicos del módulo de pagos.",
        feedbackType: "observación",
        feedbackTypeColor: "blue",
        priority: "alta",
        source: "requirements_v2_final.pdf",
        sourceType: "pdf",
        fecha_registro: new Date().toISOString().split('T')[0],
      },
      {
        id: "2",
        description: "El equipo expresó preocupación sobre los plazos ajustados para el lanzamiento del Q4.",
        feedbackType: "preocupación",
        feedbackTypeColor: "red",
        priority: "critica",
        source: "team_meeting_notes_oct.docx",
        sourceType: "doc",
        fecha_registro: new Date().toISOString().split('T')[0],
      },
      {
        id: "3",
        description: "El cliente sugirió agregar exportación en formato Excel para los reportes de métricas.",
        feedbackType: "sugerencia",
        feedbackTypeColor: "teal",
        priority: "media",
        source: "client_call_transcript.pdf",
        sourceType: "pdf",
        fecha_registro: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];

    return {
      success: true,
      summary: mockSummary,
      tasks: mockTasks,
      insights: mockInsights,
      metrics: mockMetrics,
      alerts: mockAlerts,
      feedback: mockFeedback,
    };
  } catch (err) {
    console.error("Analysis service error:", err);
    return { success: false, error: "Error de red o servidor" };
  }
}
