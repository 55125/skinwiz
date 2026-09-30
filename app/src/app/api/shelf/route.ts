import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { getProduct } from "@/lib/queries";
import { isShelfStatus, setShelfEntry } from "@/lib/shelf";
import { rateLimit, readJsonBody } from "@/lib/api-guard";

export async function POST(request: Request) {
  const limited = rateLimit(request, "shelf", 60, 60 * 1000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown> | null;

  if (!body || typeof body.productId !== "string" || !getProduct(body.productId)) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }
  if (body.status !== null && !isShelfStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const sessionId = await getOrCreateSessionId();
  const result = setShelfEntry(sessionId, body.productId, body.status as never, body.opened === true);
  if (result === "full") return NextResponse.json({ error: "Your shelf is full (500 items)." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
