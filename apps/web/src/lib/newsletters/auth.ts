import { createClient } from "@supabase/supabase-js";

/** Returns the signed-in user id from the request's Supabase access token, or null. */
export async function getRequestUserId(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return null;

  const { data, error } = await createClient(url, anonKey).auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fails closed if the secret is unset. */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}
