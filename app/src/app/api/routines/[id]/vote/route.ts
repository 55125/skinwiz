import { NextResponse } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";
import { voteOnRoutine, getRoutine } from "@/lib/routines";
import { rateLimit, readJsonBody } from "@/lib/api-guard";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Session-cookie dedup alone is bypassable (a client can mint a fresh
  // cookie per request), so votes are also capped per IP.
  const limited = rateLimit(request, "routine-vote", 30, 60 * 60 * 1000);
  if (limited) return limited;

  const { id } = await params;
  const routineId = parseInt(id, 10);
  if (!getRoutine(routineId)) {
    return NextResponse.json({ error: "Routine not found." }, { status: 404 });
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const value = (parsed.body as { value?: unknown } | null)?.value;
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1." }, { status: 400 });
  }

  const sessionId = await getOrCreateSessionId();
  voteOnRoutine(routineId, sessionId, value);

  const updated = getRoutine(routineId);
  return NextResponse.json({ ok: true, score: updated?.score ?? 0 });
}
