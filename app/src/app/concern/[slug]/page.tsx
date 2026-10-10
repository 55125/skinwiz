import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-grid";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { FilteredListing, ListingFilters } from "@/components/listing-filters";
import { ORIGIN_PARAM, parseOrigin } from "@/lib/origin-shared";
import {
  browseProducts,
  browseProductsByMatch,
  getActivesForConcern,
  getConcern,
  getProductsForConcern,
  getStrengthOptionsForActive,
  browseOriginCounts,
} from "@/lib/queries";
import { MatchSortNote, SortChips, parseListSort } from "@/components/sort-chips";
import { readAvoidIds } from "@/lib/avoid";
import { hasProfile, scoreProducts } from "@/lib/profile";
import { variantRobots, breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/site-url";
import { parseFreeParam } from "@/lib/avoid-shared";
import { AvoidSwitch } from "@/components/avoid-switch";
import { FEATURES } from "@/lib/feature-flags";
import { readProfile } from "@/lib/profile";
import { PREGNANCY_FILTER_PARAM, PREGNANCY_FILTER_VALUE, pregnancyAvoidIngredientIds } from "@/lib/pregnancy";
import { PregnancyFilter } from "@/components/pregnancy-notice";
import { escalationFor } from "@/db/escalation-guidance";
import { EscalationPanel } from "@/components/escalation-guidance";

type ConcernParams = { page?: string; active?: string; free?: string; strength?: string; pregnancy?: string; sort?: string; from?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ConcernParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const concern = getConcern(slug);
  if (!concern) return {};
  return {
    title: `${concern.name} products`,
    description: `${concern.description} Products matched by active ingredient, with User Scores as people log their results.`,
    alternates: { canonical: `/concern/${slug}` },
    robots: variantRobots(await searchParams),
  };
}

export default async function ConcernPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ConcernParams>;
}) {
  const { slug } = await params;
  const { page: pageParam, active, free, strength, pregnancy, sort: sortParam, from: fromParam } = await searchParams;
  const concern = getConcern(slug);
  if (!concern) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const freeFromIds = parseFreeParam(free);
  const activesList = getActivesForConcern(slug);
  const allStrengthOptions = active ? getStrengthOptionsForActive(slug, active) : [];
  // Labels carry one-off values (3.69%, 5.25%) that are almost always a
  // filing quirk of a single product; a chip per singleton would drown the
  // real strengths (2.5 / 5 / 10 for benzoyl peroxide). Rare values stay
  // reachable via the URL and "All strengths", just not as chips.
  const strengthOptions = allStrengthOptions.filter((o) => o.count >= 3);
  const strengthPct = strength !== undefined && allStrengthOptions.some((o) => String(o.pct) === strength) ? Number(strength) : undefined;
  // Pregnancy filter (gated): only offered once the profile says pregnant,
  // but an existing ?pregnancy=hide link keeps working while the flag is on.
  const pregnancyMode = FEATURES.PREGNANCY_MODE;
  const pregnancyHide = pregnancyMode && pregnancy === PREGNANCY_FILTER_VALUE;
  const profile = await readProfile();
  const avoidIds = await readAvoidIds();
  const origin = parseOrigin(fromParam);
  const showPregnancyFilter = pregnancyMode && (pregnancyHide || profile.pregnant);
  const canMatch = hasProfile(profile) || avoidIds.length > 0;
  const sort = parseListSort(sortParam, canMatch);
  const excludeIngredientIds = pregnancyHide ? pregnancyAvoidIngredientIds() : undefined;
  const listFilters = { concernId: slug, activeId: active, freeFromIds, strengthPct, excludeIngredientIds, concernListing: true, origin };
  const { rows, total, pageSize } =
    sort === "match"
      ? browseProductsByMatch(listFilters, page, (all) => scoreProducts(all, profile, avoidIds), JSON.stringify([listFilters, profile, avoidIds]))
      : sort === "name"
        ? browseProducts(listFilters, page, "name")
        : getProductsForConcern(slug, page, active, freeFromIds, strengthPct, excludeIngredientIds, origin);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Every filter, sort and page link keeps the other params (a new active
  // also clears ?strength, inside ListingFilters).
  const current: Record<string, string | undefined> = {
    active,
    free,
    strength: strengthPct !== undefined ? String(strengthPct) : undefined,
    [PREGNANCY_FILTER_PARAM]: pregnancyHide ? PREGNANCY_FILTER_VALUE : undefined,
    sort,
    [ORIGIN_PARAM]: origin,
  };
  const hrefWith = (overrides: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...overrides })) if (v) qs.set(k, v);
    const q = qs.toString();
    return `/concern/${slug}${q ? `?${q}` : ""}`;
  };
  const escalation = FEATURES.ESCALATION_GUIDANCE ? escalationFor(slug) : undefined;
  const originCounts = browseOriginCounts(listFilters);
  const filterCount = [active, origin, strengthPct !== undefined ? "s" : undefined, pregnancyHide ? "p" : undefined].filter(Boolean).length + freeFromIds.length;

  const filters = (
    <ListingFilters
      hrefWith={hrefWith}
      active={{
        selected: active,
        options: activesList,
        strength: active ? { selected: strengthPct, options: strengthOptions } : undefined,
      }}
      origin={{ selected: origin, counts: originCounts }}
      freeFrom={{
        basePath: `/concern/${slug}`,
        searchParams: current,
        selected: freeFromIds,
        extra: showPregnancyFilter ? (
          <PregnancyFilter href={hrefWith({ [PREGNANCY_FILTER_PARAM]: pregnancyHide ? undefined : PREGNANCY_FILTER_VALUE })} selected={pregnancyHide} />
        ) : undefined,
      }}
    />
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <JsonLd data={breadcrumbLd(siteUrl(), [["Home", "/"], [concern.name, `/concern/${slug}`]])} />
      <PageHeader eyebrow="Concern" title={concern.name} description={concern.description} />
      {slug === "dry-skin-eczema" && (
        <p className="text-sm">
          For a child?{" "}
          <Link href="/guide/kids/peds-eczema" className="font-medium text-brand hover:underline">
            Caring for your child&apos;s eczema
          </Link>{" "}
          ·{" "}
          <Link href="/guide/kids" className="font-medium text-brand hover:underline">
            All children&apos;s skin guides
          </Link>
        </p>
      )}

      {escalation ? (
        <div className="space-y-2">
          <RedFlagBanner />
          <a href="#otc-not-enough" className="inline-block text-sm font-medium text-brand hover:underline">
            When OTC isn&apos;t enough: how long to try, and when to see a dermatologist ↓
          </a>
        </div>
      ) : (
        <RedFlagBanner />
      )}

      <FilteredListing filters={filters} filterCount={filterCount}>
        <AvoidSwitch basePath={`/concern/${slug}`} searchParams={current} selected={freeFromIds} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{total.toLocaleString()}</span> product
            {total === 1 ? "" : "s"}
          </p>
          <SortChips sort={sort} canMatch={canMatch} hrefFor={(next) => hrefWith({ sort: next })} />
        </div>
        {sort === "match" && <MatchSortNote />}
        <h2 className="sr-only">Products</h2>
        <ProductGrid products={rows} columns="sm:grid-cols-2 xl:grid-cols-3" />
        <Pagination page={page} totalPages={totalPages} hrefFor={(p) => hrefWith({ page: p > 1 ? String(p) : undefined })} />
      </FilteredListing>

      {escalation && <EscalationPanel guidance={escalation} concernName={concern.name} />}
    </div>
  );
}
