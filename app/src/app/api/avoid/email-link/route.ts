import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isSameOrigin, rateLimit, readJsonBody } from "@/lib/api-guard";
import { normalizeEmail } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { avoidListLinkEmail } from "@/lib/email-templates";
import { buildImportPath, cleanDetails, decodeImportCode } from "@/lib/avoid-import";
import { siteUrl } from "@/lib/site-url";

// "Email this to me" on the patient's QR page (/avoid/import): one
// transactional email with the list's link, to an address the patient types
// themselves. The address is used for this one send and then dropped: it is
// never stored, logged or tied to the device, and the response is the same
// whether or not a limit held the send back. Clinics never send through us
// (see the HIPAA note in the handout plan); this is the patient's own copy.
const PER_ADDRESS_PER_DAY = 3;
const ALL_PER_HOUR = 200;
const perAddress = new Map<string, { count: number; resetAt: number }>();
let all = { count: 0, resetAt: 0 };

function underLimits(email: string, now: number): boolean {
  if (all.resetAt <= now) all = { count: 0, resetAt: now + 3_600_000 };
  // Keyed by a hash, so the address itself isn't held even in memory.
  const key = createHash("sha256").update(email).digest("hex");
  const e = perAddress.get(key);
  const entry = !e || e.resetAt <= now ? { count: 0, resetAt: now + 86_400_000 } : e;
  if (entry.count >= PER_ADDRESS_PER_DAY || all.count >= ALL_PER_HOUR) return false;
  entry.count++;
  all.count++;
  perAddress.set(key, entry);
  if (perAddress.size > 10_000) for (const [k, v] of perAddress) if (v.resetAt <= now) perAddress.delete(k);
  return true;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const limited = rateLimit(request, "avoid-email-link", 5, 15 * 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = (parsed.body ?? {}) as { email?: unknown; a?: unknown; d?: unknown; n?: unknown; c?: unknown };
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const decoded = decodeImportCode(typeof body.a === "string" ? body.a : undefined);
  if (!decoded.ok || decoded.avoidIds.length + decoded.notOnLabel.length === 0) {
    return NextResponse.json({ error: "This list's link couldn't be read." }, { status: 400 });
  }
  const details = cleanDetails({ date: typeof body.d === "string" ? body.d : undefined, note: typeof body.n === "string" ? body.n : undefined, fromClinic: body.c === "1" });
  // Rebuilt from the decoded list, so the email can only ever carry one of our own links.
  const link = `${siteUrl()}${buildImportPath([...decoded.avoidIds, ...decoded.notOnLabel], details)}`;
  if (underLimits(email, Date.now())) {
    const res = await sendEmail({ to: email, ...avoidListLinkEmail(link), category: "transactional" });
    if (!res.ok) console.error("[email] avoid-list link failed to send");
  }
  return NextResponse.json({ ok: true });
}
