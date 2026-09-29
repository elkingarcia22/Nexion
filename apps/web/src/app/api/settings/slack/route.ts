import { verifySlackToken } from "@/lib/newsletters/clients";
import { SLACK_TOKEN_SECRET } from "@/lib/secrets";
import { createSecretHandlers } from "@/lib/settings/secret-route";

export const dynamic = "force-dynamic";

export const { GET, PUT, DELETE } = createSecretHandlers({
  secretName: SLACK_TOKEN_SECRET,
  format: /^xoxb-[A-Za-z0-9-]{20,}$/,
  formatError: 'Usa el "Bot User OAuth Token", que empieza por "xoxb-" (no el que empieza por "xoxp-").',
  verify: async (token) => {
    const check = await verifySlackToken(token);
    return check.ok ? null : check.error;
  },
  hasEnvFallback: () => Boolean(process.env.SLACK_BOT_TOKEN),
});
