import { NextResponse } from "next/server";
import { readProfile, sanitizeProfile, writeProfile } from "@/lib/profile";
import { rateLimit, readJsonBody } from "@/lib/api-guard";

export async function POST(request: Request) {
  const limited = rateLimit(request, "profile", 60, 60 * 1000);
  if (limited) return limited;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown> | null;

  let next;
  if (body && body.action === "toggle" && (body.list === "likes" || body.list === "dislikes") && typeof body.id === "string") {
    // Add/remove one ingredient from the liked or disliked list (used by the
    // buttons on ingredient pages); liking removes a dislike and vice versa.
    const cur = await readProfile();
    const other = body.list === "likes" ? "dislikes" : "likes";
    const has = cur[body.list].includes(body.id);
    next = sanitizeProfile({
      ...cur,
      [body.list]: has ? cur[body.list].filter((x) => x !== body.id) : [...cur[body.list], body.id],
      [other]: cur[other].filter((x) => x !== body.id),
    });
  } else {
    next = sanitizeProfile(body);
  }

  await writeProfile(next);
  return NextResponse.json({ ok: true, profile: next });
}
