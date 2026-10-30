import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_ALLERGENS, allergenMembers, allergensInIngredient, concealableByFragrance, getAllergen, normalizeForAllergens, type ContactAllergen } from "@/db/contact-allergens";
import { getFreeFromCheck, type FreeFromCheck } from "@/db/ingredient-flags";
import { tidyIngredientName } from "@/lib/format";
import { avoidedIngredientName } from "@/lib/avoid";
import type { AvoidVerdict } from "@/lib/avoid";
import { IngredientLink } from "@/components/ingredient-link";
import { IngredientList, type IngredientListItem } from "@/components/ingredient-list";
import { cn } from "@/lib/utils";

type Ingredient = { ingredientId: string; rawName: string };
type AllergenRow = { allergen: ContactAllergen; listedAs: Ingredient[] };

// One card for "is anything in here a problem for me?": the flagged
// ingredients first, a few rows grouped by why (your avoid list, fragrance,
// other contact allergens, filters it fails), the checks it passes folded
// into one line, then the full list for reference. Red is only for the
// avoid list, so it still stands out on a fragrance-heavy product.
export function WhatsInIt({
  items,
  listTitle,
  fallbackText,
  listHint,
  avoid,
  safeSwapCount,
  allergenHits,
  ingredients,
  avoidIds,
  pregnancy,
  failedChecks,
  passedFlags,
  likes,
  dislikes,
}: {
  items: IngredientListItem[];
  listTitle: string;
  /** Shown as plain text when the list couldn't be split into ingredients. */
  fallbackText?: string | null;
  listHint?: string;
  avoid: AvoidVerdict | null;
  safeSwapCount: number;
  allergenHits: string[] | null;
  /** Every label line, for the "listed as" names. */
  ingredients: Ingredient[];
  avoidIds: string[];
  /** The pregnancy notice, when the visitor's profile has pregnancy or breastfeeding set. */
  pregnancy?: ReactNode;
  failedChecks: { check: FreeFromCheck; hits: Ingredient[] }[];
  passedFlags: string[];
  likes: string[];
  dislikes: string[];
}) {
  const avoided = new Set(avoidIds.flatMap(allergenMembers));
  const listedAs = new Map<string, Ingredient[]>();
  for (const ing of ingredients) {
    for (const id of allergensInIngredient(ing.rawName)) listedAs.set(id, [...(listedAs.get(id) ?? []), ing]);
  }
  // Allergens on the avoid list are already in the red row.
  const allergens: AllergenRow[] = (allergenHits ?? []).flatMap((id) => {
    const a = getAllergen(id);
    if (!a || avoided.has(id)) return [];
    // Only the label names that say something the allergen's own name doesn't.
    const own = normalizeForAllergens(a.name);
    return [{ allergen: a, listedAs: (listedAs.get(id) ?? []).filter((n) => !own.includes(normalizeForAllergens(n.rawName))) }];
  });
  const isFragrance = (a: ContactAllergen) => a.id === "fragrance" || concealableByFragrance(a.id);
  const fragrance = allergens.filter((r) => isFragrance(r.allergen));
  const others = allergens.filter((r) => !isFragrance(r.allergen));
  const hasBlend = fragrance.some((r) => r.allergen.id === "fragrance");
  const failed = failedChecks.filter((f) => f.hits.length > 0);

  const passes: ReactNode[] = [];
  if (avoid?.status === "clear") passes.push(avoid.checked === 1 ? "Clear of your avoid list" : `Clear of all ${avoid.checked} on your avoid list`);
  if (allergenHits && allergenHits.length === 0) passes.push(`None of the ${CONTACT_ALLERGENS.length} contact allergens we track`);
  const passedLabels = passedFlags.map((id) => getFreeFromCheck(id)?.label ?? id);

  const hasRows =
    avoid?.status === "conflicts" || avoid?.status === "possible" || fragrance.length > 0 || others.length > 0 || failed.length > 0;
  const hasList = items.length > 0 || !!fallbackText;

  return (
    <section id="whats-in-it" aria-labelledby="whats-in-it-title" className="scroll-mt-24 space-y-3 rounded-xl border bg-card p-4">
      <h2 id="whats-in-it-title" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        What&apos;s in it
      </h2>

      {pregnancy}

      {hasRows && (
        <ul className="divide-y text-sm">
          {avoid?.status === "conflicts" && (
            <Row tone="red">
              <span className="font-semibold">{avoid.conflicts.map(avoidedIngredientName).join(", ")}</span>
              <Why>
                On your avoid list, per the published ingredient list.{" "}
                {safeSwapCount > 0 && (
                  <>
                    <a href="#safe-swaps" className="font-medium text-brand hover:underline">
                      See {safeSwapCount} similar without {avoid.conflicts.length === 1 ? "it" : "them"}
                    </a>
                    {" · "}
                  </>
                )}
                <Link href="/avoid" className="font-medium text-brand hover:underline">
                  Edit your list
                </Link>
              </Why>
            </Row>
          )}
          {(avoid?.status === "conflicts" || avoid?.status === "possible") && avoid.possible.length > 0 && (
            <Row tone="amber">
              <span className="font-medium">Can&apos;t rule out {avoid.possible.map(avoidedIngredientName).join(", ")}</span>
              <Why>
                On your avoid list, and wouldn&apos;t have to be named on the label when it&apos;s part of &ldquo;fragrance&rdquo; or
                &ldquo;parfum.&rdquo;
                {avoid.status === "possible" && safeSwapCount > 0 && (
                  <>
                    {" "}
                    <a href="#safe-swaps" className="font-medium text-brand hover:underline">
                      See {safeSwapCount} similar without it
                    </a>
                  </>
                )}
              </Why>
            </Row>
          )}
          {fragrance.length > 0 && (
            <Row>
              <AllergenNames rows={fragrance} />
              <Why>
                {fragrance.length === 1 ? "A fragrance allergen" : "Fragrance allergens"}.
                {hasBlend && (
                  <>
                    {" "}
                    Fragrance or parfum is an undisclosed blend, so other{" "}
                    <Link href="/allergens#fragrance" className="underline">
                      fragrance allergens
                    </Link>{" "}
                    can&apos;t be ruled out.
                  </>
                )}
              </Why>
            </Row>
          )}
          {others.length > 0 && (
            <Row>
              <AllergenNames rows={others} />
              <Why>{fragrance.length > 0 ? "Other contact allergens" : others.length === 1 ? "A contact allergen" : "Contact allergens"}: they matter if you&apos;ve reacted to them, for example on a patch test.</Why>
            </Row>
          )}
          {failed.length > 0 && (
            <Row>
              <span className="font-medium">
                Not {failed.map((f) => f.check.label.toLowerCase()).join(", not ")}
              </span>
              <Why>
                {failed.map(({ check, hits }, fi) => (
                  <span key={check.id}>
                    {fi > 0 && " "}
                    {failed.length === 1 ? "Because of" : check.label}:{" "}
                    {hits.slice(0, 6).map((h, i) => (
                      <span key={`${h.ingredientId}-${i}`}>
                        {i > 0 && ", "}
                        <IngredientLink id={h.ingredientId}>{tidyIngredientName(h.rawName)}</IngredientLink>
                      </span>
                    ))}
                    {hits.length > 6 ? ` +${hits.length - 6} more` : ""}.
                  </span>
                ))}
              </Why>
            </Row>
          )}
        </ul>
      )}

      {avoid?.status === "unassessed" && (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t check against your avoid list: there&apos;s no full ingredient list, so it&apos;s unknown, not clear.
        </p>
      )}

      {(passes.length > 0 || passedLabels.length > 0) && (
        <details className="group/pass text-sm">
          <summary className="w-fit cursor-pointer list-none text-emerald-700 dark:text-emerald-400 [&::-webkit-details-marker]:hidden">
            ✓ {[...passes, ...passedLabels].slice(0, 3).join(" · ")}
            {passes.length + passedLabels.length > 3 && ` +${passes.length + passedLabels.length - 3} more`}
            <span aria-hidden className="ml-1 inline-block transition-transform group-open/pass:rotate-90">
              ›
            </span>
          </summary>
          <div className="mt-2 space-y-2 text-xs text-muted-foreground">
            {passes.length > 0 && <p>{passes.join(". ")}.</p>}
            {passedFlags.length > 0 && (
              <p className="flex flex-wrap items-center gap-1.5">
                <span>Matches these filters:</span>
                {passedFlags.map((id) => (
                  <Link
                    key={id}
                    href={`/guide/${id}`}
                    className="rounded-full border border-emerald-300 px-2 py-0.5 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  >
                    {getFreeFromCheck(id)?.label ?? id}
                  </Link>
                ))}
              </p>
            )}
          </div>
        </details>
      )}

      {hasList && (
        <div className={cn("space-y-1.5", (hasRows || pregnancy || passes.length > 0 || passedLabels.length > 0) && "border-t pt-3")}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{listTitle}</h3>
          {items.length > 0 ? (
            <IngredientList items={items} likes={likes} dislikes={dislikes} className="text-muted-foreground" />
          ) : (
            <p className="text-sm leading-relaxed">{fallbackText}</p>
          )}
          {listHint && items.length > 0 && <p className="text-xs text-muted-foreground">{listHint}</p>}
        </div>
      )}

      {(hasRows || allergenHits) && (
        <p className="text-xs text-muted-foreground">
          From the ingredient list, matched on label names and synonyms; not a certification.{" "}
          <Link href="/allergens" className="font-medium text-brand hover:underline">
            About contact allergens
          </Link>
          {" · "}
          <Link href="/about#how-we-check" className="font-medium text-brand hover:underline">
            How we check
          </Link>
        </p>
      )}
    </section>
  );
}

function Row({ tone, children }: { tone?: "red" | "amber"; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-x-2.5 py-2.5 first:pt-0 last:pb-0">
      <span
        aria-hidden
        className={cn(
          "mt-[0.45rem] h-2 w-2 rounded-full",
          tone === "red" ? "bg-red-600 dark:bg-red-400" : tone === "amber" ? "bg-amber-500" : "bg-muted-foreground/50",
        )}
      />
      <div className={cn("min-w-0", tone === "red" && "text-red-700 dark:text-red-400")}>{children}</div>
    </li>
  );
}

function Why({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{children}</p>;
}

// Allergen names link to their allergen page; a label spelling that doesn't
// say the same thing ("Kathon CG") follows in grey, since showing that
// mapping is the point.
function AllergenNames({ rows }: { rows: AllergenRow[] }) {
  return (
    <span className="font-medium">
      {rows.map(({ allergen, listedAs }, i) => (
        <span key={allergen.id}>
          {i > 0 && ", "}
          <Link href={`/allergens/${allergen.id}`} className="underline decoration-border underline-offset-4 hover:text-brand">
            {allergen.name}
          </Link>
          {listedAs.length > 0 && (
            <span className="font-normal text-muted-foreground">
              {" "}
              (listed as{" "}
              {listedAs.slice(0, 2).map((n, j) => (
                <span key={`${n.ingredientId}-${j}`}>
                  {j > 0 && ", "}
                  {tidyIngredientName(n.rawName)}
                </span>
              ))}
              )
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
