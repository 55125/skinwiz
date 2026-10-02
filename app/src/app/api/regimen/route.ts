import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { getAnyProduct, getProduct } from "@/lib/queries";
import { getRegimenSlot, isSlot, setRegimenItem } from "@/lib/regimen";
import { getOwnedRegimen, primaryOwnRegimenId } from "@/lib/regimens";
import { getShelfEntry, setShelfEntry } from "@/lib/shelf";
import { rateLimit, readJsonBody } from "@/lib/api-guard";

// Add / move / remove a product in one of the visitor's own regimens: the
// one named by regimenId (the regimen page), else their primary own regimen
// (product pages). A prescription product can never be ADDED here -- it only
// reaches a regimen from a clinician's plan (a personal copy) -- but one
// already in the regimen can be moved or removed.
export async function POST(request: Request) {
  const limited = rateLimit(request, "regimen", 60, 60 * 1000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown> | null;

  if (!body || typeof body.productId !== "string") return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  if (body.slot !== null && !isSlot(body.slot)) {
    return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
  }
  const sessionId = await getOrCreateSessionId();
  let regimenId: number | null = null;
  if (body.regimenId !== undefined && body.regimenId !== null) {
    const r = getOwnedRegimen(sessionId, Number(body.regimenId));
    if (!r || r.kind !== "own") return NextResponse.json({ error: "That regimen can't be edited." }, { status: 400 });
    regimenId = r.id;
  } else {
    regimenId = primaryOwnRegimenId(sessionId, body.slot !== null);
  }
  if (regimenId === null) return NextResponse.json({ ok: true }); // removing from a regimen that doesn't exist

  const otc = getProduct(body.productId);
  if (!otc) {
    const rx = getAnyProduct(body.productId);
    if (!rx || getRegimenSlot(regimenId, rx.id) === null) return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }
  const result = setRegimenItem(sessionId, regimenId, body.productId, body.slot as never);
  if (result === "full") return NextResponse.json({ error: "Your regimen is full (40 products)." }, { status: 400 });

  // Something in your regimen is something you own and have opened. Only
  // fills in or upgrades the shelf entry -- removing from the regimen leaves
  // the shelf alone (you still own it). Prescription items stay off the shelf.
  if (otc && body.slot !== null) {
    const entry = getShelfEntry(sessionId, body.productId);
    if (!entry || entry.status !== "own" || !entry.opened) setShelfEntry(sessionId, body.productId, "own", true);
  }
  return NextResponse.json({ ok: true });
}
