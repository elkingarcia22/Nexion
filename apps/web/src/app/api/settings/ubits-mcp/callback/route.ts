import { NextResponse } from "next/server";
import { completeUbitsMcpConnection } from "@/lib/analytics/ubits-mcp-connection";
import { createServiceClient } from "@/lib/newsletters/repository";

export const dynamic = "force-dynamic";

/**
 * ubits-mcp.com redirects here after the Ubits sign-in. There is no Nexión session header on a
 * redirect, so the one-time `state` saved when the flow started is what ties it to the user.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = new URL("/settings", url.origin);
  back.searchParams.set("tab", "ubits_mcp");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  try {
    if (denied) throw new Error(`Ubits no autorizó la conexión: ${denied}`);
    if (!code || !state) throw new Error("La respuesta de Ubits llegó incompleta. Vuelve a intentarlo.");
    await completeUbitsMcpConnection(createServiceClient(), code, state);
    back.searchParams.set("mcp", "connected");
  } catch (error) {
    console.error("[settings/ubits-mcp/callback]", error);
    back.searchParams.set("mcp_error", error instanceof Error ? error.message : "No se pudo conectar el MCP de Ubits.");
  }
  return NextResponse.redirect(back);
}
