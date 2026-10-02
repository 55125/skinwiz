import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FEATURES } from "@/lib/feature-flags";
import { listRxProducts, rxDisplayName, type RxProduct } from "@/lib/rx-catalog";
import { RX_GROUPS } from "@/db/rx";
import { ROMAN, type PotencyClass } from "@/db/steroid-potency";

export const metadata: Metadata = {
  title: "Prescription skin medicines: reference",
  description: "What common prescription skin medicines are and how their FDA labels say they're used. Reference only: ask your dermatologist.",
  robots: { index: false, follow: false },
};

// Index of the Rx reference pages, one link per generic + strength + form.
// Flag-gated and noindex, like the pages themselves.
export default function RxIndexPage() {
  if (!FEATURES.RX_CATALOG) notFound();
  const rows = listRxProducts();
  const byGroup = new Map<string, Map<string, { name: string; id: string; potency: number | null }>>();
  for (const r of rows) {
    const g = byGroup.get(r.rxGroup ?? "other") ?? byGroup.set(r.rxGroup ?? "other", new Map()).get(r.rxGroup ?? "other")!;
    const name = rxDisplayName(r as RxProduct);
    // Brand-name (NDA) listing first when there is one, else the first seen.
    const existing = g.get(name);
    if (!existing || r.marketingCategory === "NDA") g.set(name, { name, id: existing && r.marketingCategory !== "NDA" ? existing.id : r.id, potency: r.steroidPotencyClass });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Reference"
        title="Prescription skin medicines"
        description="What each medicine is and how its FDA label says it's used. These are prescription only: this is reference material, not a recommendation, and never a substitute for your dermatologist."
      />
      {RX_GROUPS.map((g) => {
        const items = [...(byGroup.get(g.id)?.values() ?? [])].sort((a, b) => a.name.localeCompare(b.name));
        if (items.length === 0) return null;
        return (
          <section key={g.id} className="space-y-3" aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="text-xl font-semibold">
              {g.label} <span className="text-sm font-normal text-muted-foreground">{items.length}</span>
            </h2>
            <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {items.map((i) => (
                <li key={i.name}>
                  <Link href={`/rx/${encodeURIComponent(i.id)}`} className="hover:text-brand hover:underline">
                    {i.name}
                  </Link>
                  {i.potency && <span className="ml-2 text-xs text-muted-foreground">class {ROMAN[i.potency as PotencyClass]}</span>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
