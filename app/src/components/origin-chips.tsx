import { FilterChip } from "@/components/filter-chip";
import { ORIGINS, type OriginId } from "@/lib/origin-shared";
import { cn } from "@/lib/utils";

// "Brand from: Anywhere · Korea 471 · Japan 64 ..." -- one region at a time,
// as server-rendered links like the other filter chips. Counts are under
// every other filter on the page; a region with nothing to show is left out
// unless it's the one selected, so a chip never leads to an empty list.
export function OriginChips({
  selected,
  counts,
  hrefFor,
  label = "Brand from",
  labelClassName,
}: {
  selected: OriginId | undefined;
  counts: Map<OriginId, number>;
  hrefFor: (origin: OriginId | undefined) => string;
  label?: string;
  /** Lines the label up with the page's other chip rows (search uses a fixed width). */
  labelClassName?: string;
}) {
  const shown = ORIGINS.filter((o) => o.id === selected || (counts.get(o.id) ?? 0) > 0);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={cn("mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", labelClassName)}>{label}</span>
      <FilterChip href={hrefFor(undefined)} selected={!selected}>
        Anywhere
      </FilterChip>
      {shown.map((o) => (
        <FilterChip key={o.id} href={hrefFor(o.id)} selected={selected === o.id}>
          {o.place} <span className="ml-1 tabular-nums opacity-70">{(counts.get(o.id) ?? 0).toLocaleString()}</span>
        </FilterChip>
      ))}
    </div>
  );
}
