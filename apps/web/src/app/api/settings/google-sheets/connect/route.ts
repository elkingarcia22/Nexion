import { NextResponse } from "next/server";
import { startSheetsConnection } from "@/lib/analytics/google-sheets";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { createServiceClient } from "@/lib/newsletters/repository";
import { serverError, unauthorized } from "@/lib/settings/secret-route";

export const dynamic = "force-dynamic";

function sheetsRedirectUri(request: Request): string {
  return new URL("/api/settings/google-sheets/callback", request.url).toString();
}

/** Starts the Google sign-in (read-only Sheets scope) and returns the URL the browser should open. */
export async function POST(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();
  try {
    const authorizeUrl = await startSheetsConnection(createServiceClient(), userId, sheetsRedirectUri(request));
    return NextResponse.json({ authorizeUrl });
  } catch (error) {
    return serverError("google-sheets/connect", error);
  }
}
