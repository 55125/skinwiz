import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProductGrid } from "@/components/product-grid";
import { FREE_FROM_CHECKS, ingredientFailsCheck, type FreeFromCheck } from "@/db/ingredient-flags";
import { canonicalSlug, ingredientKey, slugFor, splitIngredientList } from "@/db/ingredient-parse";
import { getIngredient, MIN_PUBLIC_PRODUCTS } from "@/lib/queries";
import { findSimilarProducts } from "@/lib/similar";
import { readAvoidIds, avoidedIngredientName } from "@/lib/avoid";
import { cn } from "@/lib/utils";

const MAX_CHARS = 6000;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ list?: string }> }): Promise<Metadata> {
  const { list } = await searchParams;
  return {
    title: "Ingredient list checker — SkinWiz",
    description:
      "Paste any product's ingredient list to check it for fungal-acne triggers, fragrance, alcohol, common contact allergens and more, and find products with a similar formula.",
    robots: list ? { index: false } : undefined,
  };
}

const GROUPS: { title: string; category: FreeFromCheck["category"] }[] = [
  { title: "Skin type & lifestyle", category: "skin" },
  { title: "Clean-beauty preferences", category: "clean" },
  { title: "Common contact-dermatitis allergens", category: "contact-allergen" },
];

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const { list: rawList } = await searchParams;
  const text = (rawList ?? "").slice(0, MAX_CHARS);
  const avoidIds = await readAvoidIds();

  const seen = new Set<string>();
  const items = splitIngredientList(text).flatMap((raw) => {
    const key = ingredientKey(raw);
    const slug = key ? canonicalSlug(slugFor(key)) : "";
    if (!slug || seen.has(slug)) return [];
    seen.add(slug);
    const known = getIngredient(slug);
    return [{ raw, slug, linkable: !!known && known.productCount >= MIN_PUBLIC_PRODUCTS }];
  });

  const enough = items.length >= 4;
  const results = FREE_FROM_CHECKS.map((check) => ({
    check,
    hits: items.filter((i) => ingredientFailsCheck(check, i.raw)).map((i) => i.raw),
  }));
  const flaggedNames = new Set(results.flatMap((r) => r.hits));
  const avoided = results.filter((r) => avoidIds.includes(r.check.id) && r.hits.length > 0);
  const similar = enough ? findSimilarProducts(items.map((i) => i.slug), { limit: 6, minScore: 0.3 }) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Tool"
        title="Ingredient list checker"
        description="Paste an ingredient list from any product — a box, a brand site or a retailer page — and see what in it trips fungal-acne, fragrance, alcohol and common-allergen checks, plus which products in our catalog have a similar formula."
      />

      <form method="GET" action="/check" className="space-y-3">
        <label htmlFor="list" className="sr-only">
          Ingredient list
        </label>
        <Textarea
          id="list"
          name="list"
          defaultValue={text}
          rows={6}
          maxLength={MAX_CHARS}
          placeholder="Aqua, Glycerin, Niacinamide, Cetearyl Alcohol, Polysorbate 20, Parfum, Phenoxyethanol…"
        />
        <div className="flex items-center gap-3">
          <Button type="submit">Check ingredients</Button>
          {text && (
            <Link href="/check" className="text-sm text-muted-foreground hover:underline">
              Clear
            </Link>
          )}
        </div>
      </form>

      {text && !enough && (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          We could only read {items.length} ingredient{items.length === 1 ? "" : "s"} from that. Paste the full list,
          separated by commas — a short fragment can&apos;t be checked reliably, since a check that finds nothing in a
          partial list says nothing about the whole product.
        </p>
      )}

      {enough && (
        <>
          {avoided.length > 0 && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/40">
              <p className="font-medium text-rose-800 dark:text-rose-300">
                Conflicts with your avoid list: {avoided.map((a) => avoidedIngredientName(a.check.id)).join(", ")}
              </p>
            </div>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              {items.length} ingredients read
            </h2>
            <ul className="flex flex-wrap gap-x-1 gap-y-1 text-sm leading-relaxed">
              {items.map((i, n) => {
                const flagged = flaggedNames.has(i.raw);
                const cls = cn(
                  "rounded-md px-1.5 py-0.5",
                  flagged ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200" : "",
                );
                return (
                  <li key={i.slug} className="inline-flex">
                    {i.linkable ? (
                      <Link
                        href={`/ingredient/${encodeURIComponent(i.slug)}`}
                        className={cn(cls, "underline decoration-border underline-offset-4 hover:decoration-brand")}
                      >
                        {i.raw}
                      </Link>
                    ) : (
                      <span className={cls}>{i.raw}</span>
                    )}
                    {n < items.length - 1 && <span aria-hidden className="text-muted-foreground">,</span>}
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">Highlighted = trips at least one check below.</p>
          </section>

          {GROUPS.map((g) => {
            const rows = results.filter((r) => r.check.category === g.category);
            return (
              <section key={g.category} className="space-y-3">
                <h2 className="text-xl font-semibold">{g.title}</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rows.map(({ check, hits }) => (
                    <div
                      key={check.id}
                      className={cn(
                        "rounded-xl border p-3.5 text-sm",
                        hits.length === 0 ? "bg-card" : "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
                      )}
                    >
                      <p className="flex items-center gap-2 font-medium">
                        {hits.length === 0 ? (
                          <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                        ) : (
                          <X className="h-4 w-4 text-amber-600" aria-hidden />
                        )}
                        {check.label}
                        <Badge variant="outline" className="ml-auto">
                          {hits.length === 0 ? "passes" : `${hits.length} found`}
                        </Badge>
                      </p>
                      {hits.length > 0 && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {hits.slice(0, 8).join(", ")}
                          {hits.length > 8 ? ` +${hits.length - 8} more` : ""}
                        </p>
                      )}
                      {check.explain && hits.length > 0 && (
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{check.explain}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {similar.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Products with a similar formula</h2>
              <ProductGrid products={similar.map((s) => s.product)} />
            </section>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Checks are substring matches on the ingredient names you pasted — a screening aid, not an allergy test,
            not medical advice and not exhaustive. Confirm against the physical label and talk to a board-certified
            dermatologist about a known allergy.
          </p>
        </>
      )}
    </div>
  );
}
