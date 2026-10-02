import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { FilterChip } from "@/components/filter-chip";
import { FREE_FROM_CHECKS } from "@/db/ingredient-flags";
import { readAvoidIds } from "@/lib/avoid";
import { CONTACT_ALLERGENS, FEATURED_ALLERGEN_IDS, allergenLabel } from "@/db/contact-allergens";

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

  const clean = FREE_FROM_CHECKS.filter((c) => c.category === "clean");
  // The full allergen list is ~100 long: offer the high-yield picks here,
  // plus whatever else is already selected so an active filter stays visible.
  const allergenIds = [...new Set([...FEATURED_ALLERGEN_IDS, ...selected.filter((id) => allergenLabel(id))])];
  const skin = FREE_FROM_CHECKS.filter((c) => c.category === "skin");

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <Link href="/avoid" className="block text-xs font-medium text-brand hover:underline">
        {avoidIds.length > 0 ? "Edit my avoid list" : "Set up my avoid list"}
      </Link>
      <FilterGroup
        title="Clean ingredient filters"
        checks={clean}
        selected={selected}
        defaultOpen={true}
      >
          {clean.map((c) => (
            <FilterChip key={c.id} href={hrefToggling(c.id)} selected={selected.includes(c.id)} showCheck>
              {c.label}
            </FilterChip>
          ))}
      </FilterGroup>
      <FilterGroup
        title="Avoid contact-dermatitis allergens"
        checks={allergenIds.map((id) => ({ id }))}
        selected={selected}
        defaultOpen={false}
      >
          {allergenIds.map((id) => (
            <FilterChip key={id} href={hrefToggling(id)} selected={selected.includes(id)} showCheck>
              {allergenLabel(id)}
            </FilterChip>
          ))}
          <Link href="/allergens" className="self-center px-1 text-xs font-medium text-brand hover:underline">
            All {CONTACT_ALLERGENS.length} allergens →
          </Link>
      </FilterGroup>
      <FilterGroup
        title="Skin type & lifestyle"
        checks={skin}
        selected={selected}
        defaultOpen={false}
      >
          {skin.map((c) => (
            <FilterChip key={c.id} href={hrefToggling(c.id)} selected={selected.includes(c.id)} showCheck>
              {c.label}
            </FilterChip>
          ))}
      </FilterGroup>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Computed from each product&apos;s published ingredient list, not a brand&apos;s marketing claim or a
        certification, and not exhaustive — see a board-certified dermatologist about your own known allergens.
        Products we don&apos;t have a full ingredient list for (most openFDA-only listings) won&apos;t match any
        filter here rather than being assumed clean, and a product listing only &ldquo;fragrance&rdquo; doesn&apos;t
        pass a fragrance-allergen filter, since the blend could contain it.
      </p>
    </div>
  );
}

// Collapsible per category (native <details>, still no client JS); a group
// opens by default when it holds a selected filter, so an active filter is
// never hidden.
function FilterGroup({
  title,
  checks,
  selected,
  defaultOpen,
  children,
}: {
  title: string;
  checks: { id: string }[];
  selected: string[];
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const count = checks.filter((c) => selected.includes(c.id)).length;
  return (
    <details className="group/fg border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0" open={defaultOpen || count > 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {count > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] text-primary-foreground">{count}</span>}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open/fg:rotate-180" />
      </summary>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </details>
  );
}
