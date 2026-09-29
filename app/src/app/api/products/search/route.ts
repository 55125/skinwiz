import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/queries";
import { rateLimit } from "@/lib/api-guard";

// Backs the routine-step product picker (product-picker.tsx) -- a client
// component needs a fetchable endpoint, unlike /search which is a server
// component reading searchProducts() directly. Same underlying query, just
// exposed over HTTP and trimmed to the fields a picker dropdown needs.
export async function GET(request: Request) {
  const limited = rateLimit(request, "product-search", 120, 60 * 1000);
  if (limited) return limited;
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return NextResponse.json({ products: [] });

  const results = searchProducts(q)
    .slice(0, 8)
    .map((p) => ({ id: p.id, brandName: p.brandName, manufacturer: p.manufacturer }));
  return NextResponse.json({ products: results });
}
