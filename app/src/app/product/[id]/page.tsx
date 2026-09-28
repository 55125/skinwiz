import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, FlaskConical, PlaySquare, Music2, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DualScoreBadges } from "@/components/score-badge";
import { RedFlagBanner } from "@/components/red-flag-banner";
import {
  getProduct,
  getEvidenceNotesForActives,
  getAffiliateLinksForProduct,
  getVideoLinksForProduct,
  getConcern,
} from "@/lib/queries";
import { getDermScore, getAudienceScore } from "@/lib/scoring";
import { getVideoSearchLinks } from "@/lib/video-links";
import { dataSourceBadge } from "@/lib/data-source";
import { getFreeFromCheck } from "@/db/ingredient-flags";

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
  const dermScore = getDermScore(product.id, product.concernId);
  const audienceScore = getAudienceScore(product.id, product.concernId);
  const sourceBadge = dataSourceBadge(product.dataSource);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <div>
        {concern && (
          <Link href={`/concern/${concern.id}`} className="text-sm text-muted-foreground underline">
            ← Back to {concern.name}
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{product.brandName}</h1>
        {product.manufacturer && <p className="text-muted-foreground">{product.manufacturer}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {product.dosageForm && <Badge variant="secondary">{product.dosageForm}</Badge>}
          {sourceBadge && (
            <Badge variant="outline" className={sourceBadge.className}>
              {sourceBadge.label}
            </Badge>
          )}
        </div>
      </div>

      {product.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- mix of same-origin (brand-direct, self-hosted) and external OBF-hosted photos; not worth a next/image remotePatterns allowlist for the OBF case alone
        <img
          src={product.imageUrl}
          alt={product.brandName}
          className="mx-auto aspect-square w-full max-w-xs rounded-lg bg-muted object-contain p-4"
        />
      )}

      <DualScoreBadges dermScore={dermScore} audienceScore={audienceScore} />

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

      {product.activeIngredientText && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {product.dataSource === "openfda" || product.dataSource === "dailymed"
              ? "Active ingredient (from FDA label)"
              : product.dataSource === "brand_direct"
                ? "Ingredients (from manufacturer)"
                : "Ingredients (community-sourced)"}
          </h2>
          <p className="text-sm">{product.activeIngredientText}</p>
        </div>
      )}

      {product.freeFromFlags && product.freeFromFlags.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
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
          <p className="mt-1 text-xs italic text-muted-foreground">
            Computed from the published ingredient list above, not a certification — not exhaustive, and not a
            substitute for checking your own known allergens.
          </p>
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-sky-600" />
          Why this active
        </h2>
        {evidenceNotes.map((note) => (
          <div key={note.activeId} className="space-y-1 rounded-md border p-4">
            <h3 className="font-medium">{note.activeName}</h3>
            <p className="text-sm text-muted-foreground">{note.summary}</p>
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
                  className="underline text-muted-foreground hover:text-foreground"
                >
                  {/* A few active ids here are deliberately a family of several
                      real compounds (e.g. "Peptides" groups palmitoyl
                      pentapeptide, copper tripeptide, etc. -- see actives.ts) --
                      worded as "a representative" rather than "the" structure
                      for those, so this doesn't overclaim precision it doesn't have. */}
                  {GROUPED_ACTIVE_IDS.has(note.activeId)
                    ? `View a representative structure on PubChem${note.molecularFormula ? ` (${note.molecularFormula})` : ""} →`
                    : `View chemical structure on PubChem${note.molecularFormula ? ` (${note.molecularFormula})` : ""} →`}
                </a>
              </p>
            )}
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Where to buy</h2>
        {affiliateLinks.length > 0 ? (
          <div className="space-y-2">
            {affiliateLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between rounded-md border p-3">
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
                </a>
              </div>
            ))}
          </div>
        ) : product.sourceUrl ? (
          <div className="flex items-center justify-between rounded-md border p-3">
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
            </a>
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
      </div>

      <Separator />

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Video reviews</h2>
        {videoLinks.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {videoLinks.map((v) => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-md border hover:shadow-md"
              >
                {v.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- external thumbnails, no fixed domain worth configuring for a rarely-populated field
                  <img src={v.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />
                )}
                <div className="p-2">
                  <p className="line-clamp-2 text-xs font-medium">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{v.channelTitle}</p>
                </div>
              </a>
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
            </a>
          )}
          <a
            href={videoSearchLinks.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Music2 className="h-3.5 w-3.5" /> TikTok
          </a>
          <a
            href={videoSearchLinks.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Camera className="h-3.5 w-3.5" /> Instagram
          </a>
        </div>
        <p className="text-xs italic text-muted-foreground">
          These are search links, not vetted reviews — SkinWiz doesn&apos;t screen or endorse social
          content. Only Derm Score and Audience Score above reflect verified feedback.
        </p>
      </div>

      {product.splSetId && (
        <p className="text-xs text-muted-foreground">
          <a
            className="underline"
            href={`https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${product.splSetId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View full FDA label on DailyMed
          </a>
        </p>
      )}
    </div>
  );
}
