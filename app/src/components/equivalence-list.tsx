import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { displayManufacturer } from "@/lib/format";
import type { EquivalenceGroup, EquivalenceMember } from "@/lib/equivalence";

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

export function EquivalenceRows({
  members,
  compareWith,
  prices,
}: {
  members: EquivalenceMember[];
  compareWith?: string;
  // Live (non-demo) prices only, keyed by member id. Empty today.
  prices?: Map<string, { price: number; perUnit: string | null }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {members.map((m) => {
        const price = prices?.get(m.id);
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
