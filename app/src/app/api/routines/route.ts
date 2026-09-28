import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { createRoutine } from "@/lib/routines";
import { getConcern, getProduct } from "@/lib/queries";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.concernId !== "string") {
    return NextResponse.json({ error: "Title and concern are required." }, { status: 400 });
  }
  if (!body.title.trim()) {
    return NextResponse.json({ error: "Please provide a title." }, { status: 400 });
  }
  if (!getConcern(body.concernId)) {
    return NextResponse.json({ error: "Unknown concern." }, { status: 400 });
  }
  const rawSteps: unknown[] = Array.isArray(body.steps) ? body.steps : [];
  const steps = rawSteps
    .filter((s): s is { description?: unknown; productId?: unknown } => typeof s === "object" && s !== null)
    .map((s) => ({
      description: typeof s.description === "string" ? s.description : "",
      // routine_steps.productId is a real foreign key and this app enforces
      // FK constraints (better-sqlite3's default) -- a stale or fabricated
      // id would throw on insert, not silently no-op, so it's checked here
      // and dropped rather than trusted from the client.
      productId: typeof s.productId === "string" && getProduct(s.productId) ? s.productId : null,
    }))
    .filter((s) => s.description.trim());
  if (steps.length === 0) {
    return NextResponse.json({ error: "Please add at least one step." }, { status: 400 });
  }

  const sessionId = await getOrCreateSessionId();
  const routineId = createRoutine({
    title: body.title.trim(),
    concernId: body.concernId,
    authorName: typeof body.authorName === "string" && body.authorName.trim() ? body.authorName.trim() : null,
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    steps,
    sessionId,
  });

  return NextResponse.json({ ok: true, id: routineId });
}
