import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminCookie } from "@/lib/admin-auth";
import { parseRange, trafficCsv } from "@/lib/analytics/report";

export const dynamic = "force-dynamic";

// CSV download of the admin dashboard's traffic numbers (?days=7|30|90|365).
export async function GET(request: Request) {
  if (!isAdminCookie((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const days = parseRange(new URL(request.url).searchParams.get("days") ?? undefined);
  const now = new Date();
  return new NextResponse(trafficCsv(now, days), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="actively-stats-${now.toISOString().slice(0, 10)}-${days}d.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
