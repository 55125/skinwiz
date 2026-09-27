import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { voteOnRoutine, getRoutine } from "@/lib/routines";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const routineId = parseInt(id, 10);
  if (!getRoutine(routineId)) {
    return NextResponse.json({ error: "Routine not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const value = body?.value;
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1." }, { status: 400 });
  }

  const sessionId = await getOrCreateSessionId();
  voteOnRoutine(routineId, sessionId, value);

  const updated = getRoutine(routineId);
  return NextResponse.json({ ok: true, score: updated?.score ?? 0 });
}
