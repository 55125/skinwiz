import { NextResponse } from "next/server";
import { readAvoidIds, sanitizeAvoidIds, writeAvoidIds } from "@/lib/avoid";
import { mergeAvoidIds } from "@/lib/avoid-import";

// { ids } replaces the list; { add } merges into the current list (the
// patch-test import), so a stale page can't drop anything. Saved to the
// account as well when the visitor is signed in (lib/avoid.ts).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (Array.isArray(body?.add)) {
    const existing = await readAvoidIds();
    const { merged, added, already } = mergeAvoidIds(existing, sanitizeAvoidIds(body.add));
    if (added.length > 0) await writeAvoidIds(merged);
    return NextResponse.json({ ok: true, ids: merged, added, already });
  }
  const ids = sanitizeAvoidIds(body?.ids);
  await writeAvoidIds(ids);
  return NextResponse.json({ ok: true, ids });
}
