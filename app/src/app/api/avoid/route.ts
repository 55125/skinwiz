import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AVOID_COOKIE, AVOID_COOKIE_MAX_AGE, readAvoidIds, sanitizeAvoidIds } from "@/lib/avoid";
import { mergeAvoidIds } from "@/lib/avoid-import";

// { ids } replaces the list; { add } merges into the list already in the
// cookie (the patch-test import), so a stale page can't drop anything.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const store = await cookies();
  if (Array.isArray(body?.add)) {
    const existing = await readAvoidIds();
    const { merged, added, already } = mergeAvoidIds(existing, sanitizeAvoidIds(body.add));
    if (merged.length > 0) store.set(AVOID_COOKIE, merged.join(","), { httpOnly: true, sameSite: "lax", maxAge: AVOID_COOKIE_MAX_AGE });
    return NextResponse.json({ ok: true, ids: merged, added, already });
  }
  const ids = sanitizeAvoidIds(body?.ids);
  if (ids.length === 0) {
    store.delete(AVOID_COOKIE);
  } else {
    store.set(AVOID_COOKIE, ids.join(","), { httpOnly: true, sameSite: "lax", maxAge: AVOID_COOKIE_MAX_AGE });
  }
  return NextResponse.json({ ok: true, ids });
}
