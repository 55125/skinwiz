import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { raterApplications } from "@/db/schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || typeof body.email !== "string") {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (!body.name.trim() || !body.email.includes("@")) {
    return NextResponse.json({ error: "Please provide a valid name and email." }, { status: 400 });
  }

  db.insert(raterApplications)
    .values({
      name: body.name.trim(),
      email: body.email.trim(),
      credential: typeof body.credential === "string" ? body.credential.trim() : null,
      message: typeof body.message === "string" ? body.message.trim() : null,
    })
    .run();

  return NextResponse.json({ ok: true });
}
