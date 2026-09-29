import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DualScoreBadges } from "@/components/score-badge";
import type { ProductScores } from "@/lib/scoring";
import { dataSourceBadge } from "@/lib/data-source";
import { getFreeFromCheck } from "@/db/ingredient-flags";
import type { EwgScore } from "@/lib/queries";
import { ewgHazardBadge } from "@/lib/ewg";
import { avoidVerdict, avoidedIngredientName } from "@/lib/avoid";
import { describeStrengths } from "@/lib/strength-display";
import type { products } from "@/db/schema";

export function ProductCard({
  product,
  scores,
  ewgScore,
  avoidIds,
}: {
  product: typeof products.$inferSelect;
  scores: ProductScores;
  ewgScore: EwgScore | null;
  avoidIds: string[];
}) {
  const sourceBadge = dataSourceBadge(product.dataSource);
  const avoid = avoidVerdict(product.freeFromFlags, avoidIds);
  const avoidConflicts = avoid?.status === "conflicts" ? avoid.conflicts : [];
  const strengthLine = describeStrengths(product.strengths, product.activeIds);
  // Capped at 2 on the card -- a product can match up to a dozen of these,
  // which would drown out everything else in a small card; the full list
  // is on the product detail page instead.
  const freeFromFlags = product.freeFromFlags ?? [];
  const shownFlags = freeFromFlags.slice(0, 2);
  const extraFlagCount = freeFromFlags.length - shownFlags.length;

  return (
    <Link
      href={`/product/${encodeURIComponent(product.id)}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {/* Only openBeautyFacts/brand_direct rows have a real photo (see
          schema.ts's products.imageUrl comment) -- FDA-sourced products,
          the large majority, fall through to the placeholder below
          rather than showing a broken image or a stock photo. */}
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-muted to-secondary ${product.imageUrl ? "aspect-[4/3]" : "h-24"}`}
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mix of same-origin (brand-direct, self-hosted -- see tools/catalog_pipeline/build_brand_direct_catalog.py) and external OBF-hosted photos; not worth a next/image remotePatterns allowlist for the OBF case alone
          <img
            src={product.imageUrl}
            alt={product.brandName}
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <FlaskConical className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs capitalize">{product.dosageForm ? product.dosageForm.toLowerCase() : "No photo yet"}</span>
          </div>
        )}
        {sourceBadge && (
          <Badge variant="outline" className={`absolute left-3 top-3 bg-card/90 backdrop-blur ${sourceBadge.className}`}>
            {sourceBadge.label}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          {product.manufacturer && (
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {product.manufacturer}
            </p>
          )}
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug" title={product.brandName}>
            {product.brandName}
          </h3>
          {strengthLine ? (
            <p className="line-clamp-2 text-xs font-medium text-foreground/80">{strengthLine}</p>
          ) : (
            product.activeIngredientText && (
              <p className="line-clamp-2 text-xs text-muted-foreground">{product.activeIngredientText}</p>
            )
          )}
        </div>

        {(avoidConflicts.length > 0 || avoid?.status === "clear") && (
          <div className="flex flex-wrap gap-1">
            {avoidConflicts.slice(0, 2).map((id) => (
              <Badge key={id} variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                Contains {avoidedIngredientName(id)}
              </Badge>
            ))}
            {avoidConflicts.length > 2 && (
              <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-900 dark:text-red-400">
                +{avoidConflicts.length - 2} more you avoid
              </Badge>
            )}
            {avoid?.status === "clear" && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                Clear of your avoid list
              </Badge>
            )}
          </div>
        )}

        {(shownFlags.length > 0 || ewgScore || (product.dosageForm && product.imageUrl)) && (
          <div className="flex flex-wrap gap-1">
            {product.dosageForm && product.imageUrl && <Badge variant="secondary">{product.dosageForm}</Badge>}
            {ewgScore && (
              <Badge variant="outline" className={ewgHazardBadge(ewgScore.ewgScore).className}>
                {ewgHazardBadge(ewgScore.ewgScore).label}
              </Badge>
            )}
            {shownFlags.map((id) => (
              <Badge key={id} variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400">
                {getFreeFromCheck(id)?.label ?? id}
              </Badge>
            ))}
            {extraFlagCount > 0 && <Badge variant="outline">+{extraFlagCount} more</Badge>}
          </div>
        )}

        <div className="mt-auto border-t pt-3">
          <DualScoreBadges dermScore={scores.derm} audienceScore={scores.audience} compact />
        </div>
      </div>
    </Link>
  );
}
