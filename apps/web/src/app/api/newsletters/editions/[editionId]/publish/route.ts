import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { publishPreview } from "@/lib/newsletters/newsletter-service";

export const dynamic = "force-dynamic";

/** POST /api/newsletters/editions/:editionId/publish — send a stored preview to Slack. */
export async function POST(request: Request, { params }: { params: { editionId: string } }) {
  if (!(await getRequestUserId(request))) {
    return NextResponse.json({ error: "Inicia sesión para publicar boletines." }, { status: 401 });
  }

  try {
    return NextResponse.json(await publishPreview(params.editionId));
  } catch (error) {
    console.error(`[newsletters/publish] ${params.editionId} falló:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
