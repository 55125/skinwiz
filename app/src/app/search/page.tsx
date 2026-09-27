import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { searchProducts, searchActives } from "@/lib/queries";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const activeResults = query ? searchActives(query) : [];
  const productResults = query ? searchProducts(query) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <SearchBar defaultValue={query} large />
      </div>

      {!query && <p className="text-muted-foreground">Search by product name, brand, or active ingredient.</p>}

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
            Products ({productResults.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {productResults.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Looking for a full ingredient browse instead?{" "}
        <Link href="/" className="underline">
          Browse by concern
        </Link>
        .
      </p>
    </div>
  );
}
