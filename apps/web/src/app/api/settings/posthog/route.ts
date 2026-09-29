import { verifyPosthogKey } from "@/lib/analytics/posthog";
import { POSTHOG_KEY_SECRET } from "@/lib/secrets";
import { createSecretHandlers } from "@/lib/settings/secret-route";

export const dynamic = "force-dynamic";

export const { GET, PUT, DELETE } = createSecretHandlers({
  secretName: POSTHOG_KEY_SECRET,
  format: /^ph[a-z]_[A-Za-z0-9_-]{20,}$/,
  formatError: 'Usa una Personal API Key de PostHog (empieza por "phx_").',
  verify: verifyPosthogKey,
  hasEnvFallback: () => Boolean(process.env.POSTHOG_API_KEY),
});
