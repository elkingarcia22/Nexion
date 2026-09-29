import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/newsletters/auth";
import { createServiceClient } from "@/lib/newsletters/repository";

const VISIBLE_SUFFIX_CHARS = 4;

export interface SecretRouteConfig {
  /** Row name in `app_secrets`. */
  secretName: string;
  /** Shape check that runs before any network call. */
  format: RegExp;
  formatError: string;
  /** Returns an error message if the provider rejects the value, or null if it is good. */
  verify: (value: string) => Promise<string | null>;
  /** True when an environment variable can stand in for a missing saved value. */
  hasEnvFallback: () => boolean;
}

function unauthorized() {
  return NextResponse.json({ error: "Inicia sesión con Google para administrar esta clave." }, { status: 401 });
}

function serverError(scope: string, error: unknown) {
  console.error(`[settings/${scope}]`, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 });
}

/**
 * GET/PUT/DELETE handlers for one organization-level secret.
 * The value is write-only: responses only say whether it is set and its last 4 characters.
 */
export function createSecretHandlers(config: SecretRouteConfig) {
  const { secretName } = config;

  async function GET(request: Request) {
    if (!(await getRequestUserId(request))) return unauthorized();
    try {
      const { data, error } = await createServiceClient()
        .from("app_secrets")
        .select("value, updated_at")
        .eq("name", secretName)
        .maybeSingle();
      if (error) throw new Error(error.message);

      return NextResponse.json({
        configured: Boolean(data),
        last4: data ? data.value.slice(-VISIBLE_SUFFIX_CHARS) : null,
        updatedAt: data?.updated_at ?? null,
        usingEnvFallback: !data && config.hasEnvFallback(),
      });
    } catch (error) {
      return serverError(secretName, error);
    }
  }

  async function PUT(request: Request) {
    const userId = await getRequestUserId(request);
    if (!userId) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const value = typeof body.value === "string" ? body.value.trim() : "";
    if (!config.format.test(value)) return NextResponse.json({ error: config.formatError }, { status: 400 });

    try {
      const rejection = await config.verify(value);
      if (rejection) return NextResponse.json({ error: rejection }, { status: 400 });

      const { error } = await createServiceClient()
        .from("app_secrets")
        .upsert({ name: secretName, value, updated_by: userId, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);

      return NextResponse.json({ configured: true, last4: value.slice(-VISIBLE_SUFFIX_CHARS) });
    } catch (error) {
      return serverError(secretName, error);
    }
  }

  async function DELETE(request: Request) {
    if (!(await getRequestUserId(request))) return unauthorized();
    try {
      const { error } = await createServiceClient().from("app_secrets").delete().eq("name", secretName);
      if (error) throw new Error(error.message);
      return NextResponse.json({ configured: false });
    } catch (error) {
      return serverError(secretName, error);
    }
  }

  return { GET, PUT, DELETE };
}
