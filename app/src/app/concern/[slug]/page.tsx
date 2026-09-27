import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product-card";
import { RedFlagBanner } from "@/components/red-flag-banner";
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
  searchParams: Promise<{ page?: string; active?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam, active } = await searchParams;
  const concern = getConcern(slug);
  if (!concern) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const activesList = getActivesForConcern(slug);
  const { rows, total, pageSize } = getProductsForConcern(slug, page, active);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{concern.name}</h1>
        <p className="text-muted-foreground">{concern.description}</p>
      </div>

      <RedFlagBanner />

      <div className="flex flex-wrap gap-2">
        <Link href={`/concern/${slug}`}>
          <Badge variant={!active ? "default" : "outline"} className="cursor-pointer">
            All actives
          </Badge>
        </Link>
        {activesList.map((a) => (
          <Link key={a.id} href={`/concern/${slug}?active=${a.id}`}>
            <Badge variant={active === a.id ? "default" : "outline"} className="cursor-pointer">
              {a.canonicalName}
            </Badge>
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {total.toLocaleString()} product{total === 1 ? "" : "s"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 text-sm">
          {page > 1 && (
            <Link
              className="underline"
              href={`/concern/${slug}?page=${page - 1}${active ? `&active=${active}` : ""}`}
            >
              ← Previous
            </Link>
          )}
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              className="underline"
              href={`/concern/${slug}?page=${page + 1}${active ? `&active=${active}` : ""}`}
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
