/**
 * Minimal MCP client (Streamable HTTP transport) for the Ubits MCP server, which exposes BigQuery
 * through the `run_query` tool. Only what the product reports need: initialize, list tools, call.
 */
export const UBITS_MCP_URL = "https://ubits-mcp.com/mcp/";
const PROTOCOL_VERSION = "2025-06-18";
const TIMEOUT_MS = 45_000;

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/** Responses may come as plain JSON or as an SSE stream of `data:` lines; return the one with `id`. */
export function parseMcpBody(body: string, contentType: string, id: number): JsonRpcResponse | null {
  const candidates = contentType.includes("text/event-stream")
    ? body
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
    : [body];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as JsonRpcResponse | JsonRpcResponse[];
      const messages = Array.isArray(parsed) ? parsed : [parsed];
      const match = messages.find((message) => message.id === id);
      if (match) return match;
    } catch {
      // keep looking: SSE streams can carry keep-alives or partial lines
    }
  }
  return null;
}

export class UbitsMcpClient {
  private sessionId: string | null = null;
  private nextId = 1;
  private initialized = false;

  constructor(private readonly token: string, private readonly url = UBITS_MCP_URL) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": PROTOCOL_VERSION,
      ...(this.sessionId ? { "Mcp-Session-Id": this.sessionId } : {}),
    };
  }

  private async send(method: string, params: Record<string, unknown> = {}, notification = false) {
    const id = this.nextId++;
    const payload = notification ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id, method, params };
    const response = await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const session = response.headers.get("mcp-session-id");
    if (session) this.sessionId = session;
    if (response.status === 401 || response.status === 403) {
      throw new Error("El MCP de Ubits rechazó el token. Revisa Configuración → MCP de Ubits.");
    }
    if (!response.ok && response.status !== 202) throw new Error(`El MCP de Ubits respondió ${response.status}.`);
    if (notification) return null;

    const message = parseMcpBody(await response.text(), response.headers.get("content-type") ?? "", id);
    if (!message) throw new Error(`El MCP de Ubits no devolvió respuesta para "${method}".`);
    if (message.error) throw new Error(`MCP de Ubits (${method}): ${message.error.message}`);
    return message.result ?? {};
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.send("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "nexion", version: "1.0.0" },
    });
    await this.send("notifications/initialized", {}, true);
    this.initialized = true;
  }

  async listTools(): Promise<string[]> {
    await this.initialize();
    const result = await this.send("tools/list");
    const tools = (result?.tools as Array<{ name: string }> | undefined) ?? [];
    return tools.map((tool) => tool.name);
  }

  /** Calls any MCP tool and returns its raw result (throws when the tool reports an error). */
  async callTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.initialize();
    const result = (await this.send("tools/call", { name, arguments: args })) ?? {};
    if (result.isError) {
      const content = result.content as Array<{ text?: string }> | undefined;
      throw new Error(`MCP de Ubits (${name}): ${content?.[0]?.text ?? "error desconocido"}`);
    }
    return result;
  }

  /** Runs BigQuery SQL through `run_query` and returns the rows. */
  async runQuery(sql: string): Promise<Record<string, unknown>[]> {
    try {
      return extractRows(await this.callTool("run_query", { sql }));
    } catch (error) {
      throw new Error((error instanceof Error ? error.message : String(error)).replace("MCP de Ubits (run_query):", "BigQuery rechazó la consulta:"));
    }
  }
}

/** Rows can arrive as structuredContent.result.rows, structuredContent.rows or JSON text content (as in n8n). */
export function extractRows(result: Record<string, unknown>): Record<string, unknown>[] {
  const structured = result.structuredContent as { result?: { rows?: unknown }; rows?: unknown } | undefined;
  const direct = structured?.result?.rows ?? structured?.rows ?? result.rows;
  if (Array.isArray(direct)) return direct as Record<string, unknown>[];

  const content = result.content as Array<{ type?: string; text?: string }> | undefined;
  for (const part of content ?? []) {
    if (!part.text) continue;
    try {
      const parsed = JSON.parse(part.text) as { rows?: unknown } | unknown[];
      if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
      if (parsed && Array.isArray((parsed as { rows?: unknown }).rows)) return (parsed as { rows: Record<string, unknown>[] }).rows;
    } catch {
      // not JSON: ignore
    }
  }
  return [];
}

/** Checks a token by opening a session and confirming `run_query` is available. */
export async function verifyUbitsMcpToken(token: string): Promise<string | null> {
  try {
    const tools = await new UbitsMcpClient(token).listTools();
    return tools.includes("run_query") ? null : "El token funciona, pero el MCP no expone la herramienta run_query.";
  } catch (error) {
    return error instanceof Error ? error.message : "No se pudo conectar con el MCP de Ubits.";
  }
}
