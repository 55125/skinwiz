import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Minus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComparePicker } from "@/components/compare-picker";
import { DualScoreBadges } from "@/components/score-badge";
import { Badge } from "@/components/ui/badge";
import { FREE_FROM_CHECKS } from "@/db/ingredient-flags";
import { getAllergen } from "@/db/contact-allergens";
import { getProduct, getIngredientsForProduct, getEwgScoreForProduct } from "@/lib/queries";
import { getScoresForProducts } from "@/lib/scoring";
import { ewgHazardBadge } from "@/lib/ewg";
import { dataSourceBadge } from "@/lib/data-source";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Compare products",
  description: "Put two products side by side: ingredients they share, what's unique to each, and which ingredient-based filters each one passes.",
  robots: { index: false },
};

type Search = { a?: string; b?: string };

function load(id: string | undefined) {
  if (!id) return null;
  const product = getProduct(id);
  if (!product) return null;
  const ingredients = getIngredientsForProduct(product.id).filter((r) => r.position > 0);
  const scores = getScoresForProducts([{ productId: product.id, concernId: product.concernId }]).get(product.id)!;
  return { product, ingredients, scores, ewg: getEwgScoreForProduct(product.id) };
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<Search> }) {
  const { a: aId, b: bId } = await searchParams;
  const A = load(aId);
  const B = load(bId);
  const pick = (x: ReturnType<typeof load>) =>
    x ? { id: x.product.id, brandName: x.product.brandName, manufacturer: x.product.manufacturer } : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Tool"
        title="Compare products"
        description="Two products side by side: what they share, what's unique to each, and which ingredient-based filters each passes."
      />
      <ComparePicker key={`${aId}|${bId}`} initialA={pick(A)} initialB={pick(B)} />

      {A && B && <Comparison A={A} B={B} />}
      {(aId || bId) && (!A || !B) && (
        <p className="text-sm text-muted-foreground">Pick two products above to compare them.</p>
      )}
    </div>
  );
}

type Loaded = NonNullable<ReturnType<typeof load>>;

function Comparison({ A, B }: { A: Loaded; B: Loaded }) {
  const aIds = new Set(A.ingredients.map((i) => i.ingredientId));
  const bIds = new Set(B.ingredients.map((i) => i.ingredientId));
  const shared = A.ingredients.filter((i) => bIds.has(i.ingredientId));
  const onlyA = A.ingredients.filter((i) => !bIds.has(i.ingredientId));
  const allergenIds = [...new Set([...(A.product.allergenHits ?? []), ...(B.product.allergenHits ?? [])])];
  const onlyB = B.ingredients.filter((i) => !aIds.has(i.ingredientId));
  const canCompareLists = A.ingredients.length >= 4 && B.ingredients.length >= 4;
  const union = new Set([...aIds, ...bIds]).size;

  const cols = [A, B];
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        {cols.map((c) => {
          const src = dataSourceBadge(c.product.dataSource);
          const ewg = c.ewg ? ewgHazardBadge(c.ewg.ewgScore) : null;
          return (
            <div key={c.product.id} className="space-y-3 rounded-2xl border bg-card p-5">
              <div>
                <Link href={`/product/${encodeURIComponent(c.product.id)}`} className="text-lg font-semibold hover:underline">
                  {c.product.brandName}
                </Link>
                {c.product.manufacturer && <p className="text-sm text-muted-foreground">{c.product.manufacturer}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DualScoreBadges dermScore={c.scores.derm} audienceScore={c.scores.audience} compact />
                {src && <Badge variant="outline" className={src.className}>{src.label}</Badge>}
                {ewg && c.ewg && (
                  <Badge variant="outline" className={ewg.className}>{ewg.label}</Badge>
                )}
              </div>
              {c.product.activeIngredientText && (
                <p className="line-clamp-3 text-xs text-muted-foreground">{c.product.activeIngredientText}</p>
              )}
            </div>
          );
        })}
      </div>

      {canCompareLists ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Ingredient overlap: {shared.length} shared of {union} distinct
          </h2>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">In both</h3>
            <Chips items={shared} tone="both" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Only in {A.product.brandName}
              </h3>
              <Chips items={onlyA} tone="only" />
            </div>
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Only in {B.product.brandName}
              </h3>
              <Chips items={onlyB} tone="only" />
            </div>
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          One of these has no full ingredient list on file (common for FDA-only drug listings), so an ingredient-level
          comparison would be misleading. Their active ingredients are shown above.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Ingredient-based filters</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Check</th>
                <th className="px-3 py-2 font-semibold">{A.product.brandName}</th>
                <th className="px-3 py-2 font-semibold">{B.product.brandName}</th>
              </tr>
            </thead>
            <tbody>
              {FREE_FROM_CHECKS.map((c) => {
                const cell = (p: Loaded["product"]) =>
                  !p.freeFromFlags ? (
                    <Minus className="h-4 w-4 text-muted-foreground" aria-label="not assessed" />
                  ) : p.freeFromFlags.includes(c.id) ? (
                    <Check className="h-4 w-4 text-emerald-600" aria-label="passes" />
                  ) : (
                    <X className="h-4 w-4 text-amber-600" aria-label="fails" />
                  );
                const differs =
                  !!A.product.freeFromFlags &&
                  !!B.product.freeFromFlags &&
                  A.product.freeFromFlags.includes(c.id) !== B.product.freeFromFlags.includes(c.id);
                return (
                  <tr key={c.id} className={cn("border-t", differs && "bg-brand-soft/40")}>
                    <td className="px-3 py-2">{c.label}</td>
                    <td className="px-3 py-2">{cell(A.product)}</td>
                    <td className="px-3 py-2">{cell(B.product)}</td>
                  </tr>
                );
              })}
              {allergenIds.length > 0 && (
                <tr className="border-t bg-muted/30">
                  <td colSpan={3} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact allergens either one lists
                  </td>
                </tr>
              )}
              {allergenIds.map((id) => {
                const cell = (p: Loaded["product"]) =>
                  !p.allergenHits ? (
                    <Minus className="h-4 w-4 text-muted-foreground" aria-label="not assessed" />
                  ) : p.allergenHits.includes(id) ? (
                    <X className="h-4 w-4 text-amber-600" aria-label="contains" />
                  ) : (
                    <Check className="h-4 w-4 text-emerald-600" aria-label="free of it" />
                  );
                return (
                  <tr
                    key={id}
                    className={cn(
                      "border-t",
                      !!A.product.allergenHits && !!B.product.allergenHits && A.product.allergenHits.includes(id) !== B.product.allergenHits.includes(id) && "bg-brand-soft/40",
                    )}
                  >
                    <td className="px-3 py-2">
                      <Link href={`/allergens/${id}`} className="hover:underline">
                        No {getAllergen(id)?.name ?? id}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{cell(A.product)}</td>
                    <td className="px-3 py-2">{cell(B.product)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Highlighted rows are where the two differ. A dash means no full ingredient list on file, not &ldquo;clean.&rdquo;
        </p>
      </section>
    </div>
  );
}

function Chips({ items, tone }: { items: { ingredientId: string; rawName: string }[]; tone: "both" | "only" }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">None</p>;
  return (
    <ul className="flex flex-wrap gap-1 text-sm">
      {items.map((i) => (
        <li key={i.ingredientId}>
          <Link
            href={`/ingredient/${encodeURIComponent(i.ingredientId)}`}
            className={cn(
              "rounded-md px-1.5 py-0.5 hover:underline",
              tone === "both" ? "bg-muted" : "bg-brand-soft text-brand-foreground",
            )}
          >
            {i.rawName}
          </Link>
        </li>
      ))}
    </ul>
  );
}
