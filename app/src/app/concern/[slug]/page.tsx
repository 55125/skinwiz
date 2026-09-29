import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-grid";
import { FilterChip } from "@/components/filter-chip";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RedFlagBanner } from "@/components/red-flag-banner";
import { FreeFromFilters } from "@/components/free-from-filters";
import { getConcern, getActivesForConcern, getProductsForConcern } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const concern = getConcern(slug);
  if (!concern) return {};
  return {
    title: `${concern.name} — SkinWiz`,
    description: `${concern.description} Derm Score and Audience Score for every product.`,
  };
}

export default async function ConcernPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; active?: string; free?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam, active, free } = await searchParams;
  const concern = getConcern(slug);
  if (!concern) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const freeFromIds = free ? free.split(",").filter(Boolean) : [];
  const activesList = getActivesForConcern(slug);
  const { rows, total, pageSize } = getProductsForConcern(slug, page, active, freeFromIds);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageLinkSuffix = `${active ? `&active=${active}` : ""}${free ? `&free=${free}` : ""}`;

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
