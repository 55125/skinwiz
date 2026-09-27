import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DualScoreBadges } from "@/components/score-badge";
import { getDermScore, getAudienceScore } from "@/lib/scoring";
import type { products } from "@/db/schema";

export function ProductCard({ product }: { product: typeof products.$inferSelect }) {
  const dermScore = getDermScore(product.id, product.concernId);
  const audienceScore = getAudienceScore(product.id, product.concernId);

  return (
    <Link href={`/product/${encodeURIComponent(product.id)}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
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
