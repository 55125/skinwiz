import Link from "next/link";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { FreeFromFilters } from "@/components/free-from-filters";
import { ORIGINS, type OriginId } from "@/lib/origin-shared";
import { TRUST_TIERS } from "@/lib/trust-tiers";
import { HSA_GUIDE_PATH } from "@/lib/hsa";
import { formatPct } from "@/db/strength";
import { cn } from "@/lib/utils";

/** Builds a link to the same listing with some params changed (undefined removes one); resets ?page. */
export type ListingHref = (overrides: Record<string, string | undefined>) => string;

// The one filter panel for every product listing (/browse, /concern/[slug],
// /search): same groups, same names, same order everywhere, and a page
// leaves out the groups that don't apply to it (no Concern group on a
// concern page). Every group is a set of server-rendered links, no client
// JS, each keeping the page's other params. Order: what you're treating,
// what's in it, where it's from, how you pay, what you avoid, and last
// Source, our own data term.
export function ListingFilters({
  hrefWith,
  concern,
  active,
  origin,
  hsa,
  freeFrom,
  source,
}: {
  hrefWith: ListingHref;
  concern?: { selected?: string; options: { id: string; name: string }[] };
  active?: {
    selected?: string;
    options: { id: string; canonicalName: string }[];
    /** Strength picks for the selected active (concern pages). */
    strength?: { selected?: number; options: { pct: number; count: number }[] };
  };
  origin: { selected?: OriginId; counts: Map<OriginId, number> };
  hsa?: { selected: boolean };
  freeFrom: { basePath: string; searchParams: Record<string, string | undefined>; selected: string[]; extra?: React.ReactNode };
  source?: { selected?: string };
}) {
  // A region with nothing to show is left out unless it's the one
  // selected, so a link never leads to an empty list.
  const origins = ORIGINS.filter((o) => o.id === origin.selected || (origin.counts.get(o.id) ?? 0) > 0);

  return (
    <div className="space-y-6 text-sm">
      {concern && (
        <FilterGroup title="Concern">
          <ul className="space-y-0.5">
            <li>
              <FilterLink href={hrefWith({ concern: undefined })} selected={!concern.selected}>
                All concerns
              </FilterLink>
            </li>
            {concern.options.map((c) => (
              <li key={c.id}>
                <FilterLink href={hrefWith({ concern: c.id })} selected={concern.selected === c.id}>
                  {c.name}
                </FilterLink>
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      {active && active.options.length > 0 && (
        <FilterGroup title="Active ingredient">
          <ActiveList hrefWith={hrefWith} {...active} />
        </FilterGroup>
      )}

      {active?.strength && active.strength.options.length > 1 && (
        <FilterGroup title="Strength" note="from the FDA label">
          <ul className="space-y-0.5">
            <li>
              <FilterLink href={hrefWith({ strength: undefined })} selected={active.strength.selected === undefined}>
                All strengths
              </FilterLink>
            </li>
            {active.strength.options.map((o) => (
              <li key={o.pct}>
                <FilterLink href={hrefWith({ strength: String(o.pct) })} selected={active.strength!.selected === o.pct}>
                  <Count count={o.count}>{formatPct(o.pct)}</Count>
                </FilterLink>
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      {origins.length > 0 && (
        <FilterGroup title="Brand from">
          <ul className="space-y-0.5">
            <li>
              <FilterLink href={hrefWith({ from: undefined })} selected={!origin.selected}>
                Anywhere
              </FilterLink>
            </li>
            {origins.map((o) => (
              <li key={o.id}>
                <FilterLink href={hrefWith({ from: o.id })} selected={origin.selected === o.id}>
                  <Count count={origin.counts.get(o.id) ?? 0}>{o.place}</Count>
                </FilterLink>
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      {hsa && (
        <FilterGroup title="Spending account">
          <FilterLink href={hrefWith({ hsa: hsa.selected ? undefined : "1" })} selected={hsa.selected}>
            HSA/FSA eligible
          </FilterLink>
          <p className="mt-1 px-2.5 text-xs text-muted-foreground">
            OTC medicines and broad spectrum SPF 15+ sunscreens. Your plan decides.{" "}
            <Link href={HSA_GUIDE_PATH} className="underline">
              How this works
            </Link>
          </p>
        </FilterGroup>
      )}

      <FilterGroup title="Free from">
        <FreeFromFilters {...freeFrom} />
      </FilterGroup>

      {source && (
        <FilterGroup title="Source">
          <ul className="space-y-0.5">
            <li>
              <FilterLink href={hrefWith({ tier: undefined })} selected={!source.selected}>
                All sources
              </FilterLink>
            </li>
            {TRUST_TIERS.map((t) => (
              <li key={t.label}>
                <FilterLink href={hrefWith({ tier: t.label })} selected={source.selected === t.label}>
                  {t.label}
                </FilterLink>
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}
    </div>
  );
}

// The listing layout around the filters: a left sidebar from lg up, and on
// smaller screens one collapsed "Filters" button (with a count of what's
// on), so the first product isn't pushed a screen down. Rendered twice
// since <details> can't be forced open per breakpoint and these pages stay
// server-rendered with no client JS.
export function FilteredListing({
  filters,
  filterCount,
  children,
}: {
  filters: React.ReactNode;
  filterCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
      <details className="group rounded-2xl border bg-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-brand" aria-hidden />
            Filters
            {filterCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{filterCount}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t p-3">{filters}</div>
      </details>
      <aside className="hidden lg:block">{filters}</aside>
      <div className="min-w-0 space-y-5">{children}</div>
    </div>
  );
}

const ACTIVES_SHOWN = 8;

// First few inline, the rest behind a disclosure (opened when the selected
// active is in it) -- a short scroll box inside the sidebar cut the list
// off mid-word.
function ActiveList({
  hrefWith,
  selected,
  options,
}: {
  hrefWith: ListingHref;
  selected?: string;
  options: { id: string; canonicalName: string }[];
}) {
  // A new active starts from all its strengths.
  const item = (a: { id: string; canonicalName: string }) => (
    <li key={a.id}>
      <FilterLink href={hrefWith({ active: a.id, strength: undefined })} selected={selected === a.id}>
        {a.canonicalName}
      </FilterLink>
    </li>
  );
  const rest = options.slice(ACTIVES_SHOWN);
  return (
    <>
      <ul className="space-y-0.5">
        <li>
          <FilterLink href={hrefWith({ active: undefined, strength: undefined })} selected={!selected}>
            All actives
          </FilterLink>
        </li>
        {options.slice(0, ACTIVES_SHOWN).map(item)}
      </ul>
      {rest.length > 0 && (
        <details className="group/actives" open={rest.some((a) => a.id === selected)}>
          <summary className="mt-1 flex cursor-pointer list-none items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-brand [&::-webkit-details-marker]:hidden">
            <span className="group-open/actives:hidden">Show all {options.length} actives</span>
            <span className="hidden group-open/actives:inline">Show fewer</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/actives:rotate-180" aria-hidden />
          </summary>
          <ul className="space-y-0.5">{rest.map(item)}</ul>
        </details>
      )}
    </>
  );
}

function FilterGroup({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        {note && <span className="ml-1 font-normal normal-case tracking-normal">({note})</span>}
      </h2>
      {children}
    </div>
  );
}

function FilterLink({ href, selected, children }: { href: string; selected: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "block rounded-lg px-2.5 py-1.5 transition-colors",
        selected
          ? "bg-brand-soft font-medium text-brand-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function Count({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <span className="flex justify-between gap-2">
      {children}
      <span className="tabular-nums opacity-70">{count.toLocaleString()}</span>
    </span>
  );
}
