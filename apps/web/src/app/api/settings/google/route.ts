import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { createServiceClient } from "@/lib/newsletters/repository";
import { GOOGLE_CLIENT_ID_SECRET, GOOGLE_CLIENT_SECRET_SECRET } from "@/lib/secrets";
import { verifyGoogleOAuthClient } from "@/lib/settings/google-oauth";
import { serverError, unauthorized, VISIBLE_SUFFIX_CHARS } from "@/lib/settings/secret-route";

export const dynamic = "force-dynamic";

const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/;
const CLIENT_SECRET_PATTERN = /^[A-Za-z0-9_-]{20,}$/;
const NAMES = [GOOGLE_CLIENT_ID_SECRET, GOOGLE_CLIENT_SECRET_SECRET];

/** GET — whether the OAuth client is saved. Shows the (non-secret) Client ID and the secret's last 4 characters. */
export async function GET(request: Request) {
  if (!(await getRequestUserId(request))) return unauthorized();
  try {
    const { data, error } = await createServiceClient().from("app_secrets").select("name, value").in("name", NAMES);
    if (error) throw new Error(error.message);
    const byName = new Map((data ?? []).map((row) => [row.name as string, row.value as string]));
    const clientId = byName.get(GOOGLE_CLIENT_ID_SECRET) ?? null;
    const secret = byName.get(GOOGLE_CLIENT_SECRET_SECRET) ?? null;

    return NextResponse.json({
      configured: Boolean(clientId && secret),
      clientId,
      last4: secret ? secret.slice(-VISIBLE_SUFFIX_CHARS) : null,
      usingEnvFallback: !(clientId && secret) && Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    });
  } catch (error) {
    return serverError("google", error);
  }
}

/** PUT `{ clientId, clientSecret }` — verifies the pair with Google, then stores both. */
export async function PUT(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    return NextResponse.json({ error: 'El Client ID debe terminar en ".apps.googleusercontent.com".' }, { status: 400 });
  }
  if (!CLIENT_SECRET_PATTERN.test(clientSecret)) {
    return NextResponse.json({ error: "El Client Secret no tiene un formato válido." }, { status: 400 });
  }

  try {
    const rejection = await verifyGoogleOAuthClient(clientId, clientSecret);
    if (rejection) return NextResponse.json({ error: rejection }, { status: 400 });

    const updatedAt = new Date().toISOString();
    const { error } = await createServiceClient()
      .from("app_secrets")
      .upsert([
        { name: GOOGLE_CLIENT_ID_SECRET, value: clientId, updated_by: userId, updated_at: updatedAt },
        { name: GOOGLE_CLIENT_SECRET_SECRET, value: clientSecret, updated_by: userId, updated_at: updatedAt },
      ]);
    if (error) throw new Error(error.message);

    return NextResponse.json({ configured: true, clientId, last4: clientSecret.slice(-VISIBLE_SUFFIX_CHARS) });
  } catch (error) {
    return serverError("google", error);
  }
}

/** DELETE — removes both values (falls back to GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET if set). */
export async function DELETE(request: Request) {
  if (!(await getRequestUserId(request))) return unauthorized();
  try {
    const { error } = await createServiceClient().from("app_secrets").delete().in("name", NAMES);
    if (error) throw new Error(error.message);
    return NextResponse.json({ configured: false });
  } catch (error) {
    return serverError("google", error);
  }
}
