import { NextResponse } from "next/server";
import { suggestIngredients, suggestProducts } from "@/lib/queries";
import { rateLimit } from "@/lib/api-guard";

// Backs the search bar's autocomplete dropdown (search-bar.tsx).
export async function GET(request: Request) {
  const limited = rateLimit(request, "search-suggest", 240, 60 * 1000);
  if (limited) return limited;
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return NextResponse.json({ ingredients: [], products: [] });

  return NextResponse.json({
    ingredients: suggestIngredients(q),
    products: suggestProducts(q).map((p) => ({ id: p.id, brandName: p.brandName, manufacturer: p.manufacturer })),
  });
}
