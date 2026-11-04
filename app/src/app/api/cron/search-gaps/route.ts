import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { parseRange, trafficReport } from "@/lib/analytics/report";
import { stillMissing } from "@/lib/search-gaps";

export const dynamic = "force-dynamic";

// What people searched for that the catalog still can't answer, for the
// weekly search-gap review (which adds spellings and products itself).
//   curl -H "Authorization: Bearer $CRON_SECRET" https://activelyskin.com/api/cron/search-gaps?days=14
// ?days= is 7, 30, 90 or 365 (default 7). Terms that find products now are
// left out. Counts only; searches that look like an email or phone number are
// never stored, so none appear here.
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const days = parseRange(new URL(request.url).searchParams.get("days") ?? "7");
  const t = trafficReport(new Date(), days);
  const missing = stillMissing(t.zeroResultSearches);
  // Searches that found only a few products (latest result count 1 to 3), e.g. "anua moisturizer" before it was filled in.
  const lowResult = t.searchTerms.filter((r) => (r.extra ?? 0) >= 1 && (r.extra ?? 0) <= 3);
  return NextResponse.json({ days, from: t.from, to: t.to, missing, lowResult }, { headers: { "Cache-Control": "no-store" } });
}
