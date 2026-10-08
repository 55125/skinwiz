"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HandoutCategory } from "@/db/handout-templates";

export type LibraryItem = {
  id: string;
  name: string;
  summary: string;
  category: HandoutCategory;
  draft: boolean;
  sections: number;
  steps: number;
};

// The handout library as a searchable, category-tabbed list. Shared by the
// public clinic-tools page (preview links) and the clinician dashboard
// (straight into the builder). Items are plain data so the template text
// isn't shipped to the browser.
export function HandoutLibrary({
  items,
  categories,
  useHref,
  previewHref,
}: {
  items: LibraryItem[];
  categories: { id: HandoutCategory; name: string; blurb: string }[];
  useHref: string; // "/clinicians/handouts/new?template=" + id
  previewHref?: string; // "/clinic-tools/handouts/" + id
}) {
  const [cat, setCat] = useState<HandoutCategory | "all">("all");
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter(
      (t) => (cat === "all" || t.category === cat) && words.every((w) => `${t.name} ${t.summary}`.toLowerCase().includes(w)),
    );
  }, [items, cat, q]);
  const count = (id: HandoutCategory) => items.filter((t) => t.category === id).length;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search handouts: wound care, Mohs, molluscum, filler…"
          className="pl-9"
          aria-label="Search handouts"
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Handout categories">
        {[{ id: "all" as const, name: "All", n: items.length }, ...categories.map((c) => ({ id: c.id, name: c.name, n: count(c.id) }))].map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              cat === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {c.name} <span className="opacity-70">{c.n}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          Nothing matches. Start a blank handout and write your own.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {shown.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
              <div className="space-y-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs leading-snug text-muted-foreground">{t.summary}</p>
              </div>
              <div className="mt-auto flex items-center gap-3 text-xs">
                <Link href={`${useHref}${t.id}`} className="font-medium text-brand hover:underline">
                  Use and customize →
                </Link>
                {previewHref && (
                  <Link href={`${previewHref}${t.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
                    Preview
                  </Link>
                )}
                <span className="ml-auto text-muted-foreground">
                  {[t.sections > 0 && "info", t.steps > 0 && `${t.steps} step${t.steps === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
