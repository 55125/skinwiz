import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FREE_FROM_CHECKS } from "@/db/ingredient-flags";

// Server-rendered toggle links, no client JS -- same philosophy as the
// existing single-select active-ingredient chips on /concern/[slug]. Each
// click adds/removes this check's id from the "free" query param (comma-
// separated, since these AND together) while preserving every other param
// and resetting pagination, since the result set changes.
export function FreeFromFilters({
  basePath,
  searchParams,
  selected,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  selected: string[];
}) {
  function hrefToggling(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "free" || k === "page" || !v) continue;
      params.set(k, v);
    }
    if (next.length > 0) params.set("free", next.join(","));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  const clean = FREE_FROM_CHECKS.filter((c) => c.category === "clean");
  const contactAllergen = FREE_FROM_CHECKS.filter((c) => c.category === "contact-allergen");

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Clean ingredient filters
        </p>
        <div className="flex flex-wrap gap-2">
          {clean.map((c) => (
            <Link key={c.id} href={hrefToggling(c.id)}>
              <Badge variant={selected.includes(c.id) ? "default" : "outline"} className="cursor-pointer">
                {c.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Avoid common contact-dermatitis allergens
        </p>
        <div className="flex flex-wrap gap-2">
          {contactAllergen.map((c) => (
            <Link key={c.id} href={hrefToggling(c.id)}>
              <Badge variant={selected.includes(c.id) ? "default" : "outline"} className="cursor-pointer">
                {c.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
      <p className="text-xs italic text-muted-foreground">
        Computed from each product&apos;s published ingredient list, not a brand&apos;s marketing claim or a
        certification, and not exhaustive — see a board-certified dermatologist about your own known allergens.
        Products we don&apos;t have a full ingredient list for (most openFDA-only listings) won&apos;t match any
        filter here rather than being assumed clean.
      </p>
    </div>
  );
}
