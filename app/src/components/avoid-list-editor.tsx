"use client";

import { useMemo, useState, useTransition } from "react";
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
  type ContactAllergen,
} from "@/db/contact-allergens";
import { cn } from "@/lib/utils";

// Every name an allergen goes by, normalized once, so searching a patch-test
// sheet's wording ("Kathon CG", "Lyral", "wool alcohols") finds the entry.
const SEARCH_INDEX = CONTACT_ALLERGENS.map((a) => ({
  allergen: a,
  haystack: normalizeForAllergens([a.name, ...labelNames(a), ...(a.aka ?? [])].join(" | ")),
}));

export function AvoidListEditor({ initialIds }: { initialIds: string[] }) {
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set(initialIds));
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const res = await fetch("/api/avoid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...ids] }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  const groups = [
    { title: "Common preferences", items: FREE_FROM_CHECKS.filter((c) => c.category === "clean") },
    { title: "Skin type & lifestyle", items: FREE_FROM_CHECKS.filter((c) => c.category === "skin") },
  ];

  return (
    <div className="space-y-8">
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

      <div className="sticky bottom-4 flex items-center gap-3 rounded-full">
        <Button type="button" onClick={save} disabled={saved || isPending} className="rounded-full px-5 shadow-md">
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            `Save ${ids.size} ${ids.size === 1 ? "item" : "items"}`
          )}
        </Button>
        {ids.size === 0 && !saved && <p className="text-sm text-muted-foreground">Saving with nothing selected clears your list.</p>}
      </div>
    </div>
  );
}

function AllergenPicker({ ids, toggle }: { ids: Set<string>; toggle: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const q = normalizeForAllergens(query);
  const results = useMemo(() => (q.length >= 2 ? SEARCH_INDEX.filter((e) => e.haystack.includes(q)).map((e) => e.allergen) : []), [q]);
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
          <div className="space-y-2">
            <p className="text-sm font-medium">Families and patch-test mixes</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ALLERGEN_GROUPS.map((g) => (
                <CheckRow key={g.id} on={ids.has(g.id)} onToggle={() => toggle(g.id)} label={g.name} hint={g.note} />
              ))}
            </div>
          </div>

          <div className="divide-y rounded-xl border">
            {ALLERGEN_SECTIONS.map((section) => {
              const items = CONTACT_ALLERGENS.filter((a) => a.section === section.id);
              const count = items.filter((a) => ids.has(a.id)).length;
              return (
                <details key={section.id} className="group/sec" open={count > 0 ? true : undefined}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <span>
                      {section.title} <span className="text-muted-foreground">({items.length})</span>
                      {count > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] text-primary-foreground">{count}</span>}
                    </span>
                  </summary>
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
