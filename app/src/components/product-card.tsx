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
import { MatchBadge } from "@/components/match-badge";
import type { Match } from "@/lib/profile-shared";
import { describeStrengths, unparsedActivesLine } from "@/lib/strength-display";

const FDA_SOURCES = new Set(["openfda", "dailymed"]);
import { productBrand } from "@/lib/product-brand";
import { getOrigin, productNameOrigin, type OriginId } from "@/lib/origin-shared";
import { ECZEMA_CONCERN, isDiaperProduct } from "@/lib/listing-rules";
import { HsaBadge } from "@/components/hsa-badge";
import type { products } from "@/db/schema";
import { productImageAlt, thumbnailUrl } from "@/lib/image-urls";

// One solid color per region so a grid of tags reads at a glance; white
// text holds on all of them in both themes.
const ORIGIN_TAG_CLASS: Record<OriginId, string> = {
  kr: "bg-rose-600",
  jp: "bg-fuchsia-700",
  eu: "bg-indigo-600",
  au: "bg-amber-700",
  ca: "bg-red-700",
};

function OriginTag({ origin, className }: { origin: OriginId; className?: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white ${ORIGIN_TAG_CLASS[origin]} ${className ?? ""}`}
      title={`${getOrigin(origin).label} brand`}
    >
      {getOrigin(origin).tag}
    </span>
  );
}

export function ProductCard({
  product,
  scores,
  ewgScore,
  avoidIds,
  match = null,
  hsaEligible = false,
}: {
  product: typeof products.$inferSelect;
  scores: ProductScores;
  ewgScore: EwgScore | null;
  avoidIds: string[];
  match?: Match | null;
  hsaEligible?: boolean;
}) {
  const sourceBadge = dataSourceBadge(product.dataSource);
  const { brand } = productBrand(product);
  const origin = productNameOrigin(brand, product.brandName);
  const diaperArea = product.concernId === ECZEMA_CONCERN && isDiaperProduct(product.brandName);
  const avoid = avoidVerdict(product, avoidIds);
  const avoidConflicts = avoid?.status === "conflicts" ? avoid.conflicts : [];
  const avoidPossible = avoid?.status === "conflicts" || avoid?.status === "possible" ? avoid.possible : [];
  const strengthLine = describeStrengths(product.strengths, product.activeIds);
  // Capped at 1 on the card -- a product can match up to a dozen of these,
  // which would drown out everything else in a small card; the full list
  // is on the product detail page instead.
  const freeFromFlags = product.freeFromFlags ?? [];
  const shownFlags = freeFromFlags.slice(0, 1);
  const extraFlagCount = freeFromFlags.length - shownFlags.length;

  return (
    <Link
      href={`/product/${encodeURIComponent(product.id)}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5 focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {/* Photos: OBF/brand_direct retail shots, or the FDA label's package
          image from DailyMed once the image sync has fetched it (see
          schema.ts's products.imageUrl comment). Products without one get
          no image band at all -- a grid of identical grey placeholders
          reads as missing content, so the dosage form moves into the text
          block instead. The 4:3 box reserves the space before the lazy
          image loads, so nothing shifts. */}
      {product.imageUrl && (
        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-white dark:bg-gradient-to-br dark:from-muted dark:to-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element -- mix of self-hosted (brand-direct, pre-rendered DailyMed WebP thumbnails) and external OBF-hosted photos; not worth a next/image remotePatterns allowlist for the OBF case alone */}
          <img
            src={thumbnailUrl(product.imageUrl)}
            alt={productImageAlt(product)}
            width={320}
            height={240}
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
          {sourceBadge && (
            <Badge variant="outline" className={`absolute left-3 top-3 bg-card/90 backdrop-blur ${sourceBadge.className}`}>
              {sourceBadge.label}
            </Badge>
          )}
          {origin && <OriginTag origin={origin} className="absolute right-3 top-3 shadow-sm" />}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          {!product.imageUrl && (
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium capitalize text-brand-foreground">
                <FlaskConical className="h-3 w-3" strokeWidth={2} />
                {product.dosageForm ? product.dosageForm.toLowerCase() : "OTC product"}
              </span>
              {sourceBadge && (
                <Badge variant="outline" className={sourceBadge.className}>
                  {sourceBadge.label}
                </Badge>
              )}
            </div>
          )}
          {brand && (
            <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="truncate">{brand}</span>
              {/* No photo to carry the tag: it sits beside the brand instead. */}
              {origin && !product.imageUrl && <OriginTag origin={origin} className="shrink-0" />}
            </p>
          )}
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug" title={product.brandName}>
            {product.brandName}
          </h3>
          {diaperArea && <p className="text-xs font-medium text-amber-800 dark:text-amber-300">For the diaper area</p>}
          {strengthLine ? (
            <p className="line-clamp-2 text-xs font-medium text-foreground/80">{strengthLine}</p>
          ) : FDA_SOURCES.has(product.dataSource) && product.activeIngredientText ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{unparsedActivesLine(product.activeIngredientText) ?? product.activeIngredientText}</p>
          ) : (
            product.activeIngredientText && (
              <p className="line-clamp-2 text-xs text-muted-foreground">{product.activeIngredientText}</p>
            )
          )}
        </div>

        {match && (
          <div className="flex flex-wrap gap-1">
            <MatchBadge match={match} />
          </div>
        )}

        {(avoidConflicts.length > 0 || avoidPossible.length > 0 || avoid?.status === "clear") && (
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
            {avoidConflicts.length === 0 && avoidPossible.length > 0 && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                Fragrance may hide {avoidPossible.length === 1 ? avoidedIngredientName(avoidPossible[0]) : `${avoidPossible.length} you avoid`}
              </Badge>
            )}
            {avoid?.status === "clear" && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                Clear of your avoid list
              </Badge>
            )}
          </div>
        )}

        {(shownFlags.length > 0 || ewgScore || hsaEligible || (product.dosageForm && product.imageUrl)) && (
          <div className="flex flex-wrap gap-1">
            {hsaEligible && <HsaBadge />}
            {/* Kept to one line: one named flag plus a count, so the count
                never wraps onto a row of its own in a 3-column grid. */}
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
            {extraFlagCount > 0 && (
              <Badge variant="outline" className="text-muted-foreground" title={`${extraFlagCount} more ingredient-based filters`}>
                +{extraFlagCount} more
              </Badge>
            )}
          </div>
        )}

        {/* Hidden until at least one score exists -- a row of dashes on
            every card is noise; the product page still explains what's
            needed before a score appears. */}
        {(scores.derm.status === "scored" || scores.audience.status === "scored") && (
          <div className="mt-auto border-t pt-3">
            <DualScoreBadges dermScore={scores.derm} audienceScore={scores.audience} compact />
          </div>
        )}
      </div>
    </Link>
  );
}
