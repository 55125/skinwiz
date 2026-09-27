import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const COOKIE_NAME = "sw_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Anonymous identity for routine submission/voting — no accounts exist
// (see app/README.md's "what's not built yet"). Only callable from a
// Route Handler or Server Action, where Next.js allows setting cookies;
// use readSessionId() from a Server Component instead.
export async function getOrCreateSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = randomUUID();
  store.set(COOKIE_NAME, id, { httpOnly: true, sameSite: "lax", maxAge: ONE_YEAR });
  return id;
}

// Read-only lookup for Server Components (e.g. "has this session already
// voted on this routine?"). Returns null if no session cookie exists yet
// — treat that as "hasn't voted", which is always the correct default.
export async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}
