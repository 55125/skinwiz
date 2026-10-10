import { ProductCard } from "@/components/product-card";
import { HsaListingNote } from "@/components/hsa-badge";
import { getBestProductImages, getEwgScoresForProducts } from "@/lib/queries";
import { getScoresForProducts } from "@/lib/scoring";
import { readAvoidIds } from "@/lib/avoid";
import { avoidLabelsFor, getIngredientMembership, hasProfile, matchProduct, readProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { isHsaEligible } from "@/lib/otc-index";
import { hsaSaidOnce } from "@/lib/hsa";
import type { products } from "@/db/schema";

// Fetches every card's scores and EWG rating in one query each, rather
// than three queries per card, and reads the visitor's avoid list once.
export async function ProductGrid({
  products: rows,
  columns,
}: {
  products: (typeof products.$inferSelect)[];
  columns?: string;
}) {
  const scores = getScoresForProducts(rows.map((p) => ({ productId: p.id, concernId: p.concernId })));
  const ewg = getEwgScoresForProducts(rows.map((p) => p.id));
  // A merged listing's retail photo beats the canonical row's label artwork.
  const images = getBestProductImages(rows.map((p) => p.id));
  const avoidIds = await readAvoidIds();
  const profile = await readProfile();
  const avoidLabels = avoidLabelsFor(avoidIds);
  const personalized = avoidLabels.length > 0 || hasProfile(profile);
  const membership = personalized ? getIngredientMembership(rows.map((p) => p.id)) : null;
  const hsa = new Set(rows.filter((p) => isHsaEligible(p.id)).map((p) => p.id));
  // Mostly eligible: said once above the grid, not on every card.
  const hsaOnce = hsaSaidOnce(hsa.size, rows.length);
  const grid = (
    <div className={cn("grid gap-5", columns ?? "sm:grid-cols-2 lg:grid-cols-3")}>
      {rows.map((product) => (
        <ProductCard
          key={product.id}
          product={{ ...product, imageUrl: images.get(product.id) ?? product.imageUrl }}
          scores={scores.get(product.id)!}
          ewgScore={ewg.get(product.id) ?? null}
          avoidIds={avoidIds}
          match={membership ? matchProduct(product, membership.get(product.id), profile, avoidLabels) : null}
          hsaEligible={!hsaOnce && hsa.has(product.id)}
        />
      ))}
    </div>
  );
  if (!hsaOnce) return grid;
  return (
    <div className="space-y-3">
      <HsaListingNote />
      {grid}
    </div>
  );
}
