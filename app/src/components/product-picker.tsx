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
}: {
  selected: ProductResult | null;
  onSelect: (product: ProductResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.products);
        setOpen(true);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <Check className="h-3 w-3 text-emerald-600" />
        <span className="text-muted-foreground">Linked: {selected.brandName}</span>
        <button type="button" onClick={() => onSelect(null)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Search className="h-3 w-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Link a product from our catalog (optional)"
          className="w-full border-0 border-b border-dashed bg-transparent p-0 text-xs outline-none focus:border-foreground"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-w-sm rounded-md border bg-popover shadow-md">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setQuery("");
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-muted"
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
