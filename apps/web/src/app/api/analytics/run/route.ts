import { NextResponse } from "next/server";
import { canGenerate } from "@/lib/analytics/generators";
import { runReport } from "@/lib/analytics/runner";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { createServiceClient } from "@/lib/newsletters/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** POST { product, type, date? } — builds a report as a preview (not posted to Slack). */
export async function POST(request: Request) {
  if (!(await getRequestUserId(request))) return NextResponse.json({ error: "Inicia sesión para generar reportes." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const product = typeof body.product === "string" ? body.product : "";
  const type = typeof body.type === "string" ? body.type : "";
  const date = typeof body.date === "string" && DATE.test(body.date) ? body.date : undefined;
  if (!canGenerate(product, type)) return NextResponse.json({ error: "Este nivel todavía no se genera desde Nexión." }, { status: 400 });

  try {
    const { report } = await runReport(createServiceClient(), product, type, { trigger: "manual", publish: false, date });
    return NextResponse.json({ report });
  } catch (error) {
    console.error(`[analytics/run] ${product} ${type} falló:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 });
  }
}
