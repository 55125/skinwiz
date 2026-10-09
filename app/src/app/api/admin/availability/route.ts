import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminCookie } from "@/lib/admin-auth";
import { setAvailability, type AvailabilityAction } from "@/lib/availability-admin";

export const dynamic = "force-dynamic";

const ACTIONS: AvailabilityAction[] = ["discontinued", "available", "clear"];

// Form POST from /admin's "Product availability" section: mark a product
// discontinued, mark it available (clears an automatic flag), or remove the
// call. The proxy already refuses cross-site POSTs to /api/.
export async function POST(request: Request) {
  if (!isAdminCookie((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const back = (result: string) =>
    new NextResponse(null, { status: 303, headers: { Location: `/admin?avail=${result}#availability`, "Cache-Control": "no-store" } });
  const form = await request.formData().catch(() => null);
  const product = form?.get("product");
  const action = form?.get("action");
  const note = form?.get("note");
  if (typeof product !== "string" || typeof action !== "string" || !ACTIONS.includes(action as AvailabilityAction)) return back("bad");
  const ok = setAvailability(product, action as AvailabilityAction, typeof note === "string" ? note : null);
  return back(ok ? "ok" : "notfound");
}
