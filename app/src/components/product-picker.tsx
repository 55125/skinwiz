"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";

type ProductResult = { id: string; brandName: string; manufacturer: string | null };

// Optional per-step product link for the routine form -- a step can name a
// product without ever using this (a brand we don't carry, or something
// that isn't a single product at all), so this is additive to the existing
// free-text description, never a replacement for it.
export function ProductPicker({
  selected,
  onSelect,
  label = "Link a product from our catalog (optional)",
  placeholder = label,
  size = "inline",
}: {
  selected: ProductResult | null;
  onSelect: (product: ProductResult | null) => void;
  /** Accessible name for the search box (the routine form's default says it's optional). */
  label?: string;
  placeholder?: string;
  /** "field": a full-size search box, for pages where picking is the point (Compare). */
  size?: "inline" | "field";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchable = query.trim().length >= 2;
  const visibleResults = searchable ? results : [];

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setResults(data.products);
          setOpen(true);
        }
      } catch {
        // aborted by a newer keystroke, or a network error: keep prior results
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [query, searchable]);

  const field = size === "field";
  if (selected) {
    return (
      <div className={field ? "flex min-h-10 items-center gap-1.5 rounded-xl border bg-background px-3 text-sm" : "flex items-center gap-1 text-xs"}>
        <Check className={field ? "h-4 w-4 text-emerald-600" : "h-3 w-3 text-emerald-600"} aria-hidden />
        <span className={field ? "min-w-0 flex-1 truncate font-medium" : "text-muted-foreground"}>
          {field ? selected.brandName : `Linked: ${selected.brandName}`}
        </span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label={`Unlink ${selected.brandName}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={
          field
            ? "flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm focus-within:ring-2 focus-within:ring-ring"
            : "flex items-center gap-1.5 text-xs text-muted-foreground"
        }
      >
        <Search className={field ? "h-4 w-4 text-muted-foreground" : "h-3 w-3"} aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => visibleResults.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          aria-label={label}
          className={
            field
              ? "w-full border-0 bg-transparent p-0 text-sm outline-none"
              : "w-full border-0 border-b border-dashed bg-transparent p-0 text-xs outline-none focus:border-foreground"
          }
        />
      </div>
      {open && visibleResults.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-w-sm rounded-md border bg-popover shadow-md">
          {visibleResults.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setQuery("");
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left hover:bg-muted ${field ? "text-sm" : "text-xs"}`}
              >
                <div className="font-medium">{p.brandName}</div>
                {p.manufacturer && <div className="text-muted-foreground">{p.manufacturer}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
