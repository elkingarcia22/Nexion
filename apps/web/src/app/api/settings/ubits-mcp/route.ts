import { verifyUbitsMcpToken } from "@/lib/analytics/ubits-mcp";
import { UBITS_MCP_TOKEN_SECRET } from "@/lib/secrets";
import { createSecretHandlers } from "@/lib/settings/secret-route";

export const dynamic = "force-dynamic";

export const { GET, PUT, DELETE } = createSecretHandlers({
  secretName: UBITS_MCP_TOKEN_SECRET,
  format: /^\S{16,}$/,
  formatError: "El token del MCP de Ubits parece incompleto (debe tener al menos 16 caracteres, sin espacios).",
  verify: verifyUbitsMcpToken,
  hasEnvFallback: () => Boolean(process.env.UBITS_MCP_TOKEN),
});
