import { NextResponse } from "next/server";

export { LIMITS } from "@/lib/limits";

// In-memory fixed-window limiter. Correct for the current single-container
// Railway deploy; a second replica would need a shared store (e.g. SQLite
// table or Redis), since each process keeps its own counters.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  // Rightmost entry: the one appended by Railway's edge proxy (the single
  // trusted hop). Earlier entries are client-supplied and spoofable.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",").at(-1)!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const key = `${bucket}:${clientIp(request)}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return null;
  }
  entry.count++;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests — please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return null;
}

// For state-changing account routes: refuse requests a browser labels as
// cross-site. (SameSite=Lax cookies already keep the session cookie off
// cross-site POSTs; this is the second lock.)
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const MAX_BODY_BYTES = 32 * 1024;

// Reads the body as text first so an oversized payload is rejected before
// JSON.parse, regardless of whether the client sent a Content-Length.
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, response: NextResponse.json({ error: "Request too large." }, { status: 413 }) };
  }
  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) {
    return { ok: false, response: NextResponse.json({ error: "Request too large." }, { status: 413 }) };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: true, body: null };
  }
}

// Returns the trimmed string, null when absent/blank, or undefined when the
// value is present but not a string or longer than maxLength (a 400).
export function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? undefined : trimmed;
}
