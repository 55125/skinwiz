import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// For Railway's healthcheck path and an external uptime monitor: 200 when the
// server is up and the database answers, 503 otherwise. Reveals nothing else.
export const dynamic = "force-dynamic";

export function GET() {
  try {
    db.get(sql`SELECT 1`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
