import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { displayManufacturer } from "@/lib/format";
import type { EquivalenceGroup, EquivalenceMember } from "@/lib/equivalence";
import { avoidVerdict, avoidedIngredientName, readAvoidIds, type AvoidVerdict } from "@/lib/avoid";
import { getProduct } from "@/lib/queries";

export const STORE_BRAND_CLASS = "border-teal-300 text-teal-700 dark:border-teal-800 dark:text-teal-300";

// The plain-language "why these count as the same" line, shared by the
// product page section and /same/[slug]. Regulatory wording -- keep it
// conservative: same active + strength + form is a labeling fact; the
// inactive ingredients are not the same and we say so.
export function EquivalenceExplainer({ group }: { group: EquivalenceGroup }) {
  return (
    <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
      Every product here is an FDA-listed over-the-counter drug whose label states the same active ingredient
      {group.activeIds.length > 1 ? "s" : ""} at the same strength, in the same form.{" "}
      {group.application
        ? "This active is sold OTC under an FDA-approved application rather than a monograph: the original was approved on its own data, and generic versions are approved as equivalent to it."
        : "OTC drugs made under the same FDA monograph have to meet the same conditions for that active, strength and use — a store brand is held to the same standard as the name brand."}{" "}
      The inactive ingredients (the vehicle) can differ, which can change texture, scent and how your skin tolerates
      it — use Compare to see both full ingredient lists.
    </p>
  );
}

// Same active and strength, but a different vehicle: a store-brand
// hydrocortisone can carry the lanolin or parabens someone avoids, so each
// swap is checked against the visitor's avoid list like a product card.
export async function EquivalenceRows({
  members,
  compareWith,
  prices,
}: {
  members: EquivalenceMember[];
  compareWith?: string;
  // Live (non-demo) prices only, keyed by member id. Empty today.
  prices?: Map<string, { price: number; perUnit: string | null }>;
}) {
  const avoidIds = await readAvoidIds();
  const verdicts = new Map<string, AvoidVerdict | null>();
  if (avoidIds.length > 0) {
    for (const m of members) {
      const p = getProduct(m.id);
      verdicts.set(m.id, p ? avoidVerdict(p, avoidIds) : { status: "unassessed" });
    }
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {members.map((m) => {
        const price = prices?.get(m.id);
        const avoid = verdicts.get(m.id) ?? null;
        return (
          <div key={m.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0 space-y-1">
              <Link href={`/product/${encodeURIComponent(m.id)}`} className="block truncate font-medium hover:underline">
                {m.brandName}
              </Link>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {m.storeBrand && (
                  <Badge variant="outline" className={STORE_BRAND_CLASS} title={`Store brand: ${m.storeBrand}`}>
                    Store brand
                  </Badge>
                )}
                <span className="truncate">{m.storeBrand ?? (m.manufacturer ? displayManufacturer(m.manufacturer) : "")}</span>
                {price && (
                  <span className="font-medium text-foreground tabular-nums">
                    ${price.price.toFixed(2)}
                    {price.perUnit ? ` · ${price.perUnit}` : ""}
                  </span>
                )}
              </div>
              {avoid && <AvoidLine avoid={avoid} />}
            </div>
            {compareWith && compareWith !== m.id && (
              <Link
                href={`/compare?a=${encodeURIComponent(compareWith)}&b=${encodeURIComponent(m.id)}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Compare
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AvoidLine({ avoid }: { avoid: AvoidVerdict }) {
  if (avoid.status === "conflicts")
    return (
      <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        Contains {avoidedIngredientName(avoid.conflicts[0])}
        {avoid.conflicts.length > 1 ? ` +${avoid.conflicts.length - 1} more you avoid` : ""}
      </Badge>
    );
  if (avoid.status === "possible")
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        Fragrance may hide {avoid.possible.length === 1 ? avoidedIngredientName(avoid.possible[0]) : `${avoid.possible.length} you avoid`}
      </Badge>
    );
  if (avoid.status === "clear")
    return (
      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
        Clear of your avoid list
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Couldn&apos;t check against your avoid list
    </Badge>
  );
}
