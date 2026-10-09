import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { getIngredientCounts, getIngredientLetters, getPopularIngredients, listIngredients } from "@/lib/queries";
import { ACTIVE_DEFINITIONS, CONCERN_DEFINITIONS } from "@/db/actives";
import { cn } from "@/lib/utils";
import { variantRobots } from "@/lib/seo";
import { SITE_NAME } from "@/lib/brand";

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
    description: `Every ingredient in the ${SITE_NAME} catalog, with the products that contain each one.`,
    // No letter shows "A", so A shares the bare URL.
      alternates: { canonical: oneLetter && oneLetter !== "A" ? `/ingredients?letter=${encodeURIComponent(oneLetter)}` : "/ingredients" },
    robots: variantRobots({ page: page && page !== "1" ? page : undefined }),
  };
}

export const dynamic = "force-dynamic";

// The tracked actives under each concern, in the header's concern order. An
// active treating two concerns (salicylic acid) shows under both.
function activesByConcern(counts: Map<string, number>) {
  return CONCERN_DEFINITIONS.map((c) => ({
    ...c,
    actives: ACTIVE_DEFINITIONS.filter((a) => a.categories.includes(c.niche))
      .map((a) => ({ id: a.id, name: a.canonicalName, count: counts.get(a.id) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((c) => c.actives.length > 0);
}

const chip = "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm";
const chipLink = cn(chip, "transition-colors hover:border-brand/40 hover:bg-brand-soft");

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
  const concerns = activesByConcern(getIngredientCounts(ACTIVE_DEFINITIONS.map((a) => a.id)));
  // Letter and page links land on the A–Z list, below the actives.
  const letterHref = (l: string, p = 1) => `/ingredients?letter=${encodeURIComponent(l)}${p > 1 ? `&page=${p}` : ""}#a-z`;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <PageHeader
        eyebrow="Ingredients"
        title="Ingredient library"
        description="The active ingredients we track, grouped by what they treat, then every ingredient in the catalog from A to Z. Each one has a page listing the products that contain it."
      />

      <section aria-labelledby="actives-heading" className="space-y-4">
        <h2 id="actives-heading" className="text-xl font-semibold sm:text-2xl">
          Active ingredients by concern
        </h2>
        <div className="gap-4 md:columns-2">
          {concerns.map((c) => (
            <div key={c.id} className="mb-4 break-inside-avoid space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
              <h3 className="font-semibold">
                <Link href={`/concern/${c.id}`} className="hover:text-brand hover:underline">
                  {c.name}
                </Link>
              </h3>
              <ul className="flex flex-wrap gap-2">
                {c.actives.map((a) => (
                  <li key={a.id}>
                    {a.count !== undefined ? (
                      <Link href={`/ingredient/${encodeURIComponent(a.id)}`} className={chipLink}>
                        {a.name}
                        <span className="text-xs tabular-nums text-muted-foreground">{a.count.toLocaleString()}</span>
                      </Link>
                    ) : (
                      // Tracked, but no product in the catalog lists it yet.
                      <span className={cn(chip, "border-dashed text-muted-foreground")}>{a.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="a-z" aria-labelledby="a-z-heading" className="scroll-mt-20 space-y-4">
        <div className="space-y-1">
          <h2 id="a-z-heading" className="text-xl font-semibold sm:text-2xl">
            All ingredients A–Z
          </h2>
          <p className="text-sm text-muted-foreground">Every ingredient that appears in two or more products.</p>
        </div>

        <nav aria-label="Jump to letter" className="flex flex-wrap gap-1.5">
          {letters.map((l) => (
            <Link
              key={l}
              href={letterHref(l)}
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

        <h3 className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{total.toLocaleString()}</span> ingredients under {letter}
        </h3>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
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
        <Pagination page={page} totalPages={totalPages} hrefFor={(p) => letterHref(letter, p)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Most common in the catalog</h2>
        <div className="flex flex-wrap gap-2">
          {popular.map((i) => (
            <Link key={i.id} href={`/ingredient/${encodeURIComponent(i.id)}`} className={chipLink}>
              {i.name}
              <span className="text-xs tabular-nums text-muted-foreground">{i.productCount.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
