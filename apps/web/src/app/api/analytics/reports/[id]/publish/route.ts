import { NextResponse } from "next/server";
import { publishReport } from "@/lib/analytics/report-engine";
import { getAnalyticsProduct, getReportById } from "@/lib/analytics/repository";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { createServiceClient } from "@/lib/newsletters/repository";

export const dynamic = "force-dynamic";

/** POST — posts a stored preview to its product's Slack channel. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!(await getRequestUserId(request))) return NextResponse.json({ error: "Inicia sesión para publicar reportes." }, { status: 401 });

  try {
    const db = createServiceClient();
    const report = await getReportById(db, params.id);
    if (report.status === "published") return NextResponse.json({ error: "Este reporte ya se publicó en Slack." }, { status: 409 });
    const product = await getAnalyticsProduct(db, report.product_id);
    const outcome = await publishReport(db, report, product.slack_channel_id);
    if (outcome.slackError) return NextResponse.json({ error: outcome.slackError, report: outcome.report }, { status: 502 });
    return NextResponse.json({ report: outcome.report });
  } catch (error) {
    console.error(`[analytics/publish] ${params.id} falló:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 });
  }
}
