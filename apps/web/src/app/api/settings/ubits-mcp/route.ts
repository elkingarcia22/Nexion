import { NextResponse } from "next/server";
import { disconnectUbitsMcp, getUbitsMcpStatus } from "@/lib/analytics/ubits-mcp-connection";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { createServiceClient } from "@/lib/newsletters/repository";
import { serverError, unauthorized } from "@/lib/settings/secret-route";

export const dynamic = "force-dynamic";

/** Connection status only: the token itself never leaves the server. */
export async function GET(request: Request) {
  if (!(await getRequestUserId(request))) return unauthorized();
  try {
    return NextResponse.json(await getUbitsMcpStatus(createServiceClient()));
  } catch (error) {
    return serverError("ubits-mcp", error);
  }
}

export async function DELETE(request: Request) {
  if (!(await getRequestUserId(request))) return unauthorized();
  try {
    await disconnectUbitsMcp(createServiceClient());
    return NextResponse.json({ connected: false });
  } catch (error) {
    return serverError("ubits-mcp", error);
  }
}
