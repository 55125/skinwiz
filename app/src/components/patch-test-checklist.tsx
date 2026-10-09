"use client";

import { useMemo, useState } from "react";
import { Check, ListChecks, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLERGEN_GROUPS, PATCH_TEST_FAMILY, normalizeForAllergens, resolveAllergenId, searchAllergens } from "@/db/contact-allergens";
import {
  NOT_ON_LABELS,
  PATCH_TEST_SERIES,
  getNotOnLabel,
  importItemName,
  itemFamily,
  itemIds,
  seriesItemByKey,
  seriesItemKey,
  sharesIdsInSeries,
  type SeriesItem,
} from "@/db/patch-test-series";
import { cn } from "@/lib/utils";

// The standard series as tick lists, for the clinician's sheet and for
// patients picking from their own results. Selection is a set of allergen,
// family and not-on-label ids, so ticking "Formaldehyde" on the T.R.U.E. Test
// also shows it ticked on the core series.

const SEARCH_TAB = "search";

// An item is ticked when its ids are all on the list, except an item that
// shares its ids with another in the same series (budesonide and
// triamcinolone are both "class B"): that one is ticked only by name.
function itemOn(key: string, it: SeriesItem, selected: Set<string>, ticked: Set<string>): boolean {
  if (ticked.has(key)) return true;
  return !sharesIdsInSeries(key) && itemIds(it).every((id) => selected.has(id));
}

// Ticked items whose ids are no longer all on the list are unticked.
function prune(ticked: Set<string>, selected: Set<string>): Set<string> {
  return new Set([...ticked].filter((k) => {
    const it = seriesItemByKey(k);
    return it && itemIds(it).every((id) => selected.has(id));
  }));
}

export function PatchTestChecklist({
  selected,
  onChange,
  ticked: tickedProp,
  onTickedChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  // Series items ticked by name (seriesItemKey), for callers that print them.
  ticked?: Set<string>;
  onTickedChange?: (next: Set<string>) => void;
}) {
  const [tab, setTab] = useState(PATCH_TEST_SERIES[0].id);
  const [query, setQuery] = useState("");
  const [ownTicked, setOwnTicked] = useState<Set<string>>(() => new Set());
  const ticked = tickedProp ?? ownTicked;
  const setTicked = onTickedChange ?? setOwnTicked;
  const series = PATCH_TEST_SERIES.find((s) => s.id === tab);

  function commit(next: Set<string>, nextTicked: Set<string>) {
    onChange(next);
    setTicked(prune(nextTicked, next));
  }

  function toggleItem(key: string, it: SeriesItem) {
    const next = new Set(selected);
    const nextTicked = new Set(ticked);
    const family = itemFamily(it);
    if (itemOn(key, it, selected, ticked)) {
      nextTicked.delete(key);
      // The same allergen ticked on another series' tab goes too, or the untick couldn't stick.
      const seriesId = key.slice(0, key.indexOf(":"));
      for (const k of ticked) {
        const other = seriesItemByKey(k);
        if (other && !k.startsWith(`${seriesId}:`) && itemIds(other).every((id) => itemIds(it).includes(id))) nextTicked.delete(k);
      }
      // Keep ids another ticked item still stands for (caine mix and benzocaine).
      const stillNeeded = new Set([...nextTicked].flatMap((k) => (seriesItemByKey(k) ? itemIds(seriesItemByKey(k)!) : [])));
      for (const id of itemIds(it)) if (!stillNeeded.has(id)) next.delete(id);
      // Keep the family while another ticked allergen still extends to it (PPD and PTD).
      if (family && ![...next].some((id) => PATCH_TEST_FAMILY[id]?.id === family.id)) next.delete(family.id);
    } else {
      nextTicked.add(key);
      for (const id of itemIds(it)) next.add(id);
      if (family?.byDefault) next.add(family.id);
    }
    commit(next, nextTicked);
  }

  function toggleId(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commit(next, ticked);
  }

  const results = useMemo(() => {
    const q = normalizeForAllergens(query);
    if (q.length < 2) return [];
    const groups = ALLERGEN_GROUPS.filter((g) => normalizeForAllergens(g.name).includes(q)).map((g) => ({ id: g.id, name: g.name, hint: "Family / mix" }));
    const allergens = searchAllergens(q).map((a) => ({ id: a.id, name: a.name, hint: undefined as string | undefined }));
    const off = NOT_ON_LABELS.filter((n) => normalizeForAllergens(n.name).includes(q)).map((n) => ({ id: n.id, name: n.name, hint: "Not on cosmetic labels" }));
    return [...groups, ...allergens, ...off];
  }, [query]);

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Marked allergens">
          {[...selected].map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => toggleId(id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
                  getNotOnLabel(id) ? "border-dashed bg-muted text-foreground" : "border-primary bg-primary text-primary-foreground",
                )}
              >
                {importItemName(id) ?? id}
                <X className="h-3 w-3" aria-label="remove" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Patch-test series">
        {[...PATCH_TEST_SERIES.map((s) => ({ id: s.id, label: s.name })), { id: SEARCH_TAB, label: "Search all allergens" }].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
            )}
          >
            {t.id === SEARCH_TAB && <Search className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />}
            {t.label}
          </button>
        ))}
      </div>

      {series ? (
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground">{series.description}</p>
          {series.groups.map((g) => (
            <fieldset key={g.title} className="space-y-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {g.items.map((it) => {
                  const key = seriesItemKey(series.id, it);
                  return (
                    <SeriesRow
                      key={key}
                      item={it}
                      on={itemOn(key, it, selected, ticked)}
                      covered={sharesIdsInSeries(key) && !ticked.has(key) && itemIds(it).every((id) => selected.has(id))}
                      selected={selected}
                      onToggle={() => toggleItem(key, it)}
                      onToggleId={toggleId}
                    />
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Any name: patch-test, label (INCI) or trade name"
              className="pl-9"
              aria-label="Search all allergens"
            />
          </div>
          {query.trim().length >= 2 && results.length === 0 && (
            <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">Nothing on our list matches &ldquo;{query}&rdquo;.</p>
          )}
          <div className="grid gap-1.5 sm:grid-cols-2">
            {results.map((r) => (
              <Tick key={r.id} on={selected.has(r.id)} onToggle={() => toggleId(r.id)} label={r.name} hint={r.hint} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeriesRow({
  item,
  on,
  covered,
  selected,
  onToggle,
  onToggleId,
}: {
  item: SeriesItem;
  on: boolean;
  // Not ticked itself, but its allergens are already on the list via another item.
  covered: boolean;
  selected: Set<string>;
  onToggle: () => void;
  onToggleId: (id: string) => void;
}) {
  const family = itemFamily(item);
  const mapped = item.ids.map((id) => importItemName(id) ?? id).join(" + ");
  const base = item.notOnLabel
    ? "Not on cosmetic labels; listed for information"
    : normalizeForAllergens(mapped) === normalizeForAllergens(item.name)
      ? undefined
      : `Checks labels for ${mapped}`;
  const hint = covered ? `${base ? `${base}. ` : ""}Already on the list from another tick; tick it too if it was positive.` : base;
  return (
    <div className={cn("rounded-xl border", on ? "border-brand/50 bg-brand-soft" : "bg-card")}>
      <Tick on={on} onToggle={onToggle} label={item.pos ? `${item.pos}. ${item.name}` : item.name} hint={hint} bare />
      {on && family && (
        <div className="px-3 pb-2.5 pl-11">
          <Tick on={selected.has(family.id)} onToggle={() => onToggleId(family.id)} label={`Also avoid ${importItemName(family.id)}`} small bare />
        </div>
      )}
    </div>
  );
}

function Tick({
  on,
  onToggle,
  label,
  hint,
  small,
  bare,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
  small?: boolean;
  bare?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3",
        small ? "text-xs" : "px-3 py-2.5 text-sm",
        !bare && cn("rounded-xl border", on ? "border-brand/50 bg-brand-soft" : "bg-card hover:bg-muted"),
      )}
    >
      <input type="checkbox" className="sr-only" checked={on} onChange={onToggle} />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex shrink-0 items-center justify-center rounded border",
          small ? "h-4 w-4" : "h-5 w-5 rounded-md",
          on ? "border-primary bg-primary text-primary-foreground" : "bg-background",
        )}
      >
        {on && <Check className={small ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      </span>
      <span className="min-w-0 [overflow-wrap:anywhere]">
        <span className={cn("block", !small && "font-medium")}>{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

// For patients without a QR: tick positives off the series their
// dermatologist used, then add the label-checkable ones to the avoid list.
export function PatchTestSeriesPicker({ onAdd, defaultOpen }: { onAdd: (ids: string[], notOnLabel: string[]) => void; defaultOpen?: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<number | null>(null);
  const avoidIds = [...selected].filter((id) => resolveAllergenId(id));
  const offLabel = [...selected].filter((id) => getNotOnLabel(id));

  return (
    <details open={defaultOpen} className="rounded-2xl border border-brand/30 bg-brand-soft/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-brand">
          <ListChecks className="h-4.5 w-4.5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Pick from a patch-test series</span>
          <span className="block text-xs text-muted-foreground">
            Tick your positives on the series your dermatologist used: the T.R.U.E. Test, an ACDS or NAC-80 tray, or the core series.
          </span>
        </span>
      </summary>
      <div className="space-y-4 px-4 pb-4">
        <PatchTestChecklist
          selected={selected}
          onChange={(next) => {
            setSelected(next);
            setAdded(null);
          }}
        />
        {offLabel.length > 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Saved to your list for reference, but not on cosmetic labels, so we can&apos;t check products for:{" "}
            {offLabel.map((id) => `${getNotOnLabel(id)!.name} (${getNotOnLabel(id)!.foundIn.replace(/\.$/, "").toLowerCase()})`).join("; ")}.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={avoidIds.length + offLabel.length === 0}
            onClick={() => {
              onAdd(avoidIds, offLabel);
              setAdded(avoidIds.length + offLabel.length);
            }}
            className="rounded-full"
          >
            Add {avoidIds.length + offLabel.length || ""} to my list
          </Button>
          {added !== null && (
            <span className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Added {added} and saved
            </span>
          )}
        </div>
      </div>
    </details>
  );
}
