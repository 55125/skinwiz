import { ProductCard } from "@/components/product-card";
import { getEwgScoresForProducts } from "@/lib/queries";
import { getScoresForProducts } from "@/lib/scoring";
import { readAvoidIds } from "@/lib/avoid";
import { avoidLabelsFor, getIngredientMembership, matchProduct, readProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { isHsaEligible } from "@/lib/otc-index";
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
  const avoidIds = await readAvoidIds();
  const profile = await readProfile();
  const avoidLabels = avoidLabelsFor(avoidIds);
  const personalized = avoidLabels.length > 0 || profile.skin || profile.sensitive || profile.concerns.length + profile.likes.length + profile.dislikes.length > 0;
  const membership = personalized ? getIngredientMembership(rows.map((p) => p.id)) : null;
  return (
    <div className={cn("grid gap-5", columns ?? "sm:grid-cols-2 lg:grid-cols-3")}>
      {rows.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          scores={scores.get(product.id)!}
          ewgScore={ewg.get(product.id) ?? null}
          avoidIds={avoidIds}
          match={membership ? matchProduct(product, membership.get(product.id), profile, avoidLabels) : null}
          hsaEligible={isHsaEligible(product.id)}
        />
      ))}
    </div>
  );
}
