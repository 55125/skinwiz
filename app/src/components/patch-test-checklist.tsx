"use client";

import { useMemo, useState } from "react";
import { Check, ListChecks, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLERGEN_GROUPS, normalizeForAllergens, resolveAllergenId, searchAllergens } from "@/db/contact-allergens";
import {
  NOT_ON_LABELS,
  PATCH_TEST_SERIES,
  getNotOnLabel,
  importItemName,
  itemFamily,
  type SeriesItem,
} from "@/db/patch-test-series";
import { cn } from "@/lib/utils";

// The standard series as tick lists, for the clinician's sheet and for
// patients picking from their own results. Selection is a set of allergen,
// family and not-on-label ids, so ticking "Formaldehyde" on the T.R.U.E. Test
// also shows it ticked on the core series.

const SEARCH_TAB = "search";

function itemOn(it: SeriesItem, selected: Set<string>): boolean {
  return it.ids.length > 0 ? it.ids.every((id) => selected.has(id)) : selected.has(it.notOnLabel!);
}

export function PatchTestChecklist({ selected, onChange }: { selected: Set<string>; onChange: (next: Set<string>) => void }) {
  const [tab, setTab] = useState(PATCH_TEST_SERIES[0].id);
  const [query, setQuery] = useState("");
  const series = PATCH_TEST_SERIES.find((s) => s.id === tab);

  function toggleItem(it: SeriesItem) {
    const next = new Set(selected);
    const family = itemFamily(it);
    if (itemOn(it, selected)) {
      for (const id of it.ids) next.delete(id);
      if (it.notOnLabel) next.delete(it.notOnLabel);
      if (family) next.delete(family.id);
    } else {
      for (const id of it.ids) next.add(id);
      if (it.notOnLabel) next.add(it.notOnLabel);
      if (family?.byDefault) next.add(family.id);
    }
    onChange(next);
  }

  function toggleId(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
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
                {g.items.map((it) => (
                  <SeriesRow key={`${g.title}:${it.name}`} item={it} selected={selected} onToggle={() => toggleItem(it)} onToggleId={toggleId} />
                ))}
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
  selected,
  onToggle,
  onToggleId,
}: {
  item: SeriesItem;
  selected: Set<string>;
  onToggle: () => void;
  onToggleId: (id: string) => void;
}) {
  const on = itemOn(item, selected);
  const family = itemFamily(item);
  const mapped = item.ids.map((id) => importItemName(id) ?? id).join(" + ");
  const hint = item.notOnLabel
    ? "Not on cosmetic labels; listed for information"
    : normalizeForAllergens(mapped) === normalizeForAllergens(item.name)
      ? undefined
      : `Checks labels for ${mapped}`;
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
export function PatchTestSeriesPicker({ onAdd, defaultOpen }: { onAdd: (ids: string[]) => void; defaultOpen?: boolean }) {
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
            Not on cosmetic labels, so we can&apos;t check products for:{" "}
            {offLabel.map((id) => `${getNotOnLabel(id)!.name} (${getNotOnLabel(id)!.foundIn.replace(/\.$/, "").toLowerCase()})`).join("; ")}.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={avoidIds.length === 0}
            onClick={() => {
              onAdd(avoidIds);
              setAdded(avoidIds.length);
            }}
            className="rounded-full"
          >
            Add {avoidIds.length || ""} to my list
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
