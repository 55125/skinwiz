import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { ProductGrid } from "@/components/product-grid";
import { FreeFromFilters } from "@/components/free-from-filters";
import { OriginChips } from "@/components/origin-chips";
import { parseOrigin } from "@/lib/origin-shared";
import { FilterChip } from "@/components/filter-chip";
import { PageHeader } from "@/components/page-header";
import { searchOriginCounts, searchProducts, searchShelfCounts, searchActives, getConcerns } from "@/lib/queries";
import { TRUST_TIERS } from "@/lib/trust-tiers";
import type { Metadata } from "next";
import { parseFreeParam } from "@/lib/avoid-shared";
import { AvoidSwitch } from "@/components/avoid-switch";
import { SearchHints } from "@/components/search-hints";
import { parseSearch } from "@/lib/search-terms";
import { SearchBeacon } from "@/components/analytics-beacon";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const q = (await searchParams).q?.trim();
  return {
    title: q ? `“${q.slice(0, 60)}” — Search` : "Search",
    robots: { index: false },
  };
}

const SECTION_LIMIT = 12;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; concern?: string; tier?: string; free?: string; from?: string }>;
}) {
  const { q, concern, tier, free, from: fromParam } = await searchParams;
  const query = (q ?? "").trim();
  const freeFromIds = parseFreeParam(free);
  const selectedTier = TRUST_TIERS.find((t) => t.label === tier);
  const concerns = getConcerns();

  const origin = parseOrigin(fromParam);
  const searchFilters = { concernId: concern, dataSources: selectedTier?.dataSources, freeFromIds, origin };
  const activeResults = query ? searchActives(query) : [];
  // Sold in the US first; imported brands and likely-discontinued products
  // in their own sections below (lib/availability-rules.ts), each fetched
  // only when it has results.
  const shelfCounts = query ? searchShelfCounts(query, searchFilters) : { main: 0, import: 0, discontinued: 0 };
  const productResults = shelfCounts.main ? searchProducts(query, { ...searchFilters, shelf: "main" }) : [];
  const importResults = shelfCounts.import ? searchProducts(query, { ...searchFilters, shelf: "import" }, SECTION_LIMIT) : [];
  const discontinuedResults = shelfCounts.discontinued
    ? searchProducts(query, { ...searchFilters, shelf: "discontinued" }, SECTION_LIMIT)
    : [];
  const productTotal = shelfCounts.main + shelfCounts.import + shelfCounts.discontinued;
  const originCounts = query ? searchOriginCounts(query, searchFilters) : new Map();
  const hints = query ? parseSearch(query).hints : [];

  function hrefWith(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { q, concern, tier, free, from: origin, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/search?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      {query && <SearchBeacon term={query} results={activeResults.length + productTotal} />}
      <div className="space-y-5">
        <PageHeader
          eyebrow="Search"
          title={query ? `Results for “${query}”` : "Search the catalog"}
          description={query ? undefined : "Search by product name, brand, or active ingredient."}
        />
        <div className="max-w-2xl">
          <SearchBar defaultValue={query} large />
        </div>
      </div>

      {query && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 w-16 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Concern
            </span>
            <FilterChip href={hrefWith({ concern: undefined })} selected={!concern}>
              All
            </FilterChip>
            {concerns.map((c) => (
              <FilterChip key={c.id} href={hrefWith({ concern: c.id })} selected={concern === c.id}>
                {c.name}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 w-16 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Source
            </span>
            <FilterChip href={hrefWith({ tier: undefined })} selected={!tier}>
              All
            </FilterChip>
            {TRUST_TIERS.map((t) => (
              <FilterChip key={t.label} href={hrefWith({ tier: t.label })} selected={tier === t.label}>
                {t.label}
              </FilterChip>
            ))}
          </div>
          <OriginChips selected={origin} counts={originCounts} hrefFor={(next) => hrefWith({ from: next })} label="From" labelClassName="w-16" />
          <FreeFromFilters basePath="/search" searchParams={{ q, concern, tier, free, from: origin }} selected={freeFromIds} />
          <AvoidSwitch basePath="/search" searchParams={{ q, concern, tier, from: origin }} selected={freeFromIds} />
        </div>
      )}

      <SearchHints hints={hints} />

      {query && activeResults.length === 0 && productTotal === 0 && hints.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          No results for &quot;{query}&quot;.
        </div>
      )}

      {activeResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Ingredients</h2>
          <div className="flex flex-wrap gap-2">
            {activeResults.map((a) => (
              <Link
                key={a.id}
                href={`/browse?active=${encodeURIComponent(a.id)}`}
                className="inline-flex h-8 items-center rounded-full border bg-card px-3 text-sm transition-colors hover:border-brand/40 hover:bg-brand-soft"
              >
                {a.canonicalName}
              </Link>
            ))}
          </div>
        </div>
      )}

      {productResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Products{" "}
            <span className="text-base font-normal tabular-nums text-muted-foreground">
              {shelfCounts.main.toLocaleString()}
            </span>
          </h2>
          {shelfCounts.main > productResults.length && (
            <p className="text-xs text-muted-foreground">
              Showing the first {productResults.length} — narrow with a filter above or refine your search to see
              others.
            </p>
          )}
          <ProductGrid products={productResults} />
        </div>
      )}

      {importResults.length > 0 && (
        <section aria-labelledby="search-imports" className="space-y-4">
          <div className="space-y-1">
            <h2 id="search-imports" className="text-xl font-semibold">
              Imported brands{" "}
              <span className="text-base font-normal tabular-nums text-muted-foreground">
                {shelfCounts.import.toLocaleString()}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Brands from abroad that we haven&apos;t found at a US store. They&apos;re usually bought online from import
              sellers, so shipping takes longer and labels may not be in English.
              {shelfCounts.import > importResults.length && <> Pick a region under &ldquo;From&rdquo; above to see them all.</>}
            </p>
          </div>
          <ProductGrid products={importResults} />
        </section>
      )}

      {discontinuedResults.length > 0 && (
        <details className="group space-y-4 rounded-2xl border border-dashed p-4">
          <summary className="cursor-pointer list-none text-base font-semibold [&::-webkit-details-marker]:hidden">
            <span className="mr-1 inline-block transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
            Likely discontinued{" "}
            <span className="font-normal tabular-nums text-muted-foreground">{shelfCounts.discontinued.toLocaleString()}</span>
          </summary>
          <p className="text-sm text-muted-foreground">
            Products that stores no longer seem to carry, kept here for reference: their ingredient lists still help if you
            have one at home.
            {shelfCounts.discontinued > discontinuedResults.length && <> Showing the first {discontinuedResults.length}.</>}
          </p>
          <ProductGrid products={discontinuedResults} />
        </details>
      )}

      <p className="text-xs text-muted-foreground">
        Looking for a full catalog browse instead?{" "}
        <Link href="/browse" className="underline">
          Browse all products
        </Link>
        .
      </p>
    </div>
  );
}
