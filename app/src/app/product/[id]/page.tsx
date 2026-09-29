import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, FlaskConical, PlaySquare, Music2, Camera } from "lucide-react";
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
  getConcern,
} from "@/lib/queries";
import { getScoresForProducts } from "@/lib/scoring";
import { getVideoSearchLinks } from "@/lib/video-links";
import { dataSourceBadge } from "@/lib/data-source";
import { getFreeFromCheck } from "@/db/ingredient-flags";
import { ewgHazardBadge } from "@/lib/ewg";

// These canonical active ids are deliberately a family of several distinct
// real compounds grouped under one consumer-facing name (see the comments
// on each in db/actives.ts) -- a single PubChem CID for one of them isn't
// "the" structure the way it is for e.g. niacinamide, so the link below is
// worded as "a representative structure" for these specifically.
const GROUPED_ACTIVE_IDS = new Set(["peptides", "ceramides", "aluminum-zirconium-complex"]);

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
                {product.dataSource === "openfda" || product.dataSource === "dailymed"
                  ? "Active ingredient (from FDA label)"
                  : product.dataSource === "brand_direct"
                    ? "Ingredients (from manufacturer)"
                    : "Ingredients (community-sourced)"}
              </h2>
              <p className="text-sm leading-relaxed">{product.activeIngredientText}</p>
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
                  {/* A few active ids here are deliberately a family of several
                      real compounds (e.g. "Peptides" groups palmitoyl
                      pentapeptide, copper tripeptide, etc. -- see actives.ts) --
                      worded as "a representative" rather than "the" structure
                      for those, so this doesn't overclaim precision it doesn't have. */}
                  {GROUPED_ACTIVE_IDS.has(note.activeId)
                    ? `View a representative structure on PubChem${note.molecularFormula ? ` (${note.molecularFormula})` : ""} →`
                    : `View chemical structure on PubChem${note.molecularFormula ? ` (${note.molecularFormula})` : ""} →`}
                <span className="sr-only"> (opens in new tab)</span></a>
              </p>
            )}
          </div>
        ))}
        </div>
      </section>

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
