import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { getIngredientLetters, getPopularIngredients, listIngredients } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { variantRobots } from "@/lib/seo";

// Letter pages are the crawl path into ingredient pages, so they're indexed
// under their own canonical; later pages within a letter are not.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ letter?: string; page?: string }>;
}): Promise<Metadata> {
  const { letter, page } = await searchParams;
  const oneLetter = letter && /^[a-z#]$/i.test(letter) ? letter.toUpperCase() : undefined;
  return {
    title: "Ingredients A–Z",
    description: "Every ingredient in the SkinWiz catalog, with the products that contain each one.",
    // No letter shows "A", so A shares the bare URL.
      alternates: { canonical: oneLetter && oneLetter !== "A" ? `/ingredients?letter=${encodeURIComponent(oneLetter)}` : "/ingredients" },
    robots: variantRobots({ page: page && page !== "1" ? page : undefined }),
  };
}

export const dynamic = "force-dynamic";

export default async function IngredientsIndex({
  searchParams,
}: {
  searchParams: Promise<{ letter?: string; page?: string }>;
}) {
  const { letter: letterParam, page: pageParam } = await searchParams;
  const letters = getIngredientLetters();
  const letter = letterParam && letters.includes(letterParam.toUpperCase()) ? letterParam.toUpperCase() : "A";
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const { rows, total, pageSize } = listIngredients(letter, page);
  const popular = getPopularIngredients(14);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Ingredients"
        title="Ingredients A–Z"
        description="Every ingredient that appears in two or more products, each with its own page listing the products that contain it."
      />

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Most common</h2>
        <div className="flex flex-wrap gap-2">
          {popular.map((i) => (
            <Link
              key={i.id}
              href={`/ingredient/${encodeURIComponent(i.id)}`}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-brand/40 hover:bg-brand-soft"
            >
              {i.name}
              <span className="text-xs tabular-nums text-muted-foreground">{i.productCount.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </section>

      <nav aria-label="Jump to letter" className="flex flex-wrap gap-1.5">
        {letters.map((l) => (
          <Link
            key={l}
            href={`/ingredients?letter=${encodeURIComponent(l)}`}
            aria-current={l === letter ? "true" : undefined}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm transition-colors",
              l === letter ? "border-brand bg-brand-soft font-semibold text-brand-foreground" : "hover:border-brand/40",
            )}
          >
            {l}
          </Link>
        ))}
      </nav>

      <section className="space-y-4">
        <h2 className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{total.toLocaleString()}</span> ingredients under {letter}
        </h2>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((i) => (
            <li key={i.id}>
              <Link
                href={`/ingredient/${encodeURIComponent(i.id)}`}
                className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="truncate">{i.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{i.productCount.toLocaleString()}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Pagination
          page={page}
          totalPages={totalPages}
          hrefFor={(p) => `/ingredients?letter=${encodeURIComponent(letter)}${p > 1 ? `&page=${p}` : ""}`}
        />
      </section>
    </div>
  );
}
