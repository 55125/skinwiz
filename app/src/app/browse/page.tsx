import type { Metadata } from "next";
import { ProductGrid } from "@/components/product-grid";
import { FilteredListing, ListingFilters } from "@/components/listing-filters";
import { parseOrigin } from "@/lib/origin-shared";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { browseOriginCounts, browseProducts, browseProductsByMatch, getConcerns, getAllActives } from "@/lib/queries";
import { hasProfile, readProfile, scoreProducts } from "@/lib/profile";
import { readAvoidIds } from "@/lib/avoid";
import { TRUST_TIERS } from "@/lib/trust-tiers";
import { variantRobots } from "@/lib/seo";
import { SITE_NAME } from "@/lib/brand";
import { parseFreeParam } from "@/lib/avoid-shared";
import { AvoidSwitch } from "@/components/avoid-switch";
import { FEATURES } from "@/lib/feature-flags";
import { PREGNANCY_FILTER_VALUE, pregnancyAvoidIngredientIds } from "@/lib/pregnancy";
import { PregnancyFilter } from "@/components/pregnancy-notice";
import { MatchSortNote, SortChips, parseListSort } from "@/components/sort-chips";

type BrowseParams = { concern?: string; tier?: string; active?: string; free?: string; hsa?: string; sort?: string; page?: string; pregnancy?: string; from?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<BrowseParams> }): Promise<Metadata> {
  return {
    title: "Browse all products",
    description: `Browse the full ${SITE_NAME} catalog by concern, trust tier, active ingredient, or ingredient-based filters.`,
    alternates: { canonical: "/browse" },
    robots: variantRobots(await searchParams),
  };
}

// The general catalog browser -- unlike /concern/[slug] (one concern) or
// /search (requires a query), this is every product with every filter.
// The filters are the shared listing panel (components/listing-filters.tsx).
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<BrowseParams>;
}) {
  const { concern, tier, active, free, hsa: hsaParam, sort: sortParam, page: pageParam, pregnancy: pregnancyParam, from: fromParam } = await searchParams;
  const hsa = hsaParam === "1" ? "1" : undefined;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const freeFromIds = parseFreeParam(free);
  const selectedTier = TRUST_TIERS.find((t) => t.label === tier);
  const concerns = getConcerns();
  const allActives = getAllActives();

  const profile = await readProfile();
  const avoidIds = await readAvoidIds();
  const origin = parseOrigin(fromParam);
  const canMatch = hasProfile(profile) || avoidIds.length > 0;
  const sort = parseListSort(sortParam, canMatch);
  // Gated pregnancy filter: offered once the profile says pregnant; a
  // ?pregnancy=hide link keeps working while the flag is on.
  const pregnancy = FEATURES.PREGNANCY_MODE && pregnancyParam === PREGNANCY_FILTER_VALUE ? PREGNANCY_FILTER_VALUE : undefined;
  const showPregnancyFilter = FEATURES.PREGNANCY_MODE && (!!pregnancy || profile.pregnant);
  const queryFilters = {
    concernId: concern,
    dataSources: selectedTier?.dataSources,
    activeId: active,
    freeFromIds,
    hsaOnly: !!hsa,
    excludeIngredientIds: pregnancy ? pregnancyAvoidIngredientIds() : undefined,
    origin,
  };

  const { rows, total, pageSize } =
    sort === "match"
      ? browseProductsByMatch(queryFilters, page, (all) => scoreProducts(all, profile, avoidIds), JSON.stringify([queryFilters, profile, avoidIds]))
      : browseProducts(queryFilters, page, sort);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const originCounts = browseOriginCounts(queryFilters);
  const activeFilterCount = [concern, selectedTier, active, hsa, pregnancy, origin].filter(Boolean).length + freeFromIds.length;

  function hrefWith(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { concern, tier, active, free, hsa, sort, pregnancy, from: origin, page: undefined as string | undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }

  function pageHref(p: number) {
    return hrefWith({ page: p > 1 ? String(p) : undefined });
  }

  const filters = (
    <ListingFilters
      hrefWith={hrefWith}
      concern={{ selected: concern, options: concerns }}
      active={{ selected: active, options: allActives }}
      origin={{ selected: origin, counts: originCounts }}
      hsa={{ selected: !!hsa }}
      freeFrom={{
        basePath: "/browse",
        searchParams: { concern, tier, active, free, hsa, sort, pregnancy, from: origin },
        selected: freeFromIds,
        extra: showPregnancyFilter ? (
          <PregnancyFilter href={hrefWith({ pregnancy: pregnancy ? undefined : PREGNANCY_FILTER_VALUE })} selected={!!pregnancy} />
        ) : undefined,
      }}
      source={{ selected: tier }}
    />
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Catalog"
        title="Browse all products"
        description="Filter the full catalog by concern, source, active ingredient, or ingredient-based flags."
      />

      <FilteredListing filters={filters} filterCount={activeFilterCount}>
        <RedFlagBanner />

        <AvoidSwitch basePath="/browse" searchParams={{ concern, tier, active, free, hsa, sort, pregnancy, from: origin }} selected={freeFromIds} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{total.toLocaleString()}</span> product
            {total === 1 ? "" : "s"}
          </p>
          <SortChips sort={sort} canMatch={canMatch} hrefFor={(id) => hrefWith({ sort: id })} />
        </div>
        {sort === "match" && <MatchSortNote />}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            No products match this combination of filters.
          </div>
        ) : (
          <>
            <h2 className="sr-only">Products</h2>
            <ProductGrid products={rows} columns="sm:grid-cols-2 xl:grid-cols-3" />
          </>
        )}

        <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
      </FilteredListing>
    </div>
  );
}
