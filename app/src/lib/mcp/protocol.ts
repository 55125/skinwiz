// The Model Context Protocol, just the part a stateless, read-only, tools-only
// server needs: initialize, ping, tools/list and tools/call over JSON-RPC 2.0,
// answered as plain JSON (the "Streamable HTTP" transport allows a JSON reply
// instead of an event stream). No sessions, no server-initiated messages, so
// every POST stands alone and any replica can answer it. Kept free of the
// database so it can be tested on its own (`npm test`); the tools live in
// lib/mcp/tools.ts and the endpoint in app/mcp/route.ts.

export const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
export const LATEST_VERSION = SUPPORTED_VERSIONS[0];

export type JsonSchema = { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };

export type ToolResult = { text: string; isError?: boolean };

export type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  run: (args: Record<string, unknown>) => ToolResult;
};

export type ServerInfo = { name: string; title: string; version: string; websiteUrl?: string; instructions: string };

type Id = string | number | null;
export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: Id; result: unknown }
  | { jsonrpc: "2.0"; id: Id; error: { code: number; message: string } };

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;

const fail = (id: Id, code: number, message: string): JsonRpcResponse => ({ jsonrpc: "2.0", id, error: { code, message } });

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Answers one JSON-RPC message. null for a notification (no id), which gets
 * no reply; the endpoint sends 202 for those.
 */
export function handleMessage(msg: unknown, tools: Tool[], info: ServerInfo): JsonRpcResponse | null {
  if (!isRecord(msg) || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    const id = isRecord(msg) && (typeof msg.id === "string" || typeof msg.id === "number") ? msg.id : null;
    return fail(id, INVALID_REQUEST, "Not a JSON-RPC 2.0 request.");
  }
  if (!("id" in msg)) return null;
  const id = msg.id as Id;
  const params = isRecord(msg.params) ? msg.params : {};

  switch (msg.method) {
    case "initialize": {
      const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : LATEST_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: info.name, title: info.title, version: info.version, ...(info.websiteUrl ? { websiteUrl: info.websiteUrl } : {}) },
          instructions: info.instructions,
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            title: t.title,
            description: t.description,
            inputSchema: t.inputSchema,
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
          })),
        },
      };
    case "tools/call": {
      const tool = tools.find((t) => t.name === params.name);
      if (!tool) return fail(id, INVALID_PARAMS, `Unknown tool: ${String(params.name)}`);
      const args = isRecord(params.arguments) ? params.arguments : {};
      const missing = (tool.inputSchema.required ?? []).filter((k) => args[k] === undefined || args[k] === null || args[k] === "");
      if (missing.length) return fail(id, INVALID_PARAMS, `Missing argument: ${missing.join(", ")}`);
      let out: ToolResult;
      try {
        out = tool.run(args);
      } catch (e) {
        // A tool failure is a result the model can read, not a protocol error.
        console.error(`[mcp] ${tool.name} failed:`, e);
        out = { text: "That lookup failed on our side. Please try again later.", isError: true };
      }
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: out.text }], isError: out.isError ?? false } };
    }
    default:
      return fail(id, METHOD_NOT_FOUND, `Method not supported: ${msg.method}`);
  }
}

/** Reads a string argument, trimmed and capped; "" when absent or not a string. */
export function textArg(args: Record<string, unknown>, key: string, max: number): string {
  const v = args[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Reads a whole-number argument clamped to [min, max], else the fallback. */
export function intArg(args: Record<string, unknown>, key: string, min: number, max: number, fallback: number): number {
  const v = args[key];
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/** Reads a list of short strings (an array, or one comma-separated string). */
export function listArg(args: Record<string, unknown>, key: string, maxItems: number, maxLen: number): string[] {
  const v = args[key];
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const out = raw.flatMap((s) => (typeof s === "string" && s.trim() ? [s.trim().slice(0, maxLen)] : []));
  return [...new Set(out)].slice(0, maxItems);
}
