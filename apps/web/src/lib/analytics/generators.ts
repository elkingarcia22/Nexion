import type { ReportType } from "./periods";

const ROLLUPS: ReportType[] = ["mensual", "trimestral", "semestral", "anual"];

/** Levels Nexión can build today, per product. Shared by the UI (buttons), the API routes and the crons. */
export const GENERATED_LEVELS: Record<string, ReportType[]> = {
  hiring: ["radar_semanal", "pulso_quincenal", ...ROLLUPS],
  objetivos: ["pulso_quincenal", ...ROLLUPS],
  "matriz-talento": ["pulso_quincenal", ...ROLLUPS],
  encuestas: ["pulso_quincenal", ...ROLLUPS],
  "evaluacion-360": ["pulso_quincenal", ...ROLLUPS],
};

export function canGenerate(productId: string, type: string): type is ReportType {
  return GENERATED_LEVELS[productId]?.includes(type as ReportType) ?? false;
}
