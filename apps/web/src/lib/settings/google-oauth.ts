const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const TIMEOUT_MS = 15_000;

/**
 * Checks an OAuth client without any user token: Google answers `invalid_grant` to a bogus refresh
 * token when the client ID/secret are valid, and `invalid_client` when they are not.
 * Returns an error message, or null if the client is valid.
 */
export async function verifyGoogleOAuthClient(clientId: string, clientSecret: string): Promise<string | null> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: "nexion-credential-check",
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));

  if (data.error === "invalid_grant") return null;
  if (data.error === "invalid_client" || data.error === "unauthorized_client") {
    return "Google rechazó el Client ID o el Client Secret. Revisa que sean del mismo cliente OAuth.";
  }
  return `Google respondió algo inesperado: ${data.error_description ?? data.error ?? response.status}`;
}
