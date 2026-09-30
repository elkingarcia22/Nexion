import { NextResponse } from "next/server";
import { completeSheetsConnection } from "@/lib/analytics/google-sheets";
import { createServiceClient } from "@/lib/newsletters/repository";

export const dynamic = "force-dynamic";

/** Google redirects here after the sign-in; the one-time `state` ties it to who started it. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = new URL("/settings", url.origin);
  back.searchParams.set("tab", "google_sheets");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  try {
    if (denied) throw new Error(denied === "access_denied" ? "Se canceló el acceso a Google." : `Google no autorizó la conexión: ${denied}`);
    if (!code || !state) throw new Error("La respuesta de Google llegó incompleta. Vuelve a intentarlo.");
    await completeSheetsConnection(createServiceClient(), code, state);
    back.searchParams.set("sheets", "connected");
  } catch (error) {
    console.error("[settings/google-sheets/callback]", error);
    back.searchParams.set("sheets_error", error instanceof Error ? error.message : "No se pudo conectar Google Sheets.");
  }
  return NextResponse.redirect(back);
}
