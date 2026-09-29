import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { ProductCard } from "@/components/product-card";
import { FreeFromFilters } from "@/components/free-from-filters";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/filter-chip";
import { PageHeader } from "@/components/page-header";
import { searchProducts, searchProductsCount, searchActives, getConcerns } from "@/lib/queries";
import { TRUST_TIERS } from "@/lib/trust-tiers";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; concern?: string; tier?: string; free?: string }>;
}) {
  const { q, concern, tier, free } = await searchParams;
  const query = (q ?? "").trim();
  const freeFromIds = free ? free.split(",").filter(Boolean) : [];
  const selectedTier = TRUST_TIERS.find((t) => t.label === tier);
  const concerns = getConcerns();

  const searchFilters = { concernId: concern, dataSources: selectedTier?.dataSources, freeFromIds };
  const activeResults = query ? searchActives(query) : [];
  const productResults = query ? searchProducts(query, searchFilters) : [];
  const productTotal = query ? searchProductsCount(query, searchFilters) : 0;

  function hrefWith(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { q, concern, tier, free, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/search?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
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
          <FreeFromFilters basePath="/search" searchParams={{ q, concern, tier, free }} selected={freeFromIds} />
        </div>
      )}

      {query && activeResults.length === 0 && productResults.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          No results for &quot;{query}&quot;.
        </div>
      )}

      {activeResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Ingredients</h2>
          <div className="flex flex-wrap gap-2">
            {activeResults.map((a) => (
              <Badge key={a.id} variant="outline" className="h-7 bg-card px-3 text-sm">
                {a.canonicalName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {productResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Products{" "}
            <span className="text-base font-normal tabular-nums text-muted-foreground">
              {productTotal.toLocaleString()}
            </span>
          </h2>
          {productTotal > productResults.length && (
            <p className="text-xs text-muted-foreground">
              Showing the first {productResults.length} — narrow with a filter above or refine your search to see
              others.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {productResults.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
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
