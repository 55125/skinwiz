import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DualScoreBadges } from "@/components/score-badge";
import { getDermScore, getAudienceScore } from "@/lib/scoring";
import { dataSourceBadge } from "@/lib/data-source";
import { getFreeFromCheck } from "@/db/ingredient-flags";
import type { products } from "@/db/schema";

export function ProductCard({ product }: { product: typeof products.$inferSelect }) {
  const dermScore = getDermScore(product.id, product.concernId);
  const audienceScore = getAudienceScore(product.id, product.concernId);
  const sourceBadge = dataSourceBadge(product.dataSource);
  // Capped at 2 on the card -- a product can match up to a dozen of these,
  // which would drown out everything else in a small card; the full list
  // is on the product detail page instead.
  const freeFromFlags = product.freeFromFlags ?? [];
  const shownFlags = freeFromFlags.slice(0, 2);
  const extraFlagCount = freeFromFlags.length - shownFlags.length;

  return (
    <Link href={`/product/${encodeURIComponent(product.id)}`}>
      <Card className="h-full pt-0 transition-shadow hover:shadow-md">
        {/* Only openBeautyFacts/brand_direct rows have a real photo (see
            schema.ts's products.imageUrl comment) -- FDA-sourced products,
            the large majority, fall through to the plain placeholder below
            rather than showing a broken image or a stock photo. */}
        <div className="flex aspect-square w-full items-center justify-center bg-muted">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- mix of same-origin (brand-direct, self-hosted -- see tools/catalog_pipeline/build_brand_direct_catalog.py) and external OBF-hosted photos; not worth a next/image remotePatterns allowlist for the OBF case alone
            <img
              src={product.imageUrl}
              alt={product.brandName}
              className="h-full w-full object-contain p-2"
              loading="lazy"
            />
          ) : (
            <span className="text-xs text-muted-foreground">No photo yet</span>
          )}
        </div>
        <CardHeader className="pb-2">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug" title={product.brandName}>
            {product.brandName}
          </h3>
          {product.manufacturer && (
            <p className="text-xs text-muted-foreground">{product.manufacturer}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {product.dosageForm && <Badge variant="secondary">{product.dosageForm}</Badge>}
            {sourceBadge && (
              <Badge variant="outline" className={sourceBadge.className}>
                {sourceBadge.label}
              </Badge>
            )}
          </div>
          {product.activeIngredientText && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{product.activeIngredientText}</p>
          )}
          {shownFlags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {shownFlags.map((id) => (
                <Badge key={id} variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400">
                  {getFreeFromCheck(id)?.label ?? id}
                </Badge>
              ))}
              {extraFlagCount > 0 && <Badge variant="outline">+{extraFlagCount} more</Badge>}
            </div>
          )}
          <DualScoreBadges dermScore={dermScore} audienceScore={audienceScore} />
        </CardContent>
      </Card>
    </Link>
  );
}
