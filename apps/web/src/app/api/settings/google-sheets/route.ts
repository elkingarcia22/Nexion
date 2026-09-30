import { NextResponse } from "next/server";
import { disconnectSheets, getSheetsStatus } from "@/lib/analytics/google-sheets";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { createServiceClient } from "@/lib/newsletters/repository";
import { serverError, unauthorized } from "@/lib/settings/secret-route";

export const dynamic = "force-dynamic";

/** Connection status only: tokens never leave the server. */
export async function GET(request: Request) {
  if (!(await getRequestUserId(request))) return unauthorized();
  try {
    return NextResponse.json(await getSheetsStatus(createServiceClient()));
  } catch (error) {
    return serverError("google-sheets", error);
  }
}

export async function DELETE(request: Request) {
  if (!(await getRequestUserId(request))) return unauthorized();
  try {
    await disconnectSheets(createServiceClient());
    return NextResponse.json({ connected: false });
  } catch (error) {
    return serverError("google-sheets", error);
  }
}
