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

  // One row per name + brand, case-insensitively: the catalog lists some
  // products twice from different sources ("Skin renewing retinol serum /
  // Cerave" and "Skin Renewing Retinol Serum / CeraVe").
  const seen = new Set<string>();
  const results = searchProducts(q)
    .filter((p) => {
      const key = `${p.brandName.trim().toLowerCase()}|${(p.manufacturer ?? "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map((p) => ({ id: p.id, brandName: p.brandName, manufacturer: p.manufacturer }));
  return NextResponse.json({ products: results });
}
