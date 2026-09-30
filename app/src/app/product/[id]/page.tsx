import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, ExternalLink, FlaskConical, PlaySquare, Music2, Camera, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DualScoreBadges } from "@/components/score-badge";
import { RedFlagBanner } from "@/components/red-flag-banner";
import {
  getProduct,
  getEvidenceNotesForActives,
  getAffiliateLinksForProduct,
  getVideoLinksForProduct,
  getEwgScoreForProduct,
  getEquivalentProducts,
  getConcern,
  getIngredientsForProduct,
} from "@/lib/queries";
import { getScoresForProducts } from "@/lib/scoring";
import { getVideoSearchLinks } from "@/lib/video-links";
import { dataSourceBadge } from "@/lib/data-source";
import { FREE_FROM_CHECKS, getFreeFromCheck, ingredientFailsCheck } from "@/db/ingredient-flags";
import { findSimilarProducts } from "@/lib/similar";
import { ewgHazardBadge } from "@/lib/ewg";
import { readSessionId } from "@/lib/session";
import { getSessionOutcome } from "@/lib/outcomes";
import { readAvoidIds, avoidVerdict, avoidedIngredientName } from "@/lib/avoid";
import { activeName } from "@/lib/strength-display";
import { formatPct } from "@/db/strength";
import { monographStatus, formatRange } from "@/db/monograph-ranges";
import { OutcomeForm } from "@/components/outcome-form";
import { ProductGrid } from "@/components/product-grid";
import { IngredientList } from "@/components/ingredient-list";
import { MatchBadge } from "@/components/match-badge";
import { avoidLabelsFor, hasProfile, matchProduct, readProfile } from "@/lib/profile";
import { pubchemLinkText } from "@/lib/pubchem";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(decodeURIComponent(id));
  if (!product) return {};
  const description = product.activeIngredientText
    ? `${product.brandName} — ${product.activeIngredientText}. Derm Score and Audience Score on SkinWiz.`
    : `${product.brandName} on SkinWiz.`;
  return {
    title: `${product.brandName} — SkinWiz`,
    description,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(decodeURIComponent(id));
  if (!product) notFound();

  const concern = getConcern(product.concernId);
  const evidenceNotes = getEvidenceNotesForActives(product.activeIds as string[], product.concernId);
  const affiliateLinks = getAffiliateLinksForProduct(product.id);
  const videoLinks = getVideoLinksForProduct(product.id);
  const videoSearchLinks = getVideoSearchLinks(product.brandName);
  const { derm: dermScore, audience: audienceScore } = getScoresForProducts([
    { productId: product.id, concernId: product.concernId },
  ]).get(product.id)!;
  const sourceBadge = dataSourceBadge(product.dataSource);
  const ewgScore = getEwgScoreForProduct(product.id);
  const avoidIds = await readAvoidIds();
  const avoid = avoidVerdict(product.freeFromFlags, avoidIds);
  const profile = await readProfile();
  const sessionId = await readSessionId();
  const myOutcome = sessionId ? getSessionOutcome(product.id, product.concernId, sessionId) : null;
  const equivalents = getEquivalentProducts(product);
  const ingredientRows = getIngredientsForProduct(product.id);
  const isDrugLabel = product.dataSource === "openfda" || product.dataSource === "dailymed";
  const labelActives = ingredientRows.filter((r) => r.position <= 0);
  const listedIngredients = ingredientRows.filter((r) => r.position > 0);
  const similar = isDrugLabel
    ? []
    : findSimilarProducts(listedIngredients.map((r) => r.ingredientId), { excludeId: product.id, limit: 4 });
  const match = matchProduct(
    product,
    ingredientRows.map((r) => ({ id: r.ingredientId, position: r.position, isActive: r.isActive })),
    profile,
    avoidLabelsFor(avoidIds),
  );
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
      {concern && (
        <Link
          href={`/concern/${concern.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {concern.name}
        </Link>
      )}

      <div className={product.imageUrl ? "grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start" : ""}>
        {product.imageUrl && (
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl border bg-gradient-to-br from-muted to-secondary md:sticky md:top-24 md:aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element -- mix of same-origin (brand-direct, self-hosted) and external OBF-hosted photos; not worth a next/image remotePatterns allowlist for the OBF case alone */}
            <img src={product.imageUrl} alt={product.brandName} className="h-full w-full object-contain p-8" />
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-3">
            {product.manufacturer && (
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">{product.manufacturer}</p>
            )}
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{product.brandName}</h1>
            <div className="flex flex-wrap gap-2">
              {product.dosageForm && <Badge variant="secondary">{product.dosageForm}</Badge>}
              {sourceBadge && (
                <Badge variant="outline" className={sourceBadge.className}>
                  {sourceBadge.label}
                </Badge>
              )}
            </div>
          </div>

          <DualScoreBadges dermScore={dermScore} audienceScore={audienceScore} />

          {avoid?.status === "conflicts" && (
            <Alert className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle>Contains {avoid.conflicts.length === 1 ? "something" : `${avoid.conflicts.length} things`} on your avoid list</AlertTitle>
              <AlertDescription>
                {avoid.conflicts.map(avoidedIngredientName).join(", ")}. Based on the published ingredient list —{" "}
                <Link href="/avoid" className="underline">
                  edit your list
                </Link>
                .
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

          {isDrugLabel && listedIngredients.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Inactive ingredients (from FDA label)
              </h2>
              <IngredientList items={listedIngredients} likes={profile.likes} dislikes={profile.dislikes} />
            </div>
          )}

          {product.freeFromFlags && product.freeFromFlags.length > 0 && (
            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ingredient-based filters this matches
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {product.freeFromFlags.map((id) => (
                  <Badge
                    key={id}
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
                  >
                    {getFreeFromCheck(id)?.label ?? id}
                  </Badge>
                ))}
              </div>
              {flaggedSkin.some((f) => f.hits.length > 0) && (
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {flaggedSkin
                    .filter((f) => f.hits.length > 0)
                    .map(({ check, hits }) => (
                      <p key={check.id}>
                        <span className="font-medium text-foreground">Not {check.label.toLowerCase()}:</span>{" "}
                        {hits.slice(0, 6).join(", ")}
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
            ? "grid gap-4 md:grid-cols-2"
            : undefined
        }
      >
      {product.dataSource === "open_beauty_facts" && (
        <Alert className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTitle>Community-sourced listing, not FDA-verified</AlertTitle>
          <AlertDescription>
            This product&apos;s data comes from Open Beauty Facts, a crowd-edited database — anyone can
            submit or edit an entry. Unlike the rest of the catalog, this listing hasn&apos;t been
            independently verified. Ingredient names and amounts may be incomplete or inaccurate.
          </AlertDescription>
        </Alert>
      )}

      {product.dataSource === "brand_direct" && (
        <Alert className="border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40">
          <AlertTitle>Sourced directly from the manufacturer</AlertTitle>
          <AlertDescription>
            This ingredient list comes from {product.manufacturer || "the brand"}&apos;s own published
            product page, not a crowd-edited database. It isn&apos;t an FDA drug filing (this active has
            no OTC monograph status), but it is the manufacturer&apos;s own disclosed claim.
          </AlertDescription>
        </Alert>
      )}

      <RedFlagBanner />
      </div>

      <OutcomeForm productId={product.id} concernName={concern?.name ?? "this concern"} initial={myOutcome} />

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

      {equivalents.total > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Same active, same strength</h2>
            <p className="text-sm text-muted-foreground">
              {equivalents.total.toLocaleString()} other {equivalents.total === 1 ? "product lists" : "products list"} the
              identical active ingredient{product.activeIds.length > 1 ? "s" : ""} at the identical strength
              {product.dosageForm ? ` in the same form (${product.dosageForm.toLowerCase()})` : ""} on the FDA label — often a
              store brand or generic. Inactive ingredients, texture, and price can still differ.
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
              <div key={s.product.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <Link href={`/product/${encodeURIComponent(s.product.id)}`} className="block truncate font-medium hover:underline">
                    {s.product.brandName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(s.score * 100)}% match · {s.shared} shared ingredients
                    {s.product.manufacturer ? ` · ${s.product.manufacturer}` : ""}
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
        {affiliateLinks.length > 0 ? (
          <div className="space-y-2">
            {affiliateLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                <div>
                  <p className="font-medium">
                    {link.price ? `$${link.price.toFixed(2)}` : "See retailer"}{" "}
                    <span className="text-xs text-muted-foreground">via {link.network}</span>
                    {link.isDemo && (
                      <Badge variant="outline" className="ml-2 border-dashed text-amber-700 dark:text-amber-400">
                        Demo — not a live price
                      </Badge>
                    )}
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
        ) : product.sourceUrl ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
            <div>
              <p className="font-medium">Buy directly from {product.manufacturer || "the manufacturer"}</p>
              <p className="text-xs text-muted-foreground">
                Not an affiliate link — we don&apos;t earn a commission on this one. This is the exact
                manufacturer page this listing&apos;s ingredient data came from.
              </p>
            </div>
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Visit page <ExternalLink className="ml-1 h-3.5 w-3.5" />
            <span className="sr-only"> (opens in new tab)</span></a>
          </div>
        ) : (
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
          These are search links, not vetted reviews — SkinWiz doesn&apos;t screen or endorse social
          content. Only Derm Score and Audience Score above reflect verified feedback.
        </p>
      </section>

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
