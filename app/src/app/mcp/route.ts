import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api-guard";
import { SITE_NAME } from "@/lib/brand";
import { siteUrl } from "@/lib/site-url";
import { INVALID_REQUEST, PARSE_ERROR, handleMessage, type ServerInfo } from "@/lib/mcp/protocol";
import { EDUCATION_NOTE, TOOLS } from "@/lib/mcp/tools";

// Public, read-only MCP server (lib/mcp/), so people can connect Actively to
// their own AI assistant: setup steps on /connect. Stateless Streamable HTTP:
// each POST carries one JSON-RPC message and gets one JSON reply, so there is
// no session to keep and GET (the server-to-client stream) is refused.
//
// Bot defence: src/proxy.ts judges /mcp like any page (UA blocks, per-IP page
// limits, bans). On top of that, a per-IP budget sized for one person's
// assistant, and a site-wide ceiling so a flood spread over many IPs can't
// turn this into a faster way to copy the catalog than the pages.
const PER_IP_PER_MINUTE = 30;
const SITE_WIDE_PER_MINUTE = 600;
const MAX_BODY_BYTES = 16 * 1024;

const siteWide = { start: 0, count: 0 };

function info(): ServerInfo {
  return {
    name: "actively",
    title: SITE_NAME,
    version: "1.0.0",
    websiteUrl: siteUrl(),
    instructions:
      `${SITE_NAME} (${siteUrl()}) is a dermatologist-run catalog of US over-the-counter skincare, hair and oral care products and their published ingredient lists. ` +
      "Use it to find products, read ingredient lists, and check products or pasted lists against ingredients and contact allergens a person avoids. " +
      "Link the person to the page each answer cites. " +
      EDUCATION_NOTE +
      " Never present results as a diagnosis or treatment plan.",
  };
}

function jsonRpcError(code: number, message: string, status = 400) {
  return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "mcp", PER_IP_PER_MINUTE, 60_000);
  if (limited) return limited;
  const now = Date.now();
  if (now - siteWide.start >= 60_000) {
    siteWide.start = now;
    siteWide.count = 0;
  }
  if (++siteWide.count > SITE_WIDE_PER_MINUTE) {
    return NextResponse.json({ error: "The service is busy. Please try again in a minute." }, { status: 503, headers: { "Retry-After": "60" } });
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return jsonRpcError(INVALID_REQUEST, "Request too large.", 413);
  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return jsonRpcError(INVALID_REQUEST, "Request too large.", 413);
  let msg: unknown;
  try {
    msg = JSON.parse(text);
  } catch {
    return jsonRpcError(PARSE_ERROR, "Body is not valid JSON.");
  }
  // Batches were dropped from the protocol in 2025-06-18; one message per POST.
  if (Array.isArray(msg)) return jsonRpcError(INVALID_REQUEST, "Send one JSON-RPC message per request.");

  const reply = handleMessage(msg, TOOLS, info());
  if (!reply) return new NextResponse(null, { status: 202 });
  return NextResponse.json(reply, { headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  return new NextResponse(`This is ${SITE_NAME}'s MCP endpoint for AI assistants. Setup steps: ${siteUrl()}/connect`, {
    status: 405,
    headers: { Allow: "POST", "Content-Type": "text/plain; charset=utf-8" },
  });
}

export function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
