"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { ProductPicker } from "@/components/product-picker";

type P = { id: string; brandName: string; manufacturer: string | null };

const STORAGE_KEY = "sw_reactions";
const MAX = 15;

function query(reacted: P[], fine: P[], bag: boolean): string {
  const p = new URLSearchParams();
  if (reacted.length) p.set("r", reacted.map((x) => x.id).join(","));
  if (fine.length) p.set("f", fine.map((x) => x.id).join(","));
  if (bag) p.set("bag", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

// The two product lists. They live in the URL (so the page can be shared
// with a dermatologist) and in this browser's storage (so coming back picks
// up where you left off); nothing is sent to us beyond the page request.
export function ReactionBuilder({ reacted, fine, bag }: { reacted: P[]; fine: P[]; bag: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  // Restore a saved list when the page opens empty.
  useEffect(() => {
    if (reacted.length || fine.length) {
      try {
        localStorage.setItem(STORAGE_KEY, query(reacted, fine, false));
      } catch {
        // storage blocked: the URL still holds the lists
      }
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.startsWith("?")) {
        const p = new URLSearchParams(saved);
        if (bag) p.set("bag", "1");
        router.replace(`/reactions?${p.toString()}`, { scroll: false });
      }
    } catch {
      // nothing saved
    }
  }, [reacted, fine, bag, router]);

  function go(r: P[], f: P[]) {
    if (!r.length && !f.length) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    startTransition(() => router.replace(`/reactions${query(r, f, bag)}`, { scroll: false }));
  }

  const add = (list: "r" | "f") => (p: P | null) => {
    if (!p) return;
    const r = reacted.filter((x) => x.id !== p.id);
    const f = fine.filter((x) => x.id !== p.id);
    if (list === "r") go([...r, p].slice(0, MAX), f);
    else go(r, [...f, p].slice(0, MAX));
  };
  const remove = (id: string) => go(reacted.filter((x) => x.id !== id), fine.filter((x) => x.id !== id));

  return (
    <div className="grid gap-4 md:grid-cols-2 print:hidden" aria-busy={busy || undefined}>
      <ListBox
        title="Products I reacted to"
        hint="Rash, itching, burning or swelling after using it."
        icon={<CircleAlert className="h-4 w-4 text-amber-600" aria-hidden />}
        items={reacted}
        onAdd={add("r")}
        onRemove={remove}
        label="Add a product you reacted to"
      />
      <ListBox
        title="Products I use without trouble"
        hint="These rule ingredients out, so add as many as you can."
        icon={<CircleCheck className="h-4 w-4 text-emerald-600" aria-hidden />}
        items={fine}
        onAdd={add("f")}
        onRemove={remove}
        label="Add a product you use without trouble"
      />
    </div>
  );
}

function ListBox({
  title,
  hint,
  icon,
  items,
  onAdd,
  onRemove,
  label,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  items: P[];
  onAdd: (p: P | null) => void;
  onRemove: (id: string) => void;
  label: string;
}) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="flex items-center gap-1.5 font-semibold">
          {icon} {title}
        </h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="font-medium">{p.brandName}</span>
                {p.manufacturer && <span className="text-muted-foreground"> · {p.manufacturer}</span>}
              </span>
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${p.brandName}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length < MAX && <ProductPicker key={items.length} selected={null} onSelect={onAdd} size="field" label={label} placeholder="Search by name, brand or barcode" />}
    </section>
  );
}
