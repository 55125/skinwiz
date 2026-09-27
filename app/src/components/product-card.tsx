import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DualScoreBadges } from "@/components/score-badge";
import { getDermScore, getAudienceScore } from "@/lib/scoring";
import { dataSourceBadge } from "@/lib/data-source";
import type { products } from "@/db/schema";

export function ProductCard({ product }: { product: typeof products.$inferSelect }) {
  const dermScore = getDermScore(product.id, product.concernId);
  const audienceScore = getAudienceScore(product.id, product.concernId);
  const sourceBadge = dataSourceBadge(product.dataSource);

  return (
    <Link href={`/product/${encodeURIComponent(product.id)}`}>
      <Card className="h-full pt-0 transition-shadow hover:shadow-md">
        {/* Only openBeautyFacts/brand_direct rows have a real photo (see
            schema.ts's products.imageUrl comment) -- FDA-sourced products,
            the large majority, fall through to the plain placeholder below
            rather than showing a broken image or a stock photo. */}
        <div className="flex aspect-square w-full items-center justify-center bg-muted">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external product photos from many uncontrolled hosts (OBF, brand CDNs); not worth a next/image remotePatterns allowlist for an MVP
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
          <DualScoreBadges dermScore={dermScore} audienceScore={audienceScore} />
        </CardContent>
      </Card>
    </Link>
  );
}
