import { NextResponse } from "next/server";
import { canGenerate } from "@/lib/analytics/generators";
import { runReport } from "@/lib/analytics/runner";
import { isAuthorizedCron } from "@/lib/newsletters/auth";
import { createServiceClient } from "@/lib/newsletters/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/analytics?product=hiring&type=radar_semanal — invoked by Vercel Cron (see vercel.json).
 * Pulses run every Monday: on the Monday without a newly closed pulse the run is skipped as already published.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const product = params.get("product") ?? "";
  const type = params.get("type") ?? "";
  if (!canGenerate(product, type)) return NextResponse.json({ error: `Reporte desconocido: ${product} / ${type}` }, { status: 404 });

  try {
    const { report, skipped, slackError } = await runReport(createServiceClient(), product, type, { trigger: "cron", publish: true });
    return NextResponse.json({ id: report.id, period: report.period_key, status: report.status, skipped, slackError, error: report.error });
  } catch (error) {
    console.error(`[cron/analytics] ${product} ${type} falló:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 });
  }
}
