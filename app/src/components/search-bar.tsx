"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Suggestion = { key: string; kind: "ingredient" | "product" | "all"; label: string; sub?: string | null; href: string };

type SuggestResponse = {
  ingredients: { id: string; name: string; productCount: number }[];
  products: { id: string; brandName: string; manufacturer: string | null }[];
};

const MIN_CHARS = 2;

export function SearchBar({ defaultValue, large }: { defaultValue?: string; large?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(defaultValue ?? "");
  const [data, setData] = useState<{ q: string; res: SuggestResponse } | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const searchable = trimmed.length >= MIN_CHARS;

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!res.ok) return;
        setData({ q: trimmed, res: await res.json() });
      } catch {
        // aborted by a newer keystroke, or offline: keep whatever is showing
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, searchable]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Suggestions for a stale query (e.g. after backspacing below MIN_CHARS)
  // are never shown -- only a response that matches what is typed right now.
  const current = searchable && data?.q === trimmed ? data.res : null;
  const suggestions: Suggestion[] = current
    ? [
        ...current.ingredients.map((i): Suggestion => ({
          key: `i:${i.id}`,
          kind: "ingredient",
          label: i.name,
          sub: `Ingredient · ${i.productCount.toLocaleString()} products`,
          href: `/ingredient/${encodeURIComponent(i.id)}`,
        })),
        ...current.products.map((p): Suggestion => ({
          key: `p:${p.id}`,
          kind: "product",
          label: p.brandName,
          sub: p.manufacturer,
          href: `/product/${encodeURIComponent(p.id)}`,
        })),
      ]
    : [];
  if (suggestions.length > 0) {
    suggestions.push({
      key: "all",
      kind: "all",
      label: `See all results for “${trimmed}”`,
      href: `/search?q=${encodeURIComponent(trimmed)}`,
    });
  }
  const expanded = open && suggestions.length > 0;
  const activeIndex = highlight >= 0 && highlight < suggestions.length ? highlight : -1;

  function go(s: Suggestion) {
    setOpen(false);
    setHighlight(-1);
    router.push(s.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const last = suggestions.length - 1;
      setHighlight((h) => (e.key === "ArrowDown" ? (h >= last ? 0 : h + 1) : h <= 0 ? last : h - 1));
    } else if (e.key === "Enter" && expanded && activeIndex >= 0) {
      e.preventDefault();
      go(suggestions[activeIndex]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setHighlight(-1);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form
        action="/search"
        method="GET"
        role="search"
        className={cn(
          "relative flex w-full items-center",
          large && "rounded-full border bg-card p-1.5 shadow-lg shadow-foreground/5 focus-within:ring-3 focus-within:ring-ring/30",
        )}
        onSubmit={() => setOpen(false)}
      >
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
            large ? "left-5" : "left-3",
          )}
        />
        <Input
          type="text"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-label="Search products or ingredients"
          placeholder="Search products or ingredients — e.g. niacinamide, CeraVe, sunscreen"
          className={cn(
            large
              ? "h-11 flex-1 rounded-full border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
              : "h-10 rounded-lg pl-10",
          )}
          autoComplete="off"
        />
        {large && (
          <Button type="submit" size="lg" className="h-11 shrink-0 rounded-full px-6">
            Search
          </Button>
        )}
      </form>

      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl text-left border bg-popover p-1.5 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => go(s)}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm",
                i === activeIndex && "bg-muted",
                s.kind === "all" && "text-muted-foreground",
              )}
            >
              {s.kind === "ingredient" ? (
                <FlaskConical className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              )}
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate", s.kind !== "all" && "font-medium")}>{s.label}</span>
                {s.sub && <span className="block truncate text-xs text-muted-foreground">{s.sub}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
