import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/newsletters/auth";
import { isKnownNewsletter, runNewsletter } from "@/lib/newsletters/newsletter-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/cron/newsletters?id=ia-news-day — invoked by Vercel Cron (see vercel.json). */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!isKnownNewsletter(id)) {
    return NextResponse.json({ error: `Boletín desconocido: "${id}"` }, { status: 404 });
  }

  try {
    const outcome = await runNewsletter(id, { trigger: "cron", publish: true });
    return NextResponse.json(outcome);
  } catch (error) {
    console.error(`[cron/newsletters] ${id} falló:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
