import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { createRoutine } from "@/lib/routines";
import { getConcern } from "@/lib/queries";

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
  const steps = Array.isArray(body.steps) ? body.steps.filter((s: unknown) => typeof s === "string") : [];
  if (steps.filter((s: string) => s.trim()).length === 0) {
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
