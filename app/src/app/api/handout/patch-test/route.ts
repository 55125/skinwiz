import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api-guard";
import { getHandoutSafeProducts } from "@/lib/queries";
import { educationFor } from "@/db/allergen-education";
import { getAllergen, getAllergenGroup } from "@/db/contact-allergens";
import { getNotOnLabel } from "@/db/patch-test-series";

const MAX_IDS = 120;

// Backs the printed patch-test handout (components/patch-test-handout.tsx):
// the per-allergen education records and named products clear of the whole
// list. Takes only allergen ids, the same ones the QR link already carries;
// never a name, date or note.
export async function GET(request: Request) {
  const limited = rateLimit(request, "patch-test-handout", 60, 60 * 1000);
  if (limited) return limited;
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))]
    .slice(0, MAX_IDS)
    .filter((id) => getAllergen(id) || getAllergenGroup(id) || getNotOnLabel(id));
  const education = ids.map((id) => educationFor(id)).filter((e) => e !== undefined);
  const products = getHandoutSafeProducts(ids);
  return NextResponse.json({ education, products }, { headers: { "Cache-Control": "private, max-age=600" } });
}
