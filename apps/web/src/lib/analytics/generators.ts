import type { ReportType } from "./periods";

/** Levels Nexión can build today, per product. Shared by the UI (buttons), the API routes and the crons. */
export const GENERATED_LEVELS: Record<string, ReportType[]> = {
  hiring: ["radar_semanal", "pulso_quincenal"],
  objetivos: ["pulso_quincenal"],
  "matriz-talento": ["pulso_quincenal"],
  encuestas: ["pulso_quincenal"],
  "evaluacion-360": ["pulso_quincenal"],
};

export function canGenerate(productId: string, type: string): type is ReportType {
  return GENERATED_LEVELS[productId]?.includes(type as ReportType) ?? false;
}
