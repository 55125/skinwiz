import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { getProduct } from "@/lib/queries";
import { isSlot, setRegimenItem } from "@/lib/regimen";
import { getShelfEntry, setShelfEntry } from "@/lib/shelf";
import { rateLimit, readJsonBody } from "@/lib/api-guard";
import { onShelfChange } from "@/lib/checkins";

export async function POST(request: Request) {
  const limited = rateLimit(request, "regimen", 60, 60 * 1000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown> | null;

  const product = body && typeof body.productId === "string" ? getProduct(body.productId) : undefined;
  if (!body || !product) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }
  if (body.slot !== null && !isSlot(body.slot)) {
    return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
  }
  const sessionId = await getOrCreateSessionId();
  const result = setRegimenItem(sessionId, product.id, body.slot as never);
  if (result === "full") return NextResponse.json({ error: "Your regimen is full (40 products)." }, { status: 400 });

  // Something in your regimen is something you own and have opened. Only
  // fills in or upgrades the shelf entry -- removing from the regimen leaves
  // the shelf alone (you still own it). Goes through onShelfChange like the
  // shelf API, so starting a product here schedules outcome check-ins too.
  if (body.slot !== null) {
    const before = getShelfEntry(sessionId, product.id);
    if (!before || before.status !== "own" || !before.opened) {
      setShelfEntry(sessionId, product.id, "own", true);
      onShelfChange(sessionId, product.id, product.concernId, before, getShelfEntry(sessionId, product.id), new Date());
    }
  }
  return NextResponse.json({ ok: true });
}
