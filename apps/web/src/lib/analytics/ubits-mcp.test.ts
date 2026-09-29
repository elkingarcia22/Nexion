import { afterEach, describe, expect, it, vi } from "vitest";
import { extractRows, parseMcpBody, UbitsMcpClient } from "./ubits-mcp";

afterEach(() => vi.unstubAllGlobals());

describe("parseMcpBody", () => {
  it("reads plain JSON and SSE-framed responses", () => {
    expect(parseMcpBody('{"jsonrpc":"2.0","id":3,"result":{"ok":true}}', "application/json", 3)?.result).toEqual({ ok: true });
    const sse = 'event: message\ndata: {"jsonrpc":"2.0","method":"ping"}\n\ndata: {"jsonrpc":"2.0","id":7,"result":{"x":1}}\n';
    expect(parseMcpBody(sse, "text/event-stream", 7)?.result).toEqual({ x: 1 });
  });
});

describe("extractRows", () => {
  it("supports the shapes the n8n flow handled", () => {
    expect(extractRows({ structuredContent: { result: { rows: [{ a: 1 }] } } })).toEqual([{ a: 1 }]);
    expect(extractRows({ content: [{ type: "text", text: '{"rows":[{"b":2}]}' }] })).toEqual([{ b: 2 }]);
    expect(extractRows({ content: [{ type: "text", text: "not json" }] })).toEqual([]);
  });
});

describe("UbitsMcpClient", () => {
  it("initializes, keeps the session id and calls run_query", async () => {
    const calls: Array<{ body: { method: string }; session: string | undefined }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string; headers: Record<string, string> }) => {
        const body = JSON.parse(init.body);
        calls.push({ body, session: init.headers["Mcp-Session-Id"] });
        const headers = { "content-type": "application/json", "mcp-session-id": "s-1" };
        if (body.method === "notifications/initialized") return new Response(null, { status: 202, headers });
        const result = body.method === "tools/call" ? { structuredContent: { rows: [{ empresas: 12 }] } } : {};
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }), { headers });
      })
    );

    const rows = await new UbitsMcpClient("token").runQuery("select 1");

    expect(rows).toEqual([{ empresas: 12 }]);
    expect(calls.map((c) => c.body.method)).toEqual(["initialize", "notifications/initialized", "tools/call"]);
    expect(calls[2].session).toBe("s-1");
  });

  it("explains an invalid token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unauthorized", { status: 401 })));
    await expect(new UbitsMcpClient("bad").listTools()).rejects.toThrow(/rechazó el token/);
  });
});
