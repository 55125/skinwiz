import Link from "next/link";
import { FilterChip } from "@/components/filter-chip";
import { FREE_FROM_CHECKS } from "@/db/ingredient-flags";
import { readAvoidIds } from "@/lib/avoid";

// Server-rendered toggle links, no client JS -- same philosophy as the
// existing single-select active-ingredient chips on /concern/[slug]. Each
// click adds/removes this check's id from the "free" query param (comma-
// separated, since these AND together) while preserving every other param
// and resetting pagination, since the result set changes.
export async function FreeFromFilters({
  basePath,
  searchParams,
  selected,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  selected: string[];
}) {
  function hrefWithFree(next: string[]) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "free" || k === "page" || !v) continue;
      params.set(k, v);
    }
    if (next.length > 0) params.set("free", next.join(","));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  function hrefToggling(id: string) {
    return hrefWithFree(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  const avoidIds = await readAvoidIds();
  const avoidApplied =
    avoidIds.length > 0 && avoidIds.length === selected.length && avoidIds.every((id) => selected.includes(id));

  const clean = FREE_FROM_CHECKS.filter((c) => c.category === "clean");
  const contactAllergen = FREE_FROM_CHECKS.filter((c) => c.category === "contact-allergen");

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {avoidIds.length > 0 ? (
          <FilterChip href={avoidApplied ? hrefWithFree([]) : hrefWithFree(avoidIds)} selected={avoidApplied} showCheck>
            {avoidApplied ? "Hiding what I avoid" : `Hide what I avoid (${avoidIds.length})`}
          </FilterChip>
        ) : null}
        <Link href="/avoid" className="text-xs font-medium text-brand hover:underline">
          {avoidIds.length > 0 ? "Edit my avoid list" : "Set up my avoid list"}
        </Link>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Clean ingredient filters
        </p>
        <div className="flex flex-wrap gap-1.5">
          {clean.map((c) => (
            <FilterChip key={c.id} href={hrefToggling(c.id)} selected={selected.includes(c.id)} showCheck>
              {c.label}
            </FilterChip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Avoid common contact-dermatitis allergens
        </p>
        <div className="flex flex-wrap gap-1.5">
          {contactAllergen.map((c) => (
            <FilterChip key={c.id} href={hrefToggling(c.id)} selected={selected.includes(c.id)} showCheck>
              {c.label}
            </FilterChip>
          ))}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Computed from each product&apos;s published ingredient list, not a brand&apos;s marketing claim or a
        certification, and not exhaustive — see a board-certified dermatologist about your own known allergens.
        Products we don&apos;t have a full ingredient list for (most openFDA-only listings) won&apos;t match any
        filter here rather than being assumed clean.
      </p>
    </div>
  );
}
