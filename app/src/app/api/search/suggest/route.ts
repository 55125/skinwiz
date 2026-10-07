import { NextResponse } from "next/server";
import { searchProducts, suggestIngredients, suggestProducts } from "@/lib/queries";
import { rateLimit } from "@/lib/api-guard";

// Backs the search bar's autocomplete dropdown (search-bar.tsx).
export async function GET(request: Request) {
  const limited = rateLimit(request, "search-suggest", 240, 60 * 1000);
  if (limited) return limited;
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return NextResponse.json({ ingredients: [], products: [] });

  // Name-prefix suggestions first; when the words are split across brand and
  // name ("cerave resurfacing retinol"), fall back to the full search.
  const named = suggestProducts(q);
  const products = named.length > 0 ? named : searchProducts(q).slice(0, 6);
  return NextResponse.json({
    ingredients: suggestIngredients(q),
    products: products.map((p) => ({ id: p.id, brandName: p.brandName, manufacturer: p.manufacturer })),
  });
}
