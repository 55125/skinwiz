import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AVOID_COOKIE, AVOID_COOKIE_MAX_AGE, sanitizeAvoidIds } from "@/lib/avoid";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ids = sanitizeAvoidIds(body?.ids);
  const store = await cookies();
  if (ids.length === 0) {
    store.delete(AVOID_COOKIE);
  } else {
    store.set(AVOID_COOKIE, ids.join(","), { httpOnly: true, sameSite: "lax", maxAge: AVOID_COOKIE_MAX_AGE });
  }
  return NextResponse.json({ ok: true, ids });
}
