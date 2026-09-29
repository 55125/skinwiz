import { ProductCard } from "@/components/product-card";
import { getEwgScoresForProducts } from "@/lib/queries";
import { getScoresForProducts } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { products } from "@/db/schema";

// Fetches every card's scores and EWG rating in one query each, rather
// than three queries per card.
export function ProductGrid({
  products: rows,
  columns,
}: {
  products: (typeof products.$inferSelect)[];
  columns?: string;
}) {
  const scores = getScoresForProducts(rows.map((p) => ({ productId: p.id, concernId: p.concernId })));
  const ewg = getEwgScoresForProducts(rows.map((p) => p.id));
  return (
    <div className={cn("grid gap-5", columns ?? "sm:grid-cols-2 lg:grid-cols-3")}>
      {rows.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          scores={scores.get(product.id)!}
          ewgScore={ewg.get(product.id) ?? null}
        />
      ))}
    </div>
  );
}
