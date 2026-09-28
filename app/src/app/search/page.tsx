import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { ProductCard } from "@/components/product-card";
import { FreeFromFilters } from "@/components/free-from-filters";
import { Badge } from "@/components/ui/badge";
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
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <SearchBar defaultValue={query} large />
      </div>

      {!query && <p className="text-muted-foreground">Search by product name, brand, or active ingredient.</p>}

      {query && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Concern</span>
            <Link href={hrefWith({ concern: undefined })}>
              <Badge variant={!concern ? "default" : "outline"} className="cursor-pointer">
                All
              </Badge>
            </Link>
            {concerns.map((c) => (
              <Link key={c.id} href={hrefWith({ concern: c.id })}>
                <Badge variant={concern === c.id ? "default" : "outline"} className="cursor-pointer">
                  {c.name}
                </Badge>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</span>
            <Link href={hrefWith({ tier: undefined })}>
              <Badge variant={!tier ? "default" : "outline"} className="cursor-pointer">
                All
              </Badge>
            </Link>
            {TRUST_TIERS.map((t) => (
              <Link key={t.label} href={hrefWith({ tier: t.label })}>
                <Badge variant={tier === t.label ? "default" : "outline"} className="cursor-pointer">
                  {t.label}
                </Badge>
              </Link>
            ))}
          </div>
          <FreeFromFilters basePath="/search" searchParams={{ q, concern, tier, free }} selected={freeFromIds} />
        </div>
      )}

      {query && activeResults.length === 0 && productResults.length === 0 && (
        <p className="text-muted-foreground">No results for &quot;{query}&quot;.</p>
      )}

      {activeResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Ingredients</h2>
          <div className="flex flex-wrap gap-2">
            {activeResults.map((a) => (
              <Badge key={a.id} variant="outline" className="text-sm">
                {a.canonicalName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {productResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Products ({productTotal.toLocaleString()})
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
