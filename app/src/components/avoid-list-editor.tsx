"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FREE_FROM_CHECKS } from "@/db/ingredient-flags";
import {
  ALLERGEN_GROUPS,
  ALLERGEN_SECTIONS,
  CONTACT_ALLERGENS,
  allergenLabel,
  labelNames,
  normalizeForAllergens,
  searchAllergens,
  type AllergenGroup,
  type ContactAllergen,
} from "@/db/contact-allergens";
import { PatchTestPaste } from "@/components/patch-test-paste";
import { getNotOnLabel } from "@/db/patch-test-series";
import { PatchTestSeriesPicker } from "@/components/patch-test-checklist";
import { cn } from "@/lib/utils";

// Every tick saves itself (debounced), so "saved in this browser" is true the
// moment you pick something; there is no Save button to forget. While a save
// is still in flight, leaving the page asks first.
const SAVE_DELAY_MS = 500;

// `addNotOnLabel`: patch-test positives that aren't on labels, kept on the
// list for reference (the server merges them into those already saved).
function post(ids: Set<string>, keepalive = false, addNotOnLabel: string[] = []) {
  return fetch("/api/avoid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [...ids], addNotOnLabel }),
    keepalive,
  }).catch(() => null);
}

function postNotOnLabel(ids: string[]) {
  return fetch("/api/avoid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notOnLabel: ids }),
  }).catch(() => null);
}

export function AvoidListEditor({
  initialIds,
  initialNotOnLabel = [],
  pasteOpen,
  seriesOpen,
}: {
  initialIds: string[];
  initialNotOnLabel?: string[];
  pasteOpen?: boolean;
  seriesOpen?: boolean;
}) {
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set(initialIds));
  const [offLabel, setOffLabel] = useState<string[]>(initialNotOnLabel);
  const pendingOff = useRef<string[]>([]);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);
  const pending = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (status === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  // Leaving through an in-app link unmounts the editor: send a save that is
  // still waiting on the debounce right away instead of dropping it.
  useEffect(() => () => {
    if (!timer.current || !pending.current) return;
    clearTimeout(timer.current);
    void post(pending.current, true, pendingOff.current);
  }, []);

  async function persist(next: Set<string>) {
    timer.current = null;
    pending.current = null;
    const seq = ++latest.current;
    const addOff = pendingOff.current;
    pendingOff.current = [];
    const res = await post(next, false, addOff);
    if (seq !== latest.current) return; // a newer save is on its way
    if (res?.ok) {
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  function save(next: Set<string>, delay = SAVE_DELAY_MS) {
    setStatus("saving");
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), delay);
  }

  function toggle(id: string) {
    const next = new Set(ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setIds(next);
    save(next);
  }

  function addAndSave(picked: string[], off: string[] = []) {
    const next = new Set([...ids, ...picked]);
    setIds(next);
    if (off.length) {
      pendingOff.current = [...new Set([...pendingOff.current, ...off])];
      setOffLabel((prev) => [...new Set([...prev, ...off])]);
    }
    save(next, 0);
  }

  async function removeOffLabel(id: string) {
    const next = offLabel.filter((x) => x !== id);
    setOffLabel(next);
    const res = await postNotOnLabel(next);
    if (res?.ok) router.refresh();
    else setStatus("error");
  }

  const groups = [
    { title: "Common preferences", items: FREE_FROM_CHECKS.filter((c) => c.category === "clean") },
    { title: "Skin type & lifestyle", items: FREE_FROM_CHECKS.filter((c) => c.category === "skin") },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <PatchTestPaste defaultOpen={pasteOpen} onAdd={addAndSave} />
        <PatchTestSeriesPicker defaultOpen={seriesOpen} onAdd={addAndSave} />
      </div>

      {offLabel.length > 0 && (
        <section className="space-y-2" aria-labelledby="off-label-h">
          <h2 id="off-label-h" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Also positive, not on cosmetic labels
          </h2>
          <p className="text-xs text-muted-foreground">Kept here for reference; products can&apos;t be checked for these.</p>
          <ul className="divide-y rounded-2xl border border-dashed">
            {offLabel.map((id) => (
              <li key={id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <span>
                  <span className="font-medium">{getNotOnLabel(id)?.name ?? id}</span>
                  <span className="block text-xs text-muted-foreground">{getNotOnLabel(id)?.foundIn}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void removeOffLabel(id)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${getNotOnLabel(id)?.name ?? id}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AllergenPicker ids={ids} toggle={toggle} />

      {groups.map((group) => (
        <fieldset key={group.title} className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((c) => (
              <CheckRow key={c.id} on={ids.has(c.id)} onToggle={() => toggle(c.id)} label={c.label.replace(/-free$/, "")} />
            ))}
          </div>
        </fieldset>
      ))}

      <div className={cn("flex items-center gap-3", status !== "saved" && "sticky bottom-4 z-10")}>
        <p role="status" className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-sm">
          {status === "saving" && "Saving…"}
          {status === "saved" && (
            <>
              <Check className="h-4 w-4 text-brand" aria-hidden />
              {ids.size === 0 ? "Your list is empty" : `Saved: ${ids.size} ${ids.size === 1 ? "item" : "items"}`}
            </>
          )}
          {status === "error" && <span className="text-destructive">Couldn&apos;t save.</span>}
        </p>
        {status === "error" && (
          <Button type="button" variant="outline" size="sm" onClick={() => save(ids, 0)} className="rounded-full">
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

// Each family or patch-test mix sits as a switch at the top of the one
// category all its members belong to; a family spanning categories stays in
// a short list of its own above them.
const SECTION_OF = new Map(CONTACT_ALLERGENS.map((a) => [a.id, a.section]));
const GROUPS_BY_SECTION = new Map<string, AllergenGroup[]>();
const LOOSE_GROUPS: AllergenGroup[] = [];
for (const g of ALLERGEN_GROUPS) {
  const sections = new Set(g.members.map((m) => SECTION_OF.get(m)));
  const [only] = sections;
  if (sections.size === 1 && only) GROUPS_BY_SECTION.set(only, [...(GROUPS_BY_SECTION.get(only) ?? []), g]);
  else LOOSE_GROUPS.push(g);
}
// The group that covers most comes first ("Fragrance allergens (all)" before the mixes).
for (const groups of GROUPS_BY_SECTION.values()) groups.sort((a, b) => b.members.length - a.members.length);

function AllergenPicker({ ids, toggle }: { ids: Set<string>; toggle: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const q = normalizeForAllergens(query);
  const results = useMemo(() => searchAllergens(q), [q]);
  const selectedAllergens = [...ids].filter((id) => allergenLabel(id));
  // Which selected family covers an allergen, so its own box can say so.
  const coveredBy = new Map<string, string>();
  for (const g of ALLERGEN_GROUPS) if (ids.has(g.id)) for (const m of g.members) if (!coveredBy.has(m)) coveredBy.set(m, g.name);

  return (
    <fieldset className="space-y-4">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact-dermatitis allergens</legend>
      <p className="text-sm text-muted-foreground">
        Patch tested? Search by any name on your results sheet — the patch-test name, the label (INCI) name or a trade
        name — and we&apos;ll match every label synonym we know.
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Kathon CG, Lyral, wool alcohols, PPD"
          className="pl-9"
          aria-label="Search contact allergens"
        />
      </div>

      {selectedAllergens.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected allergens">
          {selectedAllergens.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
              >
                {allergenLabel(id)}
                <X className="h-3 w-3" aria-label="remove" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {q.length >= 2 ? (
        results.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {results.map((a) => (
              <AllergenRow key={a.id} allergen={a} on={ids.has(a.id)} onToggle={() => toggle(a.id)} coveredBy={coveredBy.get(a.id)} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            Nothing on our list matches &ldquo;{query}&rdquo;. Our list isn&apos;t exhaustive; check the full ingredient
            list of anything you buy for it by name.
          </p>
        )
      ) : (
        <>
          {LOOSE_GROUPS.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Families and patch-test mixes</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {LOOSE_GROUPS.map((g) => (
                  <CheckRow key={g.id} on={ids.has(g.id)} onToggle={() => toggle(g.id)} label={g.name} hint={g.note} />
                ))}
              </div>
            </div>
          )}

          <div className="divide-y rounded-xl border">
            {ALLERGEN_SECTIONS.map((section) => {
              const items = CONTACT_ALLERGENS.filter((a) => a.section === section.id);
              const groups = GROUPS_BY_SECTION.get(section.id) ?? [];
              const count = items.filter((a) => ids.has(a.id)).length + groups.filter((g) => ids.has(g.id)).length;
              return (
                <details key={section.id} className="group/sec">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <span>
                      {section.title} <span className="text-muted-foreground">({items.length})</span>
                      {count > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] text-primary-foreground">{count}</span>}
                    </span>
                  </summary>
                  {groups.length > 0 && (
                    <div className="mx-4 mb-3 divide-y rounded-xl border bg-card">
                      {groups.map((g) => (
                        <GroupSwitch
                          key={g.id}
                          on={ids.has(g.id)}
                          onToggle={() => toggle(g.id)}
                          // A group covering the whole section is the section's own switch.
                          label={items.every((a) => g.members.includes(a.id)) ? "Select the whole group" : g.name}
                          hint={items.every((a) => g.members.includes(a.id)) ? `${g.name}. ${g.note}` : g.note}
                        />
                      ))}
                    </div>
                  )}
                  <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
                    {items.map((a) => (
                      <AllergenRow key={a.id} allergen={a} on={ids.has(a.id)} onToggle={() => toggle(a.id)} coveredBy={coveredBy.get(a.id)} />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </fieldset>
  );
}

function AllergenRow({
  allergen,
  on,
  onToggle,
  coveredBy,
}: {
  allergen: ContactAllergen;
  on: boolean;
  onToggle: () => void;
  coveredBy?: string;
}) {
  const alsoListedAs = labelNames(allergen)
    .filter((t) => !allergen.name.toLowerCase().includes(t))
    .slice(0, 3);
  const hint = coveredBy && !on ? `Included via ${coveredBy}` : alsoListedAs.length > 0 ? `Also listed as ${alsoListedAs.join(", ")}` : undefined;
  return <CheckRow on={on} onToggle={onToggle} label={allergen.name} hint={hint} muted={!!coveredBy && !on} />;
}

function GroupSwitch({ on, onToggle, label, hint }: { on: boolean; onToggle: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-start gap-3 px-3.5 py-3 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{hint}</span>
      </span>
      <span aria-hidden className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function CheckRow({ on, onToggle, label, hint, muted }: { on: boolean; onToggle: () => void; label: string; hint?: string; muted?: boolean }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors",
        on ? "border-brand/50 bg-brand-soft" : muted ? "bg-muted/60" : "bg-card hover:bg-muted",
      )}
    >
      <input type="checkbox" className="sr-only" checked={on} onChange={onToggle} />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          on ? "border-primary bg-primary text-primary-foreground" : "bg-background",
        )}
      >
        {on && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}
