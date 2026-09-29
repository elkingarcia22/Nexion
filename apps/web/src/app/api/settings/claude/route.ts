import { verifyAnthropicKey } from "@/lib/newsletters/clients";
import { ANTHROPIC_KEY_SECRET } from "@/lib/secrets";
import { createSecretHandlers } from "@/lib/settings/secret-route";

export const dynamic = "force-dynamic";

export const { GET, PUT, DELETE } = createSecretHandlers({
  secretName: ANTHROPIC_KEY_SECRET,
  format: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
  formatError: 'La clave debe empezar por "sk-ant-".',
  verify: async (key) => ((await verifyAnthropicKey(key)) ? null : "Anthropic rechazó la clave. Revisa que esté activa."),
  hasEnvFallback: () => Boolean(process.env.ANTHROPIC_API_KEY),
});
