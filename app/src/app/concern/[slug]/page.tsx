import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-grid";
import { FilterChip } from "@/components/filter-chip";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { FreeFromFilters } from "@/components/free-from-filters";
import { getConcern, getActivesForConcern, getProductsForConcern, getStrengthOptionsForActive } from "@/lib/queries";
import { formatPct } from "@/db/strength";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const concern = getConcern(slug);
  if (!concern) return {};
  return {
    title: `${concern.name} — SkinWiz`,
    description: `${concern.description} Derm Score and User Score for every product.`,
  };
}

export default async function ConcernPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; active?: string; free?: string; strength?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam, active, free, strength } = await searchParams;
  const concern = getConcern(slug);
  if (!concern) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const freeFromIds = free ? free.split(",").filter(Boolean) : [];
  const activesList = getActivesForConcern(slug);
  const allStrengthOptions = active ? getStrengthOptionsForActive(slug, active) : [];
  // Labels carry one-off values (3.69%, 5.25%) that are almost always a
  // filing quirk of a single product; a chip per singleton would drown the
  // real strengths (2.5 / 5 / 10 for benzoyl peroxide). Rare values stay
  // reachable via the URL and "All strengths", just not as chips.
  const strengthOptions = allStrengthOptions.filter((o) => o.count >= 3);
  const strengthPct = strength !== undefined && allStrengthOptions.some((o) => String(o.pct) === strength) ? Number(strength) : undefined;
  const { rows, total, pageSize } = getProductsForConcern(slug, page, active, freeFromIds, strengthPct);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageLinkSuffix = `${active ? `&active=${active}` : ""}${free ? `&free=${free}` : ""}${strengthPct !== undefined ? `&strength=${strengthPct}` : ""}`;
  const strengthHref = (pct?: number) =>
    `/concern/${slug}?active=${active}${free ? `&free=${free}` : ""}${pct !== undefined ? `&strength=${pct}` : ""}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <PageHeader eyebrow="Concern" title={concern.name} description={concern.description} />

      <RedFlagBanner />

      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active ingredient</p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip href={`/concern/${slug}${free ? `?free=${free}` : ""}`} selected={!active}>
            All actives
          </FilterChip>
          {activesList.map((a) => (
            <FilterChip
              key={a.id}
              href={`/concern/${slug}?active=${a.id}${free ? `&free=${free}` : ""}`}
              selected={active === a.id}
            >
              {a.canonicalName}
            </FilterChip>
          ))}
        </div>
      </div>

      {active && strengthOptions.length > 1 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Strength <span className="font-normal normal-case tracking-normal">(from the FDA label)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip href={strengthHref()} selected={strengthPct === undefined}>
              All strengths
            </FilterChip>
            {strengthOptions.map((o) => (
              <FilterChip key={o.pct} href={strengthHref(o.pct)} selected={strengthPct === o.pct}>
                {formatPct(o.pct)} <span className="ml-1 opacity-70">{o.count}</span>
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      <FreeFromFilters basePath={`/concern/${slug}`} searchParams={{ active, free }} selected={freeFromIds} />

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{total.toLocaleString()}</span> product
          {total === 1 ? "" : "s"}
        </p>
        <h2 className="sr-only">Products</h2>
        <ProductGrid products={rows} />
        <Pagination
          page={page}
          totalPages={totalPages}
          hrefFor={(p) => `/concern/${slug}?page=${p}${pageLinkSuffix}`}
        />
      </div>
    </div>
  );
}
