import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { FreeFromFilters } from "@/components/free-from-filters";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { browseProducts, getConcerns, getAllActives } from "@/lib/queries";
import { TRUST_TIERS } from "@/lib/trust-tiers";

export const metadata: Metadata = {
  title: "Browse all products — SkinWiz",
  description: "Browse the full SkinWiz catalog by concern, trust tier, active ingredient, or ingredient-based filters.",
};

// The general catalog browser -- unlike /concern/[slug] (one concern, top
// filter chips) or /search (requires a query), this is every product,
// every filter, all at once, with the filters in a left sidebar -- the
// conventional e-commerce-catalog layout, requested explicitly rather than
// reusing the top-chip pattern the other two pages use.
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ concern?: string; tier?: string; active?: string; free?: string; page?: string }>;
}) {
  const { concern, tier, active, free, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const freeFromIds = free ? free.split(",").filter(Boolean) : [];
  const selectedTier = TRUST_TIERS.find((t) => t.label === tier);
  const concerns = getConcerns();
  const allActives = getAllActives();

  const { rows, total, pageSize } = browseProducts(
    { concernId: concern, dataSources: selectedTier?.dataSources, activeId: active, freeFromIds },
    page,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function hrefWith(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { concern, tier, active, free, page: undefined as string | undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }

  function pageHref(p: number) {
    return hrefWith({ page: p > 1 ? String(p) : undefined });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Browse all products</h1>
        <p className="text-muted-foreground">Filter the full catalog by concern, source, active ingredient, or ingredient-based flags.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          <div>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Concern</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href={hrefWith({ concern: undefined })} className={!concern ? "font-medium" : "text-muted-foreground hover:text-foreground"}>
                  All concerns
                </Link>
              </li>
              {concerns.map((c) => (
                <li key={c.id}>
                  <Link
                    href={hrefWith({ concern: c.id })}
                    className={concern === c.id ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href={hrefWith({ tier: undefined })} className={!tier ? "font-medium" : "text-muted-foreground hover:text-foreground"}>
                  All sources
                </Link>
              </li>
              {TRUST_TIERS.map((t) => (
                <li key={t.label}>
                  <Link
                    href={hrefWith({ tier: t.label })}
                    className={tier === t.label ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                  >
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Active ingredient</h2>
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-2 text-sm">
              <li>
                <Link href={hrefWith({ active: undefined })} className={!active ? "font-medium" : "text-muted-foreground hover:text-foreground"}>
                  All actives
                </Link>
              </li>
              {allActives.map((a) => (
                <li key={a.id}>
                  <Link
                    href={hrefWith({ active: a.id })}
                    className={active === a.id ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                  >
                    {a.canonicalName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <FreeFromFilters basePath="/browse" searchParams={{ concern, tier, active, free }} selected={freeFromIds} />
        </aside>

        <div className="space-y-4">
          <RedFlagBanner />

          <p className="text-sm text-muted-foreground">{total.toLocaleString()} product{total === 1 ? "" : "s"}</p>

          {rows.length === 0 ? (
            <p className="text-muted-foreground">No products match this combination of filters.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4 text-sm">
              {page > 1 && (
                <Link className="underline" href={pageHref(page - 1)}>
                  ← Previous
                </Link>
              )}
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link className="underline" href={pageHref(page + 1)}>
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
