import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { raterApplications } from "@/db/schema";
import { LIMITS, optionalText, rateLimit, readJsonBody } from "@/lib/api-guard";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "rater-application", 5, 60 * 60 * 1000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown> | null;

  if (!body || typeof body.name !== "string" || typeof body.email !== "string") {
    return bad("Name and email are required.");
  }
  const name = optionalText(body.name, LIMITS.name);
  const email = optionalText(body.email, LIMITS.email);
  if (!name || !email || !EMAIL_RE.test(email)) return bad("Please provide a valid name and email.");
  const credential = optionalText(body.credential, LIMITS.credential);
  if (credential === undefined) return bad(`Credential must be ${LIMITS.credential} characters or fewer.`);
  const message = optionalText(body.message, LIMITS.message);
  if (message === undefined) return bad(`Message must be ${LIMITS.message} characters or fewer.`);

  db.insert(raterApplications).values({ name, email, credential, message }).run();

  return NextResponse.json({ ok: true });
}
