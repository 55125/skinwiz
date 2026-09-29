import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { getProduct } from "@/lib/queries";
import { logOutcome } from "@/lib/outcomes";
import { getScoresForProducts } from "@/lib/scoring";

const MAX_WEEKS = 104;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(decodeURIComponent(id));
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.improved !== "boolean") {
    return NextResponse.json({ error: "improved must be true or false." }, { status: 400 });
  }
  let weeksUsed: number | null = null;
  if (body.weeksUsed !== null && body.weeksUsed !== undefined) {
    const n = Number(body.weeksUsed);
    if (!Number.isInteger(n) || n < 1 || n > MAX_WEEKS) {
      return NextResponse.json({ error: `weeksUsed must be a whole number from 1 to ${MAX_WEEKS}.` }, { status: 400 });
    }
    weeksUsed = n;
  }

  const sessionId = await getOrCreateSessionId();
  logOutcome(product.id, product.concernId, sessionId, { improved: body.improved, weeksUsed });

  const scores = getScoresForProducts([{ productId: product.id, concernId: product.concernId }]).get(product.id);
  return NextResponse.json({ ok: true, audienceScore: scores?.audience ?? null });
}
