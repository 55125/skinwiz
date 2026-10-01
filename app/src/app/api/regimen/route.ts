import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { getProduct } from "@/lib/queries";
import { isSlot, setRegimenItem } from "@/lib/regimen";
import { getShelfEntry, setShelfEntry } from "@/lib/shelf";
import { rateLimit, readJsonBody } from "@/lib/api-guard";

export async function POST(request: Request) {
  const limited = rateLimit(request, "regimen", 60, 60 * 1000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown> | null;

  if (!body || typeof body.productId !== "string" || !getProduct(body.productId)) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }
  if (body.slot !== null && !isSlot(body.slot)) {
    return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
  }
  const sessionId = await getOrCreateSessionId();
  const result = setRegimenItem(sessionId, body.productId, body.slot as never);
  if (result === "full") return NextResponse.json({ error: "Your regimen is full (40 products)." }, { status: 400 });

  // Something in your regimen is something you own and have opened. Only
  // fills in or upgrades the shelf entry -- removing from the regimen leaves
  // the shelf alone (you still own it).
  if (body.slot !== null) {
    const entry = getShelfEntry(sessionId, body.productId);
    if (!entry || entry.status !== "own" || !entry.opened) setShelfEntry(sessionId, body.productId, "own", true);
  }
  return NextResponse.json({ ok: true });
}
