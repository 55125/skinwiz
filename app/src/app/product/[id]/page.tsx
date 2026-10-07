import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { AlertTriangle, ChevronLeft, ExternalLink, FlaskConical, Info, PlaySquare, Music2, Camera, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DualScoreBadges } from "@/components/score-badge";
import { RedFlagBanner } from "@/components/red-flag-banner";
import {
  getProduct,
  getRxProduct,
  getCanonicalProductId,
  getEvidenceNotesForActives,
  getAffiliateLinksForProduct,
  getManualLinksForProduct,
  getLivePrices,
  getVideoLinksForProduct,
  getEwgScoreForProduct,
  getEquivalentProducts,
  getConcern,
  getIngredientsForProduct,
  getMergedDuplicates,
  getRetailBarcodes,
  bestProductImage,
} from "@/lib/queries";
import { getScoresForProducts } from "@/lib/scoring";
import { getVideoSearchLinks } from "@/lib/video-links";
import { dataSourceBadge } from "@/lib/data-source";
import { FREE_FROM_CHECKS, getFreeFromCheck, ingredientFailsCheck } from "@/db/ingredient-flags";
import { findSafeSwaps, findSimilarProductsCached } from "@/lib/similar";
import { ewgHazardBadge } from "@/lib/ewg";
import { readSessionId } from "@/lib/session";
import { getSessionOutcome } from "@/lib/outcomes";
import { readAvoidIds, avoidVerdict, avoidedIngredientName } from "@/lib/avoid";
import { AllergenFindings } from "@/components/allergen-findings";
import { activeName, describeStrengths } from "@/lib/strength-display";
import { formatPct } from "@/db/strength";
import { monographStatus, formatRange } from "@/db/monograph-ranges";
import { OutcomeForm } from "@/components/outcome-form";
import { ProductGrid } from "@/components/product-grid";
import { IngredientList } from "@/components/ingredient-list";
import { ShelfButton } from "@/components/shelf-button";
import { getShelfEntry } from "@/lib/shelf";
import { RegimenButton } from "@/components/regimen-button";
import { primaryOwnRegimenId } from "@/lib/regimens";
import { HowToUse } from "@/components/how-to-use";
import { getLabelSections, getRegimenSlot, guidanceForActives, guidanceForStep, stepTypeOf, suggestSlot } from "@/lib/regimen";
import { MatchBadge } from "@/components/match-badge";
import { avoidLabelsFor, hasProfile, matchProduct, readProfile } from "@/lib/profile";
import { pubchemLinkText } from "@/lib/pubchem";
import { displayManufacturer, tidyIngredientName } from "@/lib/format";
import { productTitle, breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/site-url";
import { SITE_NAME } from "@/lib/brand";
import { getEquivalenceGroupForProduct, isHsaEligible } from "@/lib/otc-index";
import { HSA_GUIDE_PATH, HSA_STORE_AFFILIATE, isSunscreen } from "@/lib/hsa";
import { HsaBadge } from "@/components/hsa-badge";
import { EquivalenceExplainer, EquivalenceRows } from "@/components/equivalence-list";
import { FEATURES } from "@/lib/feature-flags";
import { productPregnancyFindings } from "@/lib/pregnancy";
import { PregnancyNotice } from "@/components/pregnancy-notice";
import { DAILYMED_IMAGE_CAPTION, isDailymedImageUrl, productImageAlt } from "@/lib/image-urls";
import { recallsForProduct } from "@/lib/recalls";
import { RecallBanner } from "@/components/recall-banner";
import { canViewRxReference } from "@/lib/clinicians";
import { isAmazonLink, manualLinkHref, manualLinkLabel } from "@/lib/manual-links";
import { headers } from "next/headers";
import { livePricesEnabled } from "@/lib/prices/config";
import { getDisplayQuotes, recordProductView } from "@/lib/prices/store";
import { outboundLink } from "@/lib/prices/redirect";
import { formatPerUnit, sortByUnitPrice, storeBrandSavings, type LivePrice } from "@/lib/prices/unit";
import { PriceList, StoreBrandSavingsNote } from "@/components/price-list";

// Crawlers and tools don't count as a "recently viewed" signal for price refreshes.
const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|curl|wget|python|headless|monitor/i;

const FREE_FROM_BADGE = "border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400";

// Each filter tag links to its guide page (more products passing the same
// check) -- also the main crawl path into the guides.
function FreeFromLink({ id }: { id: string }) {
  return (
    <Link href={`/guide/${id}`}>
      <Badge variant="outline" className={`${FREE_FROM_BADGE} hover:bg-emerald-50 dark:hover:bg-emerald-950/40`}>
        {getFreeFromCheck(id)?.label ?? id}
      </Badge>
    </Link>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(decodeURIComponent(id));
  if (!product) return {};
  const description = product.activeIngredientText
    ? `${product.brandName} — ${product.activeIngredientText}. Ingredients, matches and User Score on ${SITE_NAME}.`
    : `${product.brandName} on ${SITE_NAME}.`;
  const title = productTitle(product, describeStrengths, displayManufacturer);
  const canonical = `/product/${encodeURIComponent(getCanonicalProductId(product))}`;
  // The product's own photo in link previews, instead of the site-wide card.
  const image = bestProductImage(product, getMergedDuplicates(product.id));
  return {
    title,
    description,
    alternates: { canonical },
    ...(image
      ? {
          openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", title, description, url: canonical, images: [{ url: image, alt: productImageAlt(product) }] },
          twitter: { card: "summary", images: [image] },
        }
      : {}),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(decodeURIComponent(id));
  if (!product) {
    // Prescription rows have no consumer product page; a verified clinician
    // is sent to the Rx reference page instead, everyone else gets a 404.
    if (getRxProduct(decodeURIComponent(id)) && (await canViewRxReference())) redirect(`/rx/${encodeURIComponent(decodeURIComponent(id))}`);
    notFound();
  }
  // A merged duplicate listing (lib/canonical.ts) is the same product as its
  // canonical: one URL per product, permanently.
  if (product.canonicalId) permanentRedirect(`/product/${encodeURIComponent(product.canonicalId)}`);

  // Its other listings: their barcodes/NDCs as aliases, and the best photo.
  const duplicates = getMergedDuplicates(product.id);
  const imageUrl = bestProductImage(product, duplicates);
  const aliasCodes = [...duplicates.map((d) => d.id), ...getRetailBarcodes([product.id, ...duplicates.map((d) => d.id)])]
    .filter((c, i, all) => c !== product.id && !c.startsWith("http") && all.indexOf(c) === i);

  const concern = getConcern(product.concernId);
  const evidenceNotes = getEvidenceNotesForActives(product.activeIds as string[], product.concernId);
  const affiliateLinks = getAffiliateLinksForProduct(product.id);
  const manualLinks = getManualLinksForProduct(product.id);
  const videoLinks = getVideoLinksForProduct(product.id);
  const videoSearchLinks = getVideoSearchLinks(product.brandName);
  const { derm: dermScore, audience: audienceScore } = getScoresForProducts([
    { productId: product.id, concernId: product.concernId },
  ]).get(product.id)!;
  const sourceBadge = dataSourceBadge(product.dataSource);
  const ewgScore = getEwgScoreForProduct(product.id);
  const avoidIds = await readAvoidIds();
  const avoid = avoidVerdict(product, avoidIds);
  const profile = await readProfile();
  const shelfSession = await readSessionId();
  const shelfEntry = shelfSession ? getShelfEntry(shelfSession, product.id) : undefined;
  const sessionId = await readSessionId();
  const regimenSlot = sessionId ? getRegimenSlot(primaryOwnRegimenId(sessionId, false), product.id) : null;
  const slotSuggestion = suggestSlot(product);
  const labelSection = getLabelSections(product.splSetId);
  const activeGuidance = guidanceForActives(product.activeIds ?? []);
  const formulationGuidance = guidanceForStep(stepTypeOf(product));
  const myOutcome = sessionId ? getSessionOutcome(product.id, product.concernId, sessionId) : null;
  // Curated "same active, same strength" group when the product is in one
  // (lib/equivalence.ts rules); otherwise the raw same-strength-key list,
  // which is what sunscreens and antiperspirants fall back to.
  const equivalenceGroup = getEquivalenceGroupForProduct(product.id);
  // On a name brand's page the store brands are the news, so they lead; on a
  // store brand's page, the name brands do.
  const isStoreBrandPage = !!equivalenceGroup?.members.find((m) => m.ids.includes(product.id))?.storeBrand;
  const groupOthers = equivalenceGroup
    ? equivalenceGroup.members
        .filter((m) => !m.ids.includes(product.id))
        .sort((a, b) => Number(!!a.storeBrand === isStoreBrandPage) - Number(!!b.storeBrand === isStoreBrandPage))
    : [];
  // Live prices for the group (empty until a price source is configured, so
  // the rows, their order and the page stay as they were).
  const groupLive = equivalenceGroup ? getLivePrices(new Map(equivalenceGroup.members.map((m) => [m.id, m.ids]))) : new Map<string, LivePrice>();
  const groupPrices = new Map([...groupLive].map(([mid, p]) => [mid, { price: p.price, perUnit: formatPerUnit(p.perUnit) }]));
  const groupSavings = equivalenceGroup ? storeBrandSavings(equivalenceGroup.members, groupLive) : null;
  const groupRows = sortByUnitPrice(groupOthers, groupLive);
  const quotes = getDisplayQuotes(product.id);
  const brandLink = product.sourceUrl ? outboundLink(product.sourceUrl, { placement: "product", rel: "noopener noreferrer" }) : null;
  if (livePricesEnabled() && !BOT_UA.test((await headers()).get("user-agent") ?? "")) recordProductView(product.id);
  const equivalents = equivalenceGroup ? { rows: [], total: 0 } : getEquivalentProducts(product);
  const hsaEligible = isHsaEligible(product.id);
  const needsSwap = avoid?.status === "conflicts" || avoid?.status === "possible";
  const ingredientRows = getIngredientsForProduct(product.id);
  const isDrugLabel = product.dataSource === "openfda" || product.dataSource === "dailymed";
  const labelActives = ingredientRows.filter((r) => r.position <= 0);
  const listedIngredients = ingredientRows.filter((r) => r.position > 0);
  const similar = isDrugLabel
    ? []
    : findSimilarProductsCached(listedIngredients.map((r) => r.ingredientId), { excludeId: product.id, limit: 4 });
  const safeSwaps = needsSwap
    ? findSafeSwaps(product, ingredientRows.filter((r) => r.position > 0).map((r) => r.ingredientId), avoidIds)
    : [];
  const match = matchProduct(
    product,
    ingredientRows.map((r) => ({ id: r.ingredientId, position: r.position, isActive: r.isActive })),
    profile,
    avoidLabelsFor(avoidIds),
  );
  const showPregnancy = FEATURES.PREGNANCY_MODE && (profile.pregnant || profile.breastfeeding);
  const pregnancyFound = showPregnancy ? productPregnancyFindings(product, ingredientRows) : [];
  const flaggedSkin = product.freeFromFlags
    ? FREE_FROM_CHECKS.filter((c) => c.category === "skin" && !product.freeFromFlags!.includes(c.id)).map((c) => ({
        check: c,
        hits: listedIngredients.filter((r) => ingredientFailsCheck(c, r.rawName)).map((r) => r.rawName),
      }))
    : [];
  const strengthRows = product.strengths
    ? product.activeIds
        .filter((id) => product.strengths && id in product.strengths)
        .map((id) => ({ id, pct: product.strengths![id], monograph: monographStatus(id, product.strengths![id]) }))
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:py-10">
      <JsonLd
        data={breadcrumbLd(siteUrl(), [
          ["Home", "/"],
          ...(concern ? [[concern.name, `/concern/${concern.id}`] as [string, string]] : []),
          [product.brandName, `/product/${encodeURIComponent(product.id)}`],
        ])}
      />
      {concern && (
        <Link
          href={`/concern/${concern.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {concern.name}
        </Link>
      )}

      <div className={imageUrl ? "grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start" : ""}>
        {imageUrl && (
          <figure className="space-y-2 md:sticky md:top-24">
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl border bg-white dark:bg-gradient-to-br dark:from-muted dark:to-secondary md:aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element -- mix of self-hosted (brand-direct, pre-rendered DailyMed WebP) and external OBF-hosted photos; not worth a next/image remotePatterns allowlist for the OBF case alone */}
              <img
                src={imageUrl}
                alt={productImageAlt(product)}
                width={800}
                height={800}
                className="h-full w-full object-contain p-8"
                decoding="async"
              />
            </div>
            {isDailymedImageUrl(imageUrl) && (
              <figcaption className="text-center text-xs text-muted-foreground">{DAILYMED_IMAGE_CAPTION}</figcaption>
            )}
          </figure>
        )}

        <div className="space-y-6">
          <div className="space-y-3">
            {product.manufacturer && (
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">{displayManufacturer(product.manufacturer)}</p>
            )}
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{product.brandName}</h1>
            <div className="flex flex-wrap gap-2">
              {product.dosageForm && <Badge variant="secondary">{product.dosageForm}</Badge>}
              {sourceBadge && (
                <Badge variant="outline" className={sourceBadge.className}>
                  {sourceBadge.label}
                </Badge>
              )}
              {hsaEligible && (
                <Link href={HSA_GUIDE_PATH} aria-label="Usually HSA/FSA eligible — how eligibility works">
                  <HsaBadge />
                </Link>
              )}
              {/* HSA/FSA store affiliate hook: renders nothing until
                  HSA_STORE_AFFILIATE is set in lib/hsa.ts. */}
              {hsaEligible && HSA_STORE_AFFILIATE && (
                <a href={HSA_STORE_AFFILIATE.url} target="_blank" rel="sponsored noopener noreferrer" className="text-xs text-brand underline">
                  Shop HSA/FSA at {HSA_STORE_AFFILIATE.name} (affiliate link)
                </a>
              )}
            </div>
          </div>

          <RecallBanner recalls={recallsForProduct(product.id)} />

          <DualScoreBadges dermScore={dermScore} audienceScore={audienceScore} />

          <RegimenButton
            productId={product.id}
            initialSlot={regimenSlot}
            suggestedSlot={slotSuggestion.slot}
            suggestedReason={slotSuggestion.reason}
          />

          <ShelfButton
            key={`${shelfEntry?.status ?? "none"}-${shelfEntry?.opened ?? false}-${regimenSlot ?? "out"}`}
            productId={product.id}
            initialStatus={shelfEntry?.status ?? null}
            initialOpened={shelfEntry?.opened ?? false}
            inRegimen={regimenSlot !== null}
          />

          {avoid?.status === "conflicts" && (
            <Alert className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle>Contains {avoid.conflicts.length === 1 ? "something" : `${avoid.conflicts.length} things`} on your avoid list</AlertTitle>
              <AlertDescription>
                {avoid.conflicts.map(avoidedIngredientName).join(", ")}. Based on the published ingredient list —{" "}
                <Link href="/avoid" className="underline">
                  edit your list
                </Link>
                .{safeSwaps.length > 0 && (
                  <>
                    {" "}
                    <a href="#safe-swaps" className="font-medium underline">
                      See {safeSwaps.length} similar without them ↓
                    </a>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          {(avoid?.status === "possible" || (avoid?.status === "conflicts" && avoid.possible.length > 0)) && (
            <Alert className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Undisclosed fragrance: can&apos;t rule out {avoid.possible.length === 1 ? "an allergen" : `${avoid.possible.length} allergens`} you avoid</AlertTitle>
              <AlertDescription>
                {avoid.possible.map(avoidedIngredientName).join(", ")} wouldn&apos;t have to be named on the label when
                it&apos;s part of &ldquo;fragrance&rdquo; or &ldquo;parfum.&rdquo;
                {avoid.status === "possible" && safeSwaps.length > 0 && (
                  <>
                    {" "}
                    <a href="#safe-swaps" className="font-medium underline">
                      See {safeSwaps.length} similar without it ↓
                    </a>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          {avoid?.status === "clear" && (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Clear of all {avoid.checked} ingredients on your avoid list, per the published ingredient list.
            </p>
          )}
          {avoid?.status === "unassessed" && (
            <p className="rounded-xl border border-dashed px-3.5 py-2.5 text-sm text-muted-foreground">
              Couldn&apos;t check this product against your avoid list — no full ingredient list is available for
              it, so it&apos;s unknown, not clear.
            </p>
          )}

          {showPregnancy && (
            <PregnancyNotice
              findings={pregnancyFound}
              pregnant={profile.pregnant}
              breastfeeding={profile.breastfeeding}
              fullList={product.freeFromFlags !== null}
            />
          )}

          {match ? (
            <div className="space-y-2.5 rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Match for your skin</h2>
                <MatchBadge match={match} />
              </div>
              {match.reasons.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {match.reasons.map((r, i) => (
                    <li key={i} className={r.tone === "good" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
                      {r.tone === "good" ? "+" : "−"} {r.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing in this ingredient list stands out for or against your profile.</p>
              )}
              <p className="text-xs text-muted-foreground">
                A rule-based estimate from the published ingredient list and your{" "}
                <Link href="/profile" className="underline">
                  profile
                </Link>
                , not a prediction of how your skin will react.
              </p>
            </div>
          ) : (
            !hasProfile(profile) && (
              <Link href="/profile" className="block rounded-xl border border-dashed px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-muted">
                Tell us your skin type and concerns to see how well this product matches you →
              </Link>
            )
          )}

          {strengthRows.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Strength (from the FDA label)
              </h2>
              <ul className="space-y-2">
                {strengthRows.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold tabular-nums">
                      {activeName(row.id)} {formatPct(row.pct)}
                    </span>
                    {row.monograph && (
                      <Badge
                        variant="outline"
                        title={`${row.monograph.range.cfr}: ${formatRange(row.monograph.range)}`}
                        className={
                          row.monograph.status === "within"
                            ? "border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
                            : "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-400"
                        }
                      >
                        {row.monograph.status === "within"
                          ? `Within FDA OTC monograph range (${formatRange(row.monograph.range)})`
                          : `${row.monograph.status === "above" ? "Above" : "Below"} FDA OTC monograph range (${formatRange(row.monograph.range)})`}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                The monograph range is what the FDA permits for this active in an OTC product — a regulatory fact,
                not a rating. A strength outside it may reflect how the label was filed rather than the product
                itself; check the label on the package.
              </p>
            </div>
          )}

          {ewgScore && (
            <a
              href={ewgScore.ewgProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-sm transition-colors hover:border-brand/40"
            >
              <Badge variant="outline" className={ewgHazardBadge(ewgScore.ewgScore).className}>
                {ewgHazardBadge(ewgScore.ewgScore).label}
              </Badge>
              <span className="flex-1 text-muted-foreground">
                EWG Skin Deep hazard score{ewgScore.dataAvailability ? ` · ${ewgScore.dataAvailability} data` : ""}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="sr-only"> (opens in new tab)</span></a>
          )}

          {product.activeIngredientText && (
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {isDrugLabel
                  ? "Active ingredient (from FDA label)"
                  : product.dataSource === "brand_direct"
                    ? "Ingredients (from manufacturer)"
                    : "Ingredients (community-sourced)"}
              </h2>
              {isDrugLabel ? (
                <>
                  <p className="text-sm leading-relaxed">{product.activeIngredientText}</p>
                  {labelActives.length > 0 && <IngredientList items={labelActives} className="mt-2" likes={profile.likes} dislikes={profile.dislikes} />}
                </>
              ) : ingredientRows.length > 0 ? (
                <IngredientList items={ingredientRows} likes={profile.likes} dislikes={profile.dislikes} />
              ) : (
                <p className="text-sm leading-relaxed">{product.activeIngredientText}</p>
              )}
              {!isDrugLabel && ingredientRows.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tap any ingredient to see what it is and every product that contains it. Bold items are actives
                  we track.
                </p>
              )}
            </div>
          )}

          <HowToUse label={labelSection} activeGuidance={activeGuidance} formulation={formulationGuidance} />

          {isDrugLabel && listedIngredients.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Inactive ingredients (from FDA label)
              </h2>
              <IngredientList items={listedIngredients} likes={profile.likes} dislikes={profile.dislikes} />
            </div>
          )}

          {product.allergenHits && (
            <AllergenFindings
              hits={product.allergenHits}
              ingredientNames={ingredientRows.map((r) => r.rawName)}
              avoidIds={avoidIds}
            />
          )}

          {product.freeFromFlags && product.freeFromFlags.length > 0 && (
            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ingredient-based filters this matches
              </h2>
              {/* First 6 inline, the rest behind a native disclosure -- 20+
                  chips in a block buried the ingredient list above. The
                  summary is only the toggle: links inside a summary are
                  nested interactive controls (axe nested-interactive). */}
              <div className="flex flex-wrap gap-1.5">
                {product.freeFromFlags.slice(0, 6).map((id) => (
                  <FreeFromLink key={id} id={id} />
                ))}
              </div>
              {product.freeFromFlags.length > 6 && (
                <details className="group/ff mt-1.5">
                  <summary className="w-fit cursor-pointer list-none text-xs font-medium text-brand [&::-webkit-details-marker]:hidden">
                    <span className="group-open/ff:hidden">Show all {product.freeFromFlags.length} →</span>
                    <span className="hidden group-open/ff:inline">Show fewer</span>
                  </summary>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {product.freeFromFlags.slice(6).map((id) => (
                      <FreeFromLink key={id} id={id} />
                    ))}
                  </div>
                </details>
              )}
              {flaggedSkin.some((f) => f.hits.length > 0) && (
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {flaggedSkin
                    .filter((f) => f.hits.length > 0)
                    .map(({ check, hits }) => (
                      <p key={check.id}>
                        <span className="font-medium text-foreground">Not {check.label.toLowerCase()}:</span>{" "}
                        {hits.slice(0, 6).map(tidyIngredientName).join(", ")}
                        {hits.length > 6 ? ` +${hits.length - 6} more` : ""}
                      </p>
                    ))}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Computed from the published ingredient list above, not a certification — not exhaustive, and not a
                substitute for checking your own known allergens.
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className={
          product.dataSource === "open_beauty_facts" || product.dataSource === "brand_direct"
            ? "grid gap-3 md:grid-cols-2 md:items-start"
            : undefined
        }
      >
      {product.dataSource === "open_beauty_facts" && (
        <Alert className="border-dashed bg-transparent">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle>Community-sourced listing, not FDA-verified</AlertTitle>
          <AlertDescription className="text-[13px]">
            This product&apos;s data comes from Open Beauty Facts, a crowd-edited database — anyone can
            submit or edit an entry. Unlike the rest of the catalog, this listing hasn&apos;t been
            independently verified. Ingredient names and amounts may be incomplete or inaccurate.
          </AlertDescription>
        </Alert>
      )}

      {product.dataSource === "brand_direct" && (
        <Alert className="bg-transparent">
          <Info className="h-4 w-4 text-sky-600" />
          <AlertTitle>Sourced directly from the manufacturer</AlertTitle>
          <AlertDescription className="text-[13px]">
            This ingredient list comes from {product.manufacturer ? displayManufacturer(product.manufacturer) : "the brand"}&apos;s own published
            product page, not a crowd-edited database. It isn&apos;t an FDA drug filing (this active has
            no OTC monograph status), but it is the manufacturer&apos;s own disclosed claim.
          </AlertDescription>
        </Alert>
      )}

      <RedFlagBanner />
      </div>

      {safeSwaps.length > 0 && (
        <section id="safe-swaps" className="scroll-mt-24 space-y-4 rounded-3xl border border-emerald-300/70 bg-emerald-50/40 p-5 sm:p-6 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Without what you avoid</h2>
            <p className="text-sm text-muted-foreground">
              Similar products whose full ingredient lists are clear of everything on your{" "}
              <Link href="/avoid" className="underline">
                avoid list
              </Link>
              , including fragrance allergens that could hide in an undisclosed fragrance.
            </p>
          </div>
          <ProductGrid products={safeSwaps} columns="sm:grid-cols-2 lg:grid-cols-4" />
        </section>
      )}

      <OutcomeForm
        productId={product.id}
        concernName={concern?.name ?? "this concern"}
        initial={myOutcome}
        finished={shelfEntry?.status === "empty"}
      />

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <FlaskConical className="h-5 w-5 text-brand" />
          Why this active
        </h2>
        <div className={evidenceNotes.length > 1 ? "grid gap-4 md:grid-cols-2" : undefined}>
        {evidenceNotes.map((note) => (
          <div key={note.activeId} className="space-y-2 rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">{note.activeName}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{note.summary}</p>
            {note.typicalConcentrationText && (
              <p className="text-xs text-muted-foreground">{note.typicalConcentrationText}</p>
            )}
            {note.needsClinicianReview && (
              <p className="text-xs italic text-amber-700 dark:text-amber-400">
                Clinical evidence grade: pending board-certified dermatologist review.
              </p>
            )}
            {note.pubchemCid && (
              <p className="text-xs">
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${note.pubchemCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand hover:underline"
                >
                  {pubchemLinkText(note.activeId, note.molecularFormula)}
                <span className="sr-only"> (opens in new tab)</span></a>
              </p>
            )}
          </div>
        ))}
        </div>
      </section>

      {equivalenceGroup && groupOthers.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Same active, same strength</h2>
            <EquivalenceExplainer group={equivalenceGroup} />
          </div>
          {groupSavings && <StoreBrandSavingsNote savings={groupSavings} live={groupLive} />}
          <EquivalenceRows members={groupRows.slice(0, 8)} compareWith={product.id} prices={groupPrices} />
          <Link href={`/same/${equivalenceGroup.slug}`} className="inline-block text-sm font-medium text-brand hover:underline">
            {groupOthers.length > 8 ? `See all ${equivalenceGroup.members.length}` : "All"} {equivalenceGroup.title} products
            {equivalenceGroup.members.some((m) => m.storeBrand) ? ", including store brands" : ""} →
          </Link>
        </section>
      )}

      {equivalents.total > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Same active, same strength</h2>
            <p className="text-sm text-muted-foreground">
              {equivalents.total.toLocaleString()} other {equivalents.total === 1 ? "product lists" : "products list"} the
              identical active ingredient{product.activeIds.length > 1 ? "s" : ""} at the identical strength
              {product.dosageForm ? ` in the same form (${product.dosageForm.toLowerCase()})` : ""} on the FDA label — often a
              store brand or generic. Inactive ingredients, texture, and price can still differ.
              {isSunscreen(product) &&
                " For sunscreens, SPF and broad-spectrum protection are tested on each finished product, so the same filters don't guarantee the same SPF — check each label."}
            </p>
          </div>
          <ProductGrid products={equivalents.rows} columns="sm:grid-cols-2 lg:grid-cols-4" />
        </section>
      )}

      {similar.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Similar formulas</h2>
            <p className="text-sm text-muted-foreground">
              Products whose ingredient lists overlap most with this one, weighting distinctive ingredients over
              common ones like water and glycerin. Similar lists are not identical formulas — concentrations,
              texture and price differ.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {similar.map((s) => (
              <div key={s.product.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <Link href={`/product/${encodeURIComponent(s.product.id)}`} className="block truncate font-medium hover:underline">
                    {s.product.brandName}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {Math.round(s.score * 100)}% match · {s.shared} shared ingredients
                    {s.product.manufacturer ? ` · ${displayManufacturer(s.product.manufacturer)}` : ""}
                  </p>
                </div>
                <Link
                  href={`/compare?a=${encodeURIComponent(product.id)}&b=${encodeURIComponent(s.product.id)}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Compare
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Where to buy</h2>
        {/* Live prices (lib/prices): only while configured, only quotes under 72h old. */}
        {quotes.length > 0 && <PriceList quotes={quotes} />}
        {/* Hand-made affiliate links (manual_links.csv): no price, just the store and size. */}
        {manualLinks.length > 0 && (
          <div className="space-y-2">
            {manualLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                <div>
                  <p className="font-medium">{manualLinkLabel(link)}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAmazonLink(link.url)
                      ? "As an Amazon Associate I earn from qualifying purchases."
                      : "Affiliate link — we may earn a commission."}
                  </p>
                </div>
                <a
                  href={manualLinkHref(link.url)}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Buy <ExternalLink className="ml-1 h-3.5 w-3.5" />
                <span className="sr-only"> (opens in new tab)</span></a>
              </div>
            ))}
          </div>
        )}
        {affiliateLinks.length > 0 && quotes.length === 0 ? (
          <div className="space-y-2">
            {affiliateLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                <div>
                  <p className="font-medium">
                    {link.price ? `$${link.price.toFixed(2)}` : "See retailer"}{" "}
                    <span className="text-xs text-muted-foreground">via {link.network}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Affiliate link — we may earn a commission.</p>
                </div>
                <a
                  href={link.buyUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Buy <ExternalLink className="ml-1 h-3.5 w-3.5" />
                <span className="sr-only"> (opens in new tab)</span></a>
              </div>
            ))}
          </div>
        ) : brandLink ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
            <div>
              <p className="font-medium">Buy directly from {product.manufacturer || "the manufacturer"}</p>
              <p className="text-xs text-muted-foreground">
                {brandLink.wrapped ? (
                  <>
                    Affiliate link — we may earn a commission. This is the exact manufacturer page this
                    listing&apos;s ingredient data came from.
                  </>
                ) : (
                  <>
                    Not an affiliate link — we don&apos;t earn a commission on this one. This is the exact
                    manufacturer page this listing&apos;s ingredient data came from.
                  </>
                )}
              </p>
            </div>
            <a
              href={brandLink.href}
              target="_blank"
              rel={brandLink.rel}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Visit page <ExternalLink className="ml-1 h-3.5 w-3.5" />
            <span className="sr-only"> (opens in new tab)</span></a>
          </div>
        ) : manualLinks.length > 0 || quotes.length > 0 ? null : (
          <Alert>
            <AlertTitle>Retailer links coming soon</AlertTitle>
            <AlertDescription>
              We&apos;re still setting up affiliate partnerships. In the meantime, check this product
              directly with your preferred retailer or the manufacturer&apos;s site.
            </AlertDescription>
          </Alert>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Video reviews</h2>
        {videoLinks.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {videoLinks.map((v) => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
              >
                {v.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- external thumbnails, no fixed domain worth configuring for a rarely-populated field
                  <img src={v.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />
                )}
                <div className="p-2">
                  <p className="line-clamp-2 text-xs font-medium">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{v.channelTitle}</p>
                </div>
              <span className="sr-only"> (opens in new tab)</span></a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            We haven&apos;t indexed specific videos for this product yet — search directly:
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {videoLinks.length === 0 && (
            <a
              href={videoSearchLinks.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <PlaySquare className="h-3.5 w-3.5" /> YouTube
            <span className="sr-only"> (opens in new tab)</span></a>
          )}
          <a
            href={videoSearchLinks.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Music2 className="h-3.5 w-3.5" /> TikTok
          <span className="sr-only"> (opens in new tab)</span></a>
          <a
            href={videoSearchLinks.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Camera className="h-3.5 w-3.5" /> Instagram
          <span className="sr-only"> (opens in new tab)</span></a>
        </div>
        <p className="text-xs italic text-muted-foreground">
          These are search links, not vetted reviews — {SITE_NAME} doesn&apos;t screen or endorse social
          content. Only the scores above come from feedback collected on {SITE_NAME}.
        </p>
      </section>

      {aliasCodes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Also listed under {aliasCodes.length === 1 ? "code" : "codes"} {aliasCodes.slice(0, 12).join(", ")}
          {aliasCodes.length > 12 ? ` and ${aliasCodes.length - 12} more` : ""} (other pack sizes or listings of this product).
        </p>
      )}

      {product.splSetId && (
        <p className="text-xs text-muted-foreground">
          <a
            className="underline"
            href={`https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${product.splSetId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View full FDA label on DailyMed
          <span className="sr-only"> (opens in new tab)</span></a>
        </p>
      )}
    </div>
  );
}
