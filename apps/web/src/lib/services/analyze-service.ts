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
    console.log("Starting Day Analysis with sources:", data.sources.length);

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Error desconocido" }));
      return { success: false, error: err.error || `Error ${response.status} en el servidor` };
    }

    const result = await response.json();
    
    return {
      success: true,
      summary: result.summary,
      tasks: result.tasks || [],
      insights: result.insights || [],
      metrics: result.metrics || [],
      alerts: result.alerts || [],
      feedback: result.feedback || [],
    };
  } catch (err) {
    console.error("Analysis service error:", err);
    return { success: false, error: "Error de red o servidor al conectar con Gemini" };
  }
}
