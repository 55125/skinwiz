import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CONTACT_ALLERGENS, allergenMembers, allergensInIngredient, getAllergen, normalizeForAllergens } from "@/db/contact-allergens";
import { tidyIngredientName } from "@/lib/format";
import { cn } from "@/lib/utils";

// The contact allergens a product's ingredient list contains, each with the
// label name(s) that matched -- the label rarely uses the patch-test name
// ("Kathon CG" is MCI/MI), so showing the mapping is the point.
export function AllergenFindings({
  hits,
  ingredientNames,
  avoidIds,
}: {
  hits: string[];
  ingredientNames: string[];
  avoidIds: string[];
}) {
  const avoided = new Set(avoidIds.flatMap(allergenMembers));
  const listedAs = new Map<string, string[]>();
  for (const raw of ingredientNames) {
    for (const id of allergensInIngredient(raw)) listedAs.set(id, [...(listedAs.get(id) ?? []), raw]);
  }
  const rows = hits.flatMap((id) => {
    const a = getAllergen(id);
    if (!a) return [];
    // Only the label names that say something the allergen's own name doesn't.
    const own = normalizeForAllergens(a.name);
    const names = (listedAs.get(id) ?? []).filter((n) => !own.includes(normalizeForAllergens(n))).map(tidyIngredientName);
    return [{ allergen: a, names, onList: avoided.has(id) }];
  });
  rows.sort((x, y) => Number(y.onList) - Number(x.onList));

  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact allergens</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None of the {CONTACT_ALLERGENS.length} contact allergens we track are on this ingredient list.
        </p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {rows.map(({ allergen, names, onList }) => (
            <li
              key={allergen.id}
              className={cn(
                "rounded-lg px-2.5 py-1.5",
                onList ? "bg-red-50 dark:bg-red-950/40" : "bg-muted/50",
              )}
            >
              <Link href={`/allergens/${allergen.id}`} className="font-medium hover:underline">
                {allergen.name}
              </Link>
              {onList && (
                <Badge variant="outline" className="ml-2 border-red-300 text-red-700 dark:border-red-900 dark:text-red-400">
                  on your avoid list
                </Badge>
              )}
              {names.length > 0 && (
                <span className="text-xs text-muted-foreground"> — listed as {names.slice(0, 3).join(", ")}</span>
              )}
              {allergen.id === "fragrance" && (
                <p className="text-xs text-muted-foreground">
                  An undisclosed blend: it may contain any{" "}
                  <Link href="/allergens#fragrance" className="underline">
                    fragrance allergen
                  </Link>
                  , so this product can&apos;t be confirmed free of them.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Matched on label names and synonyms from the published list.{" "}
        <Link href="/allergens" className="font-medium text-brand hover:underline">
          About the allergen list →
        </Link>
      </p>
    </div>
  );
}
