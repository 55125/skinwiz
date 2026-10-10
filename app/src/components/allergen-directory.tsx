"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AvoidToggleButton } from "@/components/avoid-toggle-button";
import { ALLERGEN_SECTIONS, CONTACT_ALLERGENS, labelNames, normalizeForAllergens } from "@/db/contact-allergens";

// The full allergen list, grouped by section, with a search over every name
// each allergen goes by (patch-test, INCI and trade names).
export function AllergenDirectory({ counts, avoidIds }: { counts: Record<string, number>; avoidIds: string[] }) {
  const [query, setQuery] = useState("");
  const q = normalizeForAllergens(query);
  const matches = (names: string[]) => q.length < 2 || normalizeForAllergens(names.join(" | ")).includes(q);

  const sections = ALLERGEN_SECTIONS.map((section) => ({
    section,
    items: CONTACT_ALLERGENS.filter((a) => a.section === section.id && matches([a.name, ...labelNames(a), ...(a.aka ?? [])])),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="space-y-8">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any name: Kathon CG, Lyral, wool alcohols, benzophenone-3…"
          className="h-11 pl-9"
          aria-label="Search contact allergens"
        />
      </div>

      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Nothing on our list matches &ldquo;{query}&rdquo;. No list is exhaustive: check the full ingredient list of
          anything you buy for it by name, and ask your dermatologist about related ingredients.
        </p>
      )}

      {sections.map(({ section, items }) => (
        <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">{section.intro}</p>
          </div>
          <ul className="divide-y rounded-2xl border bg-card">
            {items.map((a) => {
              const names = labelNames(a).filter((n) => n.toLowerCase() !== a.name.toLowerCase());
              const n = counts[a.id] ?? 0;
              return (
                <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/allergens/${a.id}`} className="font-medium [overflow-wrap:anywhere] hover:underline">
                        {a.name}
                      </Link>
                      {a.rare && <Badge variant="secondary">rarely relevant</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {n > 0 ? `in ${n.toLocaleString()} products` : "not in our catalog"}
                      </span>
                    </p>
                    {names.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">On labels:</span> {names.join(", ")}
                      </p>
                    )}
                    {a.note && <p className="text-xs leading-relaxed text-muted-foreground">{a.note}</p>}
                  </div>
                  <AvoidToggleButton id={a.id} avoidIds={avoidIds} />
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground">Sources: {section.sources}</p>
        </section>
      ))}
    </div>
  );
}
