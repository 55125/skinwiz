import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listRxProducts, rxVehicleMap } from "@/lib/rx-catalog";
import { allergenLabel } from "@/db/contact-allergens";
import { browseMedicines, type BrowseMedicine } from "@/lib/rx-browse";
import { formWord } from "@/lib/vehicle-finder";
import { RX_GROUPS } from "@/db/rx";
import { POTENCY_LABEL, ROMAN, type PotencyClass } from "@/db/steroid-potency";
import { canViewRxPage } from "@/lib/clinicians";

// Flag read per request (a static page would bake in the build-time value).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prescription skin medicines",
  description: "Browse prescription skin medicines by what they are: strengths, vehicles and brands from each FDA label. Reference only: ask your dermatologist.",
  robots: { index: false, follow: false },
};

type Search = { q?: string; g?: string; f?: string; p?: string };

// Prescription browse, by medicine (lib/rx-browse.ts), open to everyone while
// FEATURE_RX_CATALOG is on, like the /rx/[id] pages it links to. Noindex,
// not in the sitemap or the main nav, never mixed into /browse: reached from
// the "Prescription medicines" section of /search, an /rx page's back link
// and the clinic tools. No prices, photos, scores or buy links.
export default async function RxIndexPage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!canViewRxPage()) notFound();
  const s = await searchParams;
  const vehicles = rxVehicleMap();
  const rows = listRxProducts()
    .filter((r) => !r.canonicalId)
    .map((r) => ({ ...r, allergenHits: vehicles.get(r.id)?.allergenHits ?? null }));
  const group = RX_GROUPS.some((g) => g.id === s.g) ? s.g : undefined;
  const forms = [...new Set(rows.map((r) => formWord(r.dosageForm)))].sort();
  const form = forms.includes(s.f ?? "") ? s.f : undefined;
  const potency = Number(s.p) >= 1 && Number(s.p) <= 7 ? Number(s.p) : undefined;
  const q = (s.q ?? "").slice(0, 60);
  const meds = browseMedicines(rows, { group, form, potency, q });
  const filtered = Boolean(group || form || potency || q.trim());

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Reference"
        title="Prescription skin medicines"
        description="What each medicine is, the strengths and vehicles it comes in, and what its FDA label says. Prescription only: nothing here is sold or recommended, and whether one suits your skin is a decision for your dermatologist."
      />

      <form method="get" className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_repeat(3,10rem)_auto] sm:items-end">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Medicine or brand</span>
          <input name="q" defaultValue={q} placeholder="tretinoin, Retin-A, clobetasol…" className="h-10 w-full rounded-xl border bg-background px-3 text-sm" />
        </label>
        <Select label="Group" name="g" value={group} options={RX_GROUPS.map((g) => [g.id, g.label])} />
        <Select label="Vehicle" name="f" value={form} options={forms.map((f) => [f, f])} />
        <Select label="Steroid potency" name="p" value={potency ? String(potency) : undefined} options={([1, 2, 3, 4, 5, 6, 7] as PotencyClass[]).map((c) => [String(c), POTENCY_LABEL[c]])} />
        <Button type="submit" className="rounded-full">Show</Button>
      </form>

      <p className="flex gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
        <span>
          {meds.length} medicine{meds.length === 1 ? "" : "s"}
          {filtered && (
            <>
              {" "}
              ·{" "}
              <Link href="/rx" className="font-medium text-brand hover:underline">clear filters</Link>
            </>
          )}
          . Each strength opens its FDA label summary. Steroids are listed strongest first (US classes I to VII). Prescribing around a patch-test result?{" "}
          <Link href="/clinic-tools/vehicle-finder" className="font-medium text-brand hover:underline">Prescribe-safe finder →</Link>
        </span>
      </p>

      {RX_GROUPS.map((g) => {
        const items = meds.filter((m) => m.rxGroup === g.id);
        if (items.length === 0) return null;
        return (
          <section key={g.id} className="space-y-3" aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="text-xl font-semibold">
              {g.label} <span className="text-sm font-normal text-muted-foreground">{items.length}</span>
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((m) => (
                <MedicineCard key={m.key} m={m} />
              ))}
            </ul>
          </section>
        );
      })}

      {meds.length === 0 && <p className="text-sm text-muted-foreground">No prescription medicine matches. Try fewer filters.</p>}
    </div>
  );
}

const MAX_CHIPS = 12;

function MedicineCard({ m }: { m: BrowseMedicine }) {
  const shown = m.variants.slice(0, MAX_CHIPS);
  return (
    <li className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{m.name}</span>
          {m.potency && (
            <Badge variant="outline">
              Class {ROMAN[m.potency[0] as PotencyClass]}
              {m.potency[1] !== m.potency[0] && `–${ROMAN[m.potency[1] as PotencyClass]}`}
            </Badge>
          )}
          {m.informationalOnly && <Badge variant="outline">iPLEDGE program</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {m.forms.join(", ")} · {m.labelers} labeler{m.labelers === 1 ? "" : "s"}
          {m.brands.length > 0 && ` · brand${m.brands.length === 1 ? "" : "s"}: ${m.brands.slice(0, 4).join(", ")}${m.brands.length > 4 ? "…" : ""}`}
        </p>
        {m.varies.length > 0 && (
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Inactive ingredients vary by maker: some versions list {listNames(m.varies.map((id) => (allergenLabel(id) ?? id).replace(/^./, (c) => c.toLowerCase())))}, others don&apos;t.
            Strengths marked * differ; open one to compare makers.
          </p>
        )}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {shown.map((v) => (
          <li key={v.id}>
            <Chip v={v} />
          </li>
        ))}
      </ul>
      {m.variants.length > MAX_CHIPS && (
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">{m.variants.length - MAX_CHIPS} more strengths and vehicles</summary>
          <ul className="flex flex-wrap gap-1.5 pt-2">
            {m.variants.slice(MAX_CHIPS).map((v) => (
              <li key={v.id}>
                <Chip v={v} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function Chip({ v }: { v: BrowseMedicine["variants"][number] }) {
  return (
    <Link
      href={`/rx/${encodeURIComponent(v.id)}${v.varies.length ? "#makers" : ""}`}
      className="inline-block rounded-full border px-2.5 py-0.5 text-xs hover:border-brand/50 hover:text-brand"
      title={[v.potency ? POTENCY_LABEL[v.potency as PotencyClass] : "", v.varies.length ? "Inactive ingredients differ between makers" : ""].filter(Boolean).join(". ") || undefined}
    >
      {v.label}
      {v.varies.length > 0 && <span aria-label="inactive ingredients differ between makers">*</span>}
    </Link>
  );
}

function Select({ label, name, value, options }: { label: string; name: string; value?: string; options: [string, string][] }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="h-10 w-full rounded-xl border bg-background px-3 text-sm">
        <option value="">Any</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function listNames(names: string[]): string {
  const shown = names.slice(0, 3);
  const more = names.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.length > 1 ? `${shown.slice(0, -1).join(", ")} or ${shown.at(-1)}` : shown[0];
}
