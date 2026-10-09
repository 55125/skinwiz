import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProductGrid } from "@/components/product-grid";
import { IngredientLink } from "@/components/ingredient-link";
import { FREE_FROM_CHECKS, computeFreeFromFlags, ingredientFailsCheck, type FreeFromCheck } from "@/db/ingredient-flags";
import { CONTACT_ALLERGENS, allergensInIngredient, allergensInList, getAllergen, groupsContaining } from "@/db/contact-allergens";
import { avoidConflicts, type AvoidableProduct } from "@/lib/avoid-shared";
import { canonicalSlug, ingredientKey, slugFor, splitIngredientList } from "@/db/ingredient-parse";
import { getIngredient, MIN_PUBLIC_PRODUCTS } from "@/lib/queries";
import { findSimilarProductsCached } from "@/lib/similar";
import { readAvoidIds, avoidedIngredientName } from "@/lib/avoid";
import { cn } from "@/lib/utils";

const MAX_CHARS = 6000;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ list?: string }> }): Promise<Metadata> {
  const { list } = await searchParams;
  return {
    title: "Ingredient list checker",
    description:
      "Paste any product's ingredient list to check it for fungal-acne triggers, fragrance, alcohol, common contact allergens and more, and find products with a similar formula.",
    robots: list ? { index: false } : undefined,
  };
}

const GROUPS: { title: string; category: FreeFromCheck["category"] }[] = [
  { title: "Skin type & lifestyle", category: "skin" },
  { title: "Clean-beauty preferences", category: "clean" },
];

// Pasted names, each linked to its ingredient page when we have one worth
// visiting (the same rule as the highlighted list above).
function PastedNames({ items }: { items: { raw: string; slug: string; linkable: boolean }[] }) {
  return items.map((i, n) => (
    <span key={i.slug}>
      {n > 0 && ", "}
      {i.linkable ? <IngredientLink id={i.slug}>{i.raw}</IngredientLink> : i.raw}
    </span>
  ));
}

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
    hits: items.filter((i) => ingredientFailsCheck(check, i.raw)),
  }));
  // Allergens: matched per name for the "listed as" mapping, and on the
  // whole text for presence (chemical names with commas survive that way).
  const allergenHits = enough ? allergensInList(text) : [];
  const allergenRows = allergenHits.flatMap((id) => {
    const a = getAllergen(id);
    return a ? [{ allergen: a, names: items.filter((i) => allergensInIngredient(i.raw).includes(id)) }] : [];
  });
  const flaggedNames = new Set([...results.flatMap((r) => r.hits), ...allergenRows.flatMap((r) => r.names)].map((i) => i.raw));
  const found = enough ? avoidConflicts({ freeFromFlags: computeFreeFromFlags(text) ?? [], allergenHits }, avoidIds) : null;
  // Patch-test results name the mix ("Fragrance mix I"), labels name the
  // chemicals: say which mixes the allergens found here belong to.
  const mixes = new Map<string, { id: string; name: string; members: string[] }>();
  for (const { allergen } of allergenRows) {
    for (const g of groupsContaining(allergen.id)) {
      const m = mixes.get(g.id) ?? mixes.set(g.id, { id: g.id, name: g.name, members: [] }).get(g.id)!;
      m.members.push(allergen.name);
    }
  }
  // Similar formulas: only suggest products whose full ingredient list is
  // clear of the visitor's avoid list, or, with no list saved, of fragrance
  // when this list has any (the usual reason to paste a label here). A
  // fragrance-allergic person pasting a fragranced lotion was being shown
  // more fragranced lotions. Not every allergen found: phenoxyethanol or
  // tocopherol are in most formulas, so screening them leaves nothing.
  const hasFragrance = allergenHits.some((id) => getAllergen(id)?.section === "fragrance");
  const screenFor = avoidIds.length > 0 ? avoidIds : hasFragrance ? ["named-fragrance-allergens"] : [];
  const screenLabel = avoidIds.length > 0 ? "without anything on your avoid list" : "without fragrance";
  const clear = (p: AvoidableProduct) => {
    const c = avoidConflicts(p, screenFor);
    return !!c && c.conflicts.length === 0 && c.possible.length === 0;
  };
  const similarPool = enough ? findSimilarProductsCached(items.map((i) => i.slug), { limit: screenFor.length ? 60 : 6, minScore: screenFor.length ? 0.2 : 0.3 }) : [];
  const similar = screenFor.length ? similarPool.filter((s) => clear(s.product)).slice(0, 6) : similarPool;

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

      {!text && (
        <section aria-labelledby="what-we-check" className="space-y-4">
          <h2 id="what-we-check" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            What we check
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2 rounded-2xl border bg-card p-4">
              <h3 className="text-sm font-semibold">Contact-dermatitis allergens</h3>
              <p className="text-xs text-muted-foreground">{CONTACT_ALLERGENS.length} allergens and their label synonyms, including</p>
              <ul className="flex flex-wrap gap-1">
                {["Fragrance mix", "Formaldehyde releasers", "Methylisothiazolinone", "Lanolin"].map((n) => (
                  <li key={n}>
                    <Badge variant="secondary">{n}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            {GROUPS.map((g) => {
              const checks = FREE_FROM_CHECKS.filter((c) => c.category === g.category);
              return (
                <div key={g.category} className="space-y-2 rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{g.title}</h3>
                  <p className="text-xs text-muted-foreground">{checks.length} checks, including</p>
                  <ul className="flex flex-wrap gap-1">
                    {checks.slice(0, 4).map((c) => (
                      <li key={c.id}>
                        <Badge variant="secondary">{c.label}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            You&apos;ll also see which products in the catalog share the most ingredients with your list.
          </p>
        </section>
      )}

      {text && !enough && (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          We could only read {items.length} ingredient{items.length === 1 ? "" : "s"} from that. Paste the full list,
          separated by commas — a short fragment can&apos;t be checked reliably, since a check that finds nothing in a
          partial list says nothing about the whole product.
        </p>
      )}

      {enough && (
        <>
          {found && found.conflicts.length > 0 && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/40">
              <p className="font-medium text-rose-800 dark:text-rose-300">
                Conflicts with your avoid list: {found.conflicts.map(avoidedIngredientName).join(", ")}
              </p>
            </div>
          )}
          {found && found.possible.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                The undisclosed fragrance may contain {found.possible.map(avoidedIngredientName).join(", ")}, which you
                avoid.
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
                      <IngredientLink id={i.slug} className={cls}>
                        {i.raw}
                      </IngredientLink>
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
                          <PastedNames items={hits.slice(0, 8)} />
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

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Contact-dermatitis allergens</h2>
            {allergenRows.length === 0 ? (
              <p className="rounded-xl border bg-card p-3.5 text-sm">
                <Check className="mr-1.5 inline h-4 w-4 text-emerald-600" aria-hidden />
                None of the {CONTACT_ALLERGENS.length} contact allergens we track are on this list.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {allergenRows.map(({ allergen, names }) => (
                  <div key={allergen.id} className="rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 text-sm dark:border-amber-900 dark:bg-amber-950/20">
                    <p className="flex items-center gap-2 font-medium">
                      <X className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                      <Link href={`/allergens/${allergen.id}`} className="hover:underline">
                        {allergen.name}
                      </Link>
                    </p>
                    {names.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">Listed as <PastedNames items={names.slice(0, 4)} /></p>}
                    {allergen.id === "fragrance" && (
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        May contain any fragrance allergen without naming it.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {mixes.size > 0 && (
              <div className="rounded-xl border bg-card p-3.5 text-sm">
                <p className="font-medium">Patch-test mixes and allergen groups on this list</p>
                <ul className="mt-1.5 space-y-1 text-muted-foreground">
                  {[...mixes.values()].map((m) => (
                    <li key={m.id}>
                      <Link href={`/allergens/${m.id}`} className="font-medium text-foreground hover:underline">
                        {m.name}
                      </Link>
                      : {m.members.join(", ")}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-muted-foreground">Your patch-test results may use these names rather than the chemical names.</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Matched on every label name and synonym in our{" "}
              <Link href="/allergens" className="font-medium text-brand hover:underline">
                contact allergen guide
              </Link>
              .
            </p>
          </section>

          {similar.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Products with a similar formula{screenFor.length > 0 ? `, ${screenLabel}` : ""}</h2>
              {screenFor.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Only products whose full ingredient list is clear of{" "}
                  {avoidIds.length > 0 ? "your avoid list" : "fragrance allergens"}, including ones that could hide in an undisclosed
                  &ldquo;fragrance.&rdquo;
                </p>
              )}
              <ProductGrid products={similar.map((s) => s.product)} />
            </section>
          ) : (
            screenFor.length > 0 &&
            similarPool.length > 0 && (
              <p className="text-sm text-muted-foreground">
                We didn&apos;t find a similar formula {screenLabel}.{" "}
                <Link href="/avoid" className="font-medium text-brand hover:underline">
                  Set up your avoid list
                </Link>{" "}
                to filter every product page and listing.
              </p>
            )
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
