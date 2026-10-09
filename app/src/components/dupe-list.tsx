import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DUPE_FORM_LABELS } from "@/lib/dupe-rules";
import type { Dupe, DupeResult } from "@/lib/dupes";
import { displayManufacturer } from "@/lib/format";

// The dupe finder's list (lib/dupes.ts), on the product page and on its own
// /product/[id]/dupes page.

/** What the list is, in one or two sentences, with the sunscreen caveat where it applies. */
export function DupeExplainer({ result, sunscreen }: { result: DupeResult; sunscreen: boolean }) {
  const form = result.form ? DUPE_FORM_LABELS[result.form].toLowerCase() : null;
  return (
    <p className="text-sm text-muted-foreground">
      Products with exactly the same active ingredients{form ? `, in the same form (${form})` : ""}, at the same strength
      wherever both labels list one. Closest inactive ingredients first, weighting distinctive ones over common ones like
      water and glycerin. Texture, feel and price can still differ.
      {sunscreen &&
        " For sunscreens, SPF and broad-spectrum protection are tested on each finished product, so the same filters don't guarantee the same SPF — check each label."}
    </p>
  );
}

/** Why there's nothing to show, so the section still answers the question. */
export function DupeEmpty({ result }: { result: DupeResult }) {
  let why: string;
  if (!result.hasActives) why = "This product lists no active ingredients we track, so there's nothing to match exactly.";
  else if (!result.form) why = "We can't tell this product's form (cream, lotion, gel...) from its listing, so we can't confirm a dupe.";
  else if (result.sameBrandTotal > 0) why = "No other brand sells one with exactly these actives in this form.";
  else why = "Nothing else in our catalog has exactly these actives in this form.";
  return <p className="text-sm text-muted-foreground">{why}</p>;
}

function matchLine(d: Dupe): string {
  if (!d.match) return "No inactive ingredient list to compare";
  return `${Math.round(d.match.score * 100)}% inactive match · ${d.match.shared} of ${d.match.union} inactive ingredients in common`;
}

export function DupeRows({ rows, compareWith }: { rows: Dupe[]; compareWith: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((d) => (
        <div key={d.product.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-0 space-y-1">
            <Link href={`/product/${encodeURIComponent(d.product.id)}`} className="block truncate font-medium hover:underline">
              {d.product.brandName}
            </Link>
            <p className="text-xs text-muted-foreground">
              {matchLine(d)}
              {d.product.manufacturer ? ` · ${displayManufacturer(d.product.manufacturer)}` : ""}
            </p>
            {(d.strength === "unknown" || d.discontinued || d.imported) && (
              <div className="flex flex-wrap gap-1.5">
                {d.strength === "unknown" && (
                  <Badge variant="outline" className="text-[11px]" title="One of the two labels doesn't state the strength, so it couldn't be compared">
                    Strength not listed
                  </Badge>
                )}
                {d.imported && (
                  <Badge variant="outline" className="text-[11px]">
                    Imported
                  </Badge>
                )}
                {d.discontinued && (
                  <Badge variant="outline" className="text-[11px]">
                    Likely discontinued
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Link
            href={`/compare?a=${encodeURIComponent(compareWith)}&b=${encodeURIComponent(d.product.id)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Compare
          </Link>
        </div>
      ))}
    </div>
  );
}
