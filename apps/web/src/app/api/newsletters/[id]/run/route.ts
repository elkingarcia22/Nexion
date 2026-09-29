import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { isKnownNewsletter, runNewsletter } from "@/lib/newsletters/newsletter-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/newsletters/:id/run — body `{ publish: boolean }`. Manual run from the Boletines page. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!(await getRequestUserId(request))) {
    return NextResponse.json({ error: "Inicia sesión para ejecutar boletines." }, { status: 401 });
  }
  if (!isKnownNewsletter(params.id)) {
    return NextResponse.json({ error: `Boletín desconocido: "${params.id}"` }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.publish !== "boolean") {
    return NextResponse.json({ error: 'El campo "publish" debe ser true o false.' }, { status: 400 });
  }

  try {
    const outcome = await runNewsletter(params.id, { trigger: "manual", publish: body.publish });
    return NextResponse.json(outcome);
  } catch (error) {
    console.error(`[newsletters/run] ${params.id} falló:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
