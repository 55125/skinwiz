// The MCP endpoint's JSON-RPC handling (lib/mcp/protocol.ts). `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { INVALID_PARAMS, INVALID_REQUEST, LATEST_VERSION, METHOD_NOT_FOUND, handleMessage, intArg, listArg, type Tool } from "./protocol";

const echo: Tool = {
  name: "echo",
  title: "Echo",
  description: "Says it back",
  inputSchema: { type: "object", properties: { word: { type: "string" } }, required: ["word"] },
  run: (args) => ({ text: String(args.word) }),
};
const broken: Tool = { ...echo, name: "broken", inputSchema: { type: "object", properties: {} }, run: () => { throw new Error("db down"); } };
const info = { name: "t", title: "T", version: "1", instructions: "hi" };
const call = (msg: unknown) => handleMessage(msg, [echo, broken], info) as { result?: Record<string, unknown>; error?: { code: number } } | null;

test("initialize echoes a supported version, else offers the latest", () => {
  const ok = call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } });
  assert.equal(ok?.result?.protocolVersion, "2025-03-26");
  assert.deepEqual(ok?.result?.capabilities, { tools: { listChanged: false } });
  const odd = call({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } });
  assert.equal(odd?.result?.protocolVersion, LATEST_VERSION);
});

test("notifications get no reply", () => {
  assert.equal(call({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});

test("tools are listed as read-only", () => {
  const r = call({ jsonrpc: "2.0", id: 3, method: "tools/list" });
  const tools = r?.result?.tools as { name: string; annotations: { readOnlyHint: boolean } }[];
  assert.deepEqual(tools.map((t) => t.name), ["echo", "broken"]);
  assert.ok(tools.every((t) => t.annotations.readOnlyHint));
});

test("tools/call runs the tool, checks required arguments, and turns a crash into a readable error", () => {
  const r = call({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "echo", arguments: { word: "retinol" } } });
  assert.deepEqual(r?.result, { content: [{ type: "text", text: "retinol" }], isError: false });
  assert.equal(call({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "echo", arguments: {} } })?.error?.code, INVALID_PARAMS);
  assert.equal(call({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "nope" } })?.error?.code, INVALID_PARAMS);
  const crashed = call({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "broken" } });
  assert.equal(crashed?.result?.isError, true);
  assert.doesNotMatch(JSON.stringify(crashed), /db down/);
});

test("bad messages and unknown methods are refused", () => {
  assert.equal(call({ id: 8, method: "ping" })?.error?.code, INVALID_REQUEST);
  assert.equal(call("ping")?.error?.code, INVALID_REQUEST);
  assert.equal(call({ jsonrpc: "2.0", id: 9, method: "resources/list" })?.error?.code, METHOD_NOT_FOUND);
  assert.deepEqual(call({ jsonrpc: "2.0", id: 10, method: "ping" })?.result, {});
});

test("argument readers clamp and clean", () => {
  assert.equal(intArg({ n: 50 }, "n", 1, 10, 5), 10);
  assert.equal(intArg({ n: "3" }, "n", 1, 10, 5), 3);
  assert.equal(intArg({}, "n", 1, 10, 5), 5);
  assert.deepEqual(listArg({ a: "fragrance, lanolin ,,fragrance" }, "a", 5, 20), ["fragrance", "lanolin"]);
  assert.deepEqual(listArg({ a: ["x", 3, "y", "z"] }, "a", 2, 20), ["x", "y"]);
});
