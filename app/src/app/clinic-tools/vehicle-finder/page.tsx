import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyTextButton } from "@/components/copy-text-button";
import { ALLERGEN_GROUPS, allergenLabel, getAllergen } from "@/db/contact-allergens";
import { POTENCY_LABEL, ROMAN, type PotencyClass } from "@/db/steroid-potency";
import { RX_GROUPS, rxGroupLabel } from "@/db/rx";
import { decodeImportCode } from "@/lib/avoid-import";
import { normalizeAvoidId } from "@/lib/avoid-shared";
import { canViewRxPage } from "@/lib/clinicians";
import { FEATURES } from "@/lib/feature-flags";
import { findVehicles, formWord, vehicleChartNote } from "@/lib/vehicle-finder";
import { loadVehicleRows } from "@/lib/vehicle-finder-data";

export const metadata: Metadata = {
  title: "Prescribe-safe finder",
  description: "Find topical prescriptions whose vehicle is free of a patient's contact allergens, from the FDA label of every listed product.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Search = { x?: string | string[]; a?: string; link?: string; g?: string; p?: string; f?: string };

const STEROID_CLASS_IDS = ["corticosteroid-class-a", "corticosteroid-class-b", "corticosteroid-class-c", "corticosteroid-class-d1", "corticosteroid-class-d2"];
const MAX_IDS = 40;

/** Selected avoid ids from the ticked boxes, a patient's import code, or a pasted avoid-list link. */
function selectedIds(s: Search): string[] {
  const ticked = (Array.isArray(s.x) ? s.x : (s.x ?? "").split(",")).map((x) => x.trim());
  let code = s.a;
  if (!code && s.link) {
    try {
      code = new URL(s.link.trim(), "https://x.invalid").searchParams.get("a") ?? undefined;
    } catch {
      code = undefined;
    }
  }
  const decoded = decodeImportCode(code);
  const fromCode = decoded.ok ? decoded.avoidIds : [];
  return [...new Set([...ticked, ...fromCode].flatMap((id) => normalizeAvoidId(id) ?? []))].slice(0, MAX_IDS);
}

export default async function VehicleFinderPage({ searchParams }: { searchParams: Promise<Search> }) {
  // Open to anyone (Michael, 2026-11-27): label facts, no sign-in. Still off
  // until FEATURE_RX_CATALOG is on, which also opens the /rx/[id] pages it links to.
  if (!FEATURES.RX_CATALOG) notFound();
  const s = await searchParams;
  const rxLinks = canViewRxPage();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Clinic tools"
        title="Prescribe-safe finder"
        description="Pick a patient's contact allergens and see which topical prescriptions list none of them, in the vehicle or the active, label by label. Free, no sign-in, and nothing about the patient is stored. Label facts to discuss with the prescriber, not a recommendation."
      />
      <Finder s={s} rxLinks={rxLinks} />
    </div>
  );
}

function Finder({ s, rxLinks }: { s: Search; rxLinks: boolean }) {
  const rows = loadVehicleRows();
  const ids = selectedIds(s);
  const potency = Number(s.p) >= 1 && Number(s.p) <= 7 ? Number(s.p) : undefined;
  const group = RX_GROUPS.some((g) => g.id === s.g && g.id !== "oral") ? s.g : undefined;
  const forms = [...new Set(rows.map((r) => formWord(r.dosageForm)))].sort();
  const form = forms.includes(s.f ?? "") ? s.f : undefined;

  // Offer the allergens the vehicles actually contain, most common first,
  // plus the steroid classes and the cross-reacting families.
  const freq = new Map<string, number>();
  for (const r of rows) for (const h of r.hits) freq.set(h, (freq.get(h) ?? 0) + 1);
  const common = [...freq.entries()]
    .filter(([id]) => !STEROID_CLASS_IDS.includes(id) && getAllergen(id) && id !== "mineral-uv-filters")
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
  const families = ALLERGEN_GROUPS.filter((g) => g.kind === "cross-reacting" && !g.id.includes("steroid")).map((g) => g.id);
  const choices: { title: string; ids: string[] }[] = [
    { title: "In prescription vehicles", ids: common },
    { title: "Corticosteroid classes (rules out the active too)", ids: STEROID_CLASS_IDS },
    { title: "Cross-reacting families", ids: families },
  ];
  const offered = new Set(choices.flatMap((c) => c.ids));
  const extra = ids.filter((id) => !offered.has(id));
  const name = (id: string) => allergenLabel(id) ?? ALLERGEN_GROUPS.find((g) => g.id === id)?.name ?? id;

  const result = ids.length > 0 ? findVehicles(rows, ids, { group, potency, form }) : null;
  const asOf = new Date().toISOString().slice(0, 10);
  const avoidNames = ids.map(name);

  return (
    <div className="space-y-8">
      <form method="get" className="space-y-5 rounded-2xl border bg-card p-5">
        <div className="space-y-2">
          <label htmlFor="link" className="text-sm font-medium">Patient&apos;s avoid-list link or QR (optional)</label>
          <input
            id="link"
            name="link"
            defaultValue={s.link ?? ""}
            placeholder="Paste the activelyskin.com/avoid/import link from their patch-test sheet"
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
          />
          {s.a && <input type="hidden" name="a" value={s.a} />}
        </div>
        {choices.map((c) => (
          <fieldset key={c.title} className="space-y-2">
            <legend className="text-sm font-medium">{c.title}</legend>
            <div className="flex flex-wrap gap-2">
              {[...c.ids, ...(c === choices[0] ? extra : [])].map((id) => (
                <label key={id} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                  <input type="checkbox" name="x" value={id} defaultChecked={ids.includes(id)} className="accent-[var(--brand)]" />
                  {name(id)}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Drug group" name="g" value={group} options={RX_GROUPS.filter((g) => g.id !== "oral").map((g) => [g.id, g.label])} />
          <Select label="Steroid potency" name="p" value={potency ? String(potency) : undefined} options={([1, 2, 3, 4, 5, 6, 7] as PotencyClass[]).map((c) => [String(c), POTENCY_LABEL[c]])} />
          <Select label="Vehicle" name="f" value={form} options={forms.map((f) => [f, f])} />
        </div>
        <Button type="submit" className="rounded-full">Find clean vehicles</Button>
      </form>

      {!result && <p className="text-sm text-muted-foreground">Pick at least one allergen, or paste the patient&apos;s avoid-list link.</p>}

      {result && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              {result.cleanGroups} of {result.groups.length} products have a label free of {avoidNames.length === 1 ? avoidNames[0] : `all ${avoidNames.length}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              Avoiding: {avoidNames.join(", ")}. {result.cleanLabels} of {result.labels} labels are clean. Generics from different labelers often use different vehicles, so
              the clean labeler is named; consider &ldquo;dispense as written&rdquo; when it matters. Label data as listed with the FDA; a label can change, and
              a trace below labeling thresholds isn&apos;t excluded.
            </p>
          </div>
          <ul className="space-y-3">
            {result.groups.map((g) => (
              <li key={g.key} className="space-y-3 rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {g.clean.length > 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> : <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden />}
                  <span className="font-semibold">{g.display}</span>
                  <Badge variant="outline">{rxGroupLabel(g.rxGroup)}</Badge>
                  {g.potency && <Badge variant="outline">Class {ROMAN[g.potency as PotencyClass]}</Badge>}
                  <span className="text-sm text-muted-foreground">
                    {g.clean.length} of {g.clean.length + g.blocked.length} labels clean
                  </span>
                </div>
                {g.clean.length > 0 && (
                  <ul className="space-y-2">
                    {g.clean.map((r) => (
                      <li key={r.id} className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1 text-sm">
                          <p>
                            {rxLinks ? (
                              <Link href={`/rx/${encodeURIComponent(r.id)}`} className="font-medium hover:underline">{r.brandName}</Link>
                            ) : (
                              <span className="font-medium">{r.brandName}</span>
                            )}
                            {r.labeler && <span className="text-muted-foreground"> · {r.labeler}</span>}
                            <span className="text-muted-foreground"> · NDC {r.id}</span>
                          </p>
                          <details>
                            <summary className="cursor-pointer text-xs text-muted-foreground">Vehicle ({r.names.length} inactive ingredients)</summary>
                            <p className="pt-1 text-xs [overflow-wrap:anywhere]">{r.names.join(", ")}</p>
                          </details>
                        </div>
                        <CopyTextButton text={vehicleChartNote(r, avoidNames, asOf)} label="Copy chart note" />
                      </li>
                    ))}
                  </ul>
                )}
                {g.blocked.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      {g.blocked.length} label{g.blocked.length === 1 ? "" : "s"} with a match
                    </summary>
                    <ul className="space-y-1 pt-2 text-sm">
                      {g.blocked.map((b) => (
                        <li key={b.row.id}>
                          <span className="font-medium">{b.row.brandName}</span>
                          {b.row.labeler && <span className="text-muted-foreground"> · {b.row.labeler}</span>}:{" "}
                          {b.conflicts.length > 0 && <span className="text-amber-700 dark:text-amber-400">contains {b.conflicts.join(", ")}</span>}
                          {b.mayContain.length > 0 && <span className="text-muted-foreground"> may contain {b.mayContain.join(", ")} (fragrance)</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Looking for over-the-counter options too?{" "}
            <Link href={`/browse?free=${encodeURIComponent(ids.join(","))}`} className="font-medium text-brand hover:underline">
              Browse OTC products free of the same list →
            </Link>
          </p>
        </section>
      )}
    </div>
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
