import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { resolveSessionId } from "@/lib/identity";

const COOKIE_NAME = "sw_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Anonymous identity for the shelf, outcomes, routines and votes -- there are
// no accounts or passwords. A visitor may optionally attach a verified email
// (lib/identity.ts); then this browser's cookie is an alias and the two
// functions below return the person's home session id instead, so every
// session-keyed query follows the person across devices unchanged.

function newCookie(store: Awaited<ReturnType<typeof cookies>>): string {
  const id = randomUUID();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
  });
  return id;
}

// Only callable from a Route Handler or Server Action, where Next.js allows
// setting cookies; use readSessionId() from a Server Component instead.
export async function getOrCreateSessionId(): Promise<string> {
  return resolveSessionId(await getOrCreateDeviceSessionId());
}

// Read-only lookup for Server Components (e.g. "has this session already
// voted on this routine?"). Returns null if no session cookie exists yet
// — treat that as "hasn't voted", which is always the correct default.
export async function readSessionId(): Promise<string | null> {
  const device = await readDeviceSessionId();
  return device ? resolveSessionId(device) : null;
}

/** This browser's own cookie value (not resolved to a person). */
export async function readDeviceSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function getOrCreateDeviceSessionId(): Promise<string> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? newCookie(store);
}

/** Gives this browser a fresh, empty anonymous session (sign-out, deletion). */
export async function rotateDeviceSession(): Promise<string> {
  return newCookie(await cookies());
}
