import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { AlertTriangle, ChevronLeft, ExternalLink, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProductGrid } from "@/components/product-grid";
import { Pagination } from "@/components/pagination";
import { RedFlagBanner } from "@/components/red-flag-banner";
import {
  MIN_PUBLIC_PRODUCTS,
  getActive,
  getActiveChemData,
  getActiveStrengthStats,
  getEvidenceNotesForActive,
  getIngredient,
  getIngredientConcernCounts,
  getIngredientEwgSummary,
  getIngredientStats,
  getIngredientTopBrands,
  getProductsForIngredient,
} from "@/lib/queries";
import { checksFailedByIngredient } from "@/db/ingredient-flags";
import { MONOGRAPH_RANGES, formatRange } from "@/db/monograph-ranges";
import { formatPct } from "@/db/strength";
import { readAvoidIds } from "@/lib/avoid";
import { readProfile } from "@/lib/profile";
import { IngredientPreference } from "@/components/ingredient-preference";
import { pubchemLinkText } from "@/lib/pubchem";
import { canonicalSlug } from "@/db/ingredient-parse";
import { ewgHazardBadge } from "@/lib/ewg";
import { displayManufacturer } from "@/lib/format";
import { cn } from "@/lib/utils";
import { variantRobots, breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/site-url";
import { SITE_NAME } from "@/lib/brand";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ concern?: string; page?: string }>;
}): Promise<Metadata> {
  const ingredient = getIngredient(decodeURIComponent((await params).slug));
  if (!ingredient) return {};
  const n = ingredient.productCount;
  return {
    title: `${ingredient.name}: what it is and products that contain it`,
    description: `${ingredient.name} appears in ${n.toLocaleString()} product${n === 1 ? "" : "s"} in the ${SITE_NAME} catalog. See every product that contains it, how it is used, and what we know about it.`,
    // one-off entries are mostly label typos; keep them reachable but out of search results
    robots: n < MIN_PUBLIC_PRODUCTS ? { index: false } : variantRobots(await searchParams),
    alternates: { canonical: `/ingredient/${encodeURIComponent(ingredient.id)}` },
  };
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
      <dt className="mt-0.5 text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

export default async function IngredientPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ concern?: string; page?: string }>;
}) {
  const id = decodeURIComponent((await params).slug);
  const ingredient = getIngredient(id);
  if (!ingredient) {
    const canonical = canonicalSlug(id);
    if (canonical !== id) permanentRedirect(`/ingredient/${encodeURIComponent(canonical)}`);
    notFound();
  }
  const { concern, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const active = getActive(id);
  const chem = active ? getActiveChemData(id) : undefined;
  const notes = active ? getEvidenceNotesForActive(id) : [];
  const monograph = MONOGRAPH_RANGES[id];
  const strength = active ? getActiveStrengthStats(id) : null;

  const stats = getIngredientStats(id);
  const concernCounts = getIngredientConcernCounts(id);
  const selectedConcern = concernCounts.find((c) => c.concernId === concern);
  const { rows, total, pageSize } = getProductsForIngredient(id, page, selectedConcern?.concernId);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const brands = getIngredientTopBrands(id);
  const ewg = getIngredientEwgSummary(id);

  const failedChecks = checksFailedByIngredient([ingredient.name, ...ingredient.aliases]);
  const avoidIds = await readAvoidIds();
  const onAvoidList = failedChecks.filter((c) => avoidIds.includes(c.id));
  const profile = await readProfile();
  const preference = profile.likes.includes(id) ? "like" : profile.dislikes.includes(id) ? "dislike" : null;

  const inciShare = stats.inciLists >= 10 ? Math.round((stats.topFive / stats.inciLists) * 100) : null;
  const avgPos = stats.inciLists >= 10 && stats.avgPosition ? Math.round(stats.avgPosition) : null;

  function hrefWith(overrides: { concern?: string; page?: number }) {
    const params = new URLSearchParams();
    const c = "concern" in overrides ? overrides.concern : selectedConcern?.concernId;
    if (c) params.set("concern", c);
    if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));
    const qs = params.toString();
    return `/ingredient/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:py-10">
      <JsonLd
        data={breadcrumbLd(siteUrl(), [
          ["Home", "/"],
          ["Ingredients", "/ingredients"],
          [ingredient.name, `/ingredient/${encodeURIComponent(ingredient.id)}`],
        ])}
      />
      <Link href="/ingredients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        All ingredients
      </Link>

      <header className="space-y-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
          <FlaskConical className="h-3.5 w-3.5" />
          {active ? "Tracked active ingredient" : "Ingredient"}
        </p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">{ingredient.name}</h1>
        {ingredient.aliases.length > 0 && (
          <p className="max-w-3xl text-muted-foreground">
            <span className="font-medium text-foreground">Also listed as:</span> {ingredient.aliases.join(" · ")}
          </p>
        )}
        <IngredientPreference id={id} initial={preference} />
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={stats.products.toLocaleString()} label={stats.products === 1 ? "product contains it" : "products contain it"} />
        <Stat value={stats.brands.toLocaleString()} label={stats.brands === 1 ? "brand" : "brands"} />
        {stats.asActive > 0 ? (
          <Stat value={stats.asActive.toLocaleString()} label="list it as an active" />
        ) : (
          <Stat value="—" label="list it as an active" />
        )}
        {inciShare !== null ? (
          <Stat value={`${inciShare}%`} label={`of ${stats.inciLists.toLocaleString()} full ingredient lists put it in the first 5`} />
        ) : (
          <Stat value="—" label="position data needs 10+ full ingredient lists" />
        )}
      </dl>

      {onAvoidList.length > 0 && (
        <Alert className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle>On your avoid list</AlertTitle>
          <AlertDescription>
            Products containing {ingredient.name} count as not {onAvoidList.map((c) => c.label.toLowerCase()).join(" or ")}.{" "}
            <Link href="/avoid" className="underline">
              Edit your list
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">
          {active ? (
            <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold">What we know about {active.canonicalName}</h2>
              <div className="flex flex-wrap gap-2">
                {active.categories.map((cat) => {
                  const match = notes.find((n) => n.concernId.includes(cat) || n.concernName.toLowerCase().includes(cat.split("-")[0]));
                  return match ? (
                    <Link key={cat} href={`/concern/${match.concernId}`}>
                      <Badge variant="secondary">{match.concernName}</Badge>
                    </Link>
                  ) : (
                    <Badge key={cat} variant="secondary">
                      {cat}
                    </Badge>
                  );
                })}
              </div>
              {notes.length > 0 && (
                <div className="space-y-4">
                  {[...new Map(notes.map((n) => [n.summary, n])).values()].map((note) => (
                    <div key={note.summary} className="space-y-1.5">
                      <p className="text-sm leading-relaxed">{note.summary}</p>
                      {note.typicalConcentrationText && (
                        <p className="text-xs text-muted-foreground">{note.typicalConcentrationText}</p>
                      )}
                      {note.needsClinicianReview && (
                        <p className="text-xs italic text-amber-700 dark:text-amber-400">
                          Clinical evidence grade: pending board-certified dermatologist review.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {monograph && (
                <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm">
                  <span className="font-medium">FDA OTC monograph range:</span> {formatRange(monograph)}{" "}
                  <span className="text-muted-foreground">({monograph.cfr}) — what the FDA permits, not a rating.</span>
                </p>
              )}
              {strength && strength.n > 0 && strength.min !== null && strength.max !== null && (
                <p className="text-sm">
                  <span className="font-medium">Strengths on FDA labels in our catalog:</span>{" "}
                  {strength.min === strength.max ? formatPct(strength.min) : `${formatPct(strength.min)} to ${formatPct(strength.max)}`}{" "}
                  <span className="text-muted-foreground">across {strength.n.toLocaleString()} products.</span>
                </p>
              )}
              {active.synonyms.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Names we match:</span> {active.synonyms.join(", ")}
                </p>
              )}
              {chem && (
                <p className="text-xs">
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${chem.pubchemCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                  >
                    {pubchemLinkText(id, chem.molecularFormula)}
                    <ExternalLink className="h-3 w-3" />
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </p>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground sm:p-6">
              {SITE_NAME} doesn&apos;t track {ingredient.name} as an active, so there&apos;s no evidence summary for it here —
              this page shows exactly where it appears in the catalog. Names are grouped from the published
              ingredient lists, so a misspelling on one label can appear as its own entry.
            </section>
          )}

          {failedChecks.length > 0 && (
            <section className="rounded-2xl border bg-card p-5 sm:p-6">
              <h2 className="mb-2 text-lg font-semibold">Ingredient-based filters it affects</h2>
              <div className="flex flex-wrap gap-1.5">
                {failedChecks.map((c) => (
                  <Badge key={c.id} variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-400">
                    Not {c.label.toLowerCase()}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                A product listing {ingredient.name} can&apos;t carry these badges. Computed from published ingredient
                lists, not a certification, and not exhaustive.
              </p>
              <p className="mt-3 text-sm">
                Avoiding it? Browse{" "}
                {failedChecks.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && (i === failedChecks.length - 1 ? " or " : ", ")}
                    <Link href={`/guide/${c.id}`} className="font-medium text-brand hover:underline">
                      {c.label.toLowerCase()}
                    </Link>
                  </span>
                ))}{" "}
                products.
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {ewg.n >= 3 && ewg.avg !== null && (
            <div className="rounded-2xl border bg-card p-4 text-sm">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                EWG Skin Deep, for products with it
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(ewgHazardBadge(Math.round(ewg.avg)).className)}>
                  {ewg.avg.toFixed(1)} avg
                </Badge>
                <span className="text-muted-foreground">
                  {ewg.n} scored products, {ewg.min}–{ewg.max}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                EWG scores whole formulas, not single ingredients — this is an average of theirs, not a score for
                {" "}{ingredient.name}.
              </p>
            </div>
          )}
          {brands.length > 0 && (
            <div className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Most-used by</h2>
              <ul className="space-y-1.5 text-sm">
                {brands.map((b) => (
                  <li key={b.manufacturer} className="flex items-center justify-between gap-3">
                    <Link href={`/search?q=${encodeURIComponent(b.manufacturer)}`} rel="nofollow" className="truncate hover:text-brand">
                      {displayManufacturer(b.manufacturer)}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{b.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {avgPos !== null && (
            <p className="px-1 text-xs text-muted-foreground">
              Where listed in full cosmetic ingredient lists it averages position {avgPos}. Lists run roughly from
              highest to lowest concentration, so earlier usually means more.
            </p>
          )}
        </aside>
      </div>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold">
            Products containing {ingredient.name}
            <span className="ml-2 text-base font-normal tabular-nums text-muted-foreground">{total.toLocaleString()}</span>
          </h2>
        </div>

        {concernCounts.length > 1 && (
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={hrefWith({ concern: undefined })}
              aria-current={!selectedConcern ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 transition-colors",
                !selectedConcern ? "border-brand bg-brand-soft font-medium text-brand-foreground" : "hover:border-brand/40",
              )}
            >
              All ({stats.products.toLocaleString()})
            </Link>
            {concernCounts.map((c) => (
              <Link
                key={c.concernId}
                href={hrefWith({ concern: c.concernId })}
                aria-current={selectedConcern?.concernId === c.concernId ? "true" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 transition-colors",
                  selectedConcern?.concernId === c.concernId
                    ? "border-brand bg-brand-soft font-medium text-brand-foreground"
                    : "hover:border-brand/40",
                )}
              >
                {c.name} ({c.count.toLocaleString()})
              </Link>
            ))}
          </div>
        )}

        <RedFlagBanner />
        <ProductGrid products={rows.map((r) => r.product)} />
        <Pagination page={page} totalPages={totalPages} hrefFor={(p) => hrefWith({ page: p })} />
      </section>
    </div>
  );
}
