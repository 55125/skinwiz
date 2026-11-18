import { NextResponse, type NextRequest } from "next/server";
import { publicPixelId } from "@/lib/meta-capi";
import { consentRequiredFor } from "@/lib/meta-shared";

// The Meta pixel id, read at request time (a NEXT_PUBLIC_ variable would be
// baked in at build time, and Railway's Docker build doesn't see service
// variables), and whether this visitor's location needs the consent notice
// (lib/meta-shared.ts, consentRequiredFor). Only fetched by browsers that
// arrived from one of our ads (components/meta-consent.tsx,
// components/privacy-choices.tsx). pixelId null = Meta isn't set up: no
// notice, no pixel.
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const consentRequired = consentRequiredFor(req.headers.get("cf-ipcountry"), req.headers.get("cf-region-code"));
  return NextResponse.json(
    { pixelId: publicPixelId(), consentRequired },
    { headers: { "Cache-Control": "private, no-store", Vary: "CF-IPCountry, cf-region-code" } },
  );
}
