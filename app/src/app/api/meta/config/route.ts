import { NextResponse } from "next/server";
import { publicPixelId } from "@/lib/meta-capi";

// The Meta pixel id, read at request time (a NEXT_PUBLIC_ variable would be
// baked in at build time, and Railway's Docker build doesn't see service
// variables). Only fetched by browsers that arrived from one of our ads
// (components/meta-consent.tsx). null = Meta isn't set up: no banner, no pixel.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ pixelId: publicPixelId() }, { headers: { "Cache-Control": "no-store" } });
}
