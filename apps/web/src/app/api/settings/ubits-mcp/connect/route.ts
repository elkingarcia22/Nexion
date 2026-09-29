import { NextResponse } from "next/server";
import { startUbitsMcpConnection } from "@/lib/analytics/ubits-mcp-connection";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { createServiceClient } from "@/lib/newsletters/repository";
import { serverError, unauthorized } from "@/lib/settings/secret-route";

export const dynamic = "force-dynamic";

/** Starts the Ubits sign-in and returns the ubits-mcp.com URL the browser should open. */
export async function POST(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();
  try {
    const redirectUri = new URL("/api/settings/ubits-mcp/callback", request.url).toString();
    const authorizeUrl = await startUbitsMcpConnection(createServiceClient(), userId, redirectUri);
    return NextResponse.json({ authorizeUrl });
  } catch (error) {
    return serverError("ubits-mcp/connect", error);
  }
}
