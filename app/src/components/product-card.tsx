import Link from "next/link";
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
import { activeName, describeStrengths, dosageFormLabel, firstIngredients, unparsedActivesLine } from "@/lib/strength-display";
import { productBrand } from "@/lib/product-brand";
import { getOrigin, productNameOrigin, type OriginId } from "@/lib/origin-shared";
import { ECZEMA_CONCERN, isDiaperProduct } from "@/lib/listing-rules";
import { HsaBadge } from "@/components/hsa-badge";
import type { products } from "@/db/schema";
import { productImageAlt, thumbnailUrl } from "@/lib/image-urls";

const FDA_SOURCES = new Set(["openfda", "dailymed"]);

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
  // One line for what's in it, whatever the source: the actives with their
  // strengths, or for a cosmetic with no recognized actives the first few
  // names of its ingredient list. The full list is on the product page.
  const fda = FDA_SOURCES.has(product.dataSource);
  const ingredientLine =
    describeStrengths(product.strengths, product.activeIds) ??
    (fda
      ? product.activeIngredientText && (unparsedActivesLine(product.activeIngredientText) ?? product.activeIngredientText)
      : product.activeIds.length > 0
        ? product.activeIds.map(activeName).join(" · ")
        : product.activeIngredientText && firstIngredients(product.activeIngredientText));
  const form = dosageFormLabel(product.dosageForm);
  const freeFromFlags = product.freeFromFlags ?? [];

  // At most two badges, the most personal first: the avoid-list verdict,
  // the profile match, then HSA/FSA, EWG and one free-from flag. Every
  // other flag is on the product page.
  const badges: React.ReactNode[] = [];
  if (avoidConflicts.length > 0) {
    badges.push(
      <Badge key="avoid" variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        Contains {avoidedIngredientName(avoidConflicts[0])}
        {avoidConflicts.length > 1 && ` +${avoidConflicts.length - 1} more you avoid`}
      </Badge>,
    );
  } else if (avoidPossible.length > 0) {
    badges.push(
      <Badge key="avoid" variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        Fragrance may hide {avoidPossible.length === 1 ? avoidedIngredientName(avoidPossible[0]) : `${avoidPossible.length} you avoid`}
      </Badge>,
    );
  } else if (avoid?.status === "clear") {
    badges.push(
      <Badge key="avoid" variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
        Clear of your avoid list
      </Badge>,
    );
  }
  if (match) badges.push(<MatchBadge key="match" match={match} />);
  if (hsaEligible) badges.push(<HsaBadge key="hsa" />);
  if (ewgScore) {
    badges.push(
      <Badge key="ewg" variant="outline" className={ewgHazardBadge(ewgScore.ewgScore).className}>
        {ewgHazardBadge(ewgScore.ewgScore).label}
      </Badge>,
    );
  }
  if (freeFromFlags.length > 0) {
    badges.push(
      <Badge
        key="free"
        variant="outline"
        className="border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
        title={freeFromFlags.map((id) => getFreeFromCheck(id)?.label ?? id).join(", ")}
      >
        {getFreeFromCheck(freeFromFlags[0])?.label ?? freeFromFlags[0]}
      </Badge>,
    );
  }

  return (
    <Link
      href={`/product/${encodeURIComponent(product.id)}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5 focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {/* Photos: OBF/brand_direct retail shots, or the FDA label's package
          image from DailyMed once the image sync has fetched it (see
          schema.ts's products.imageUrl comment). Products without one get
          no image band at all -- a grid of identical grey placeholders
          reads as missing content. The 4:3 box reserves the space before
          the lazy image loads, so nothing shifts. */}
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
          {origin && <OriginTag origin={origin} className="absolute right-3 top-3 shadow-sm" />}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
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
          {ingredientLine && <p className="line-clamp-2 text-xs font-medium text-foreground/80">{ingredientLine}</p>}
          {/* The form, and for anything not from an FDA label where the data
              came from, as plain small text: a source tier is still never
              shown unlabeled (lib/data-source.ts), it just doesn't lead. */}
          {(form || sourceBadge) && (
            <p className="text-xs text-muted-foreground">
              {form}
              {form && sourceBadge && " · "}
              {sourceBadge && (
                <span className={product.dataSource === "brand_direct" ? undefined : "text-amber-700 dark:text-amber-400"}>
                  {sourceBadge.label}
                </span>
              )}
            </p>
          )}
        </div>

        {badges.length > 0 && <div className="flex flex-wrap gap-1">{badges.slice(0, 2)}</div>}

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
