import type { ReportType } from "./periods";

/** Levels Nexión can build today, per product. Shared by the UI (buttons) and the API routes. */
export const GENERATED_LEVELS: Record<string, ReportType[]> = {
  hiring: ["radar_semanal"],
};

export function canGenerate(productId: string, type: ReportType): boolean {
  return GENERATED_LEVELS[productId]?.includes(type) ?? false;
}
