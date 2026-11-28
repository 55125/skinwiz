import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertOctagon, ChevronLeft, ExternalLink, Info, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RxLabelSection } from "@/components/rx-label-section";
import { getRxProduct } from "@/lib/queries";
import { getRxLabel, listRxProducts, rxDisplayName, rxVehicleMap } from "@/lib/rx-catalog";
import { variantKey } from "@/lib/rx-browse";
import { compareMakers, type MakerComparison } from "@/lib/rx-makers";
import { allergenLabel } from "@/db/contact-allergens";
import { innermostPackage, marketingCategoryLabel, rxGroupLabel, rxPriceCheckUrl } from "@/db/rx";
import { POTENCY_LABEL, type PotencyClass } from "@/db/steroid-potency";
import { displayManufacturer } from "@/lib/format";
import { SITE_NAME } from "@/lib/brand";
import { canViewRxPage } from "@/lib/clinicians";
import { DAILYMED_IMAGE_CAPTION, isDailymedImageUrl, productImageAlt, thumbnailUrl } from "@/lib/image-urls";

// Prescription reference page: what the FDA label says, never a
// recommendation. Open to anyone with the link, a search or a barcode while
// FEATURE_RX_CATALOG is on (lib/clinicians.ts canViewRxPage; 404 otherwise);
// so is the /rx browse. Noindex, no
// JSON-LD, no affiliate or buy link -- only a plain "check prices" search.

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = canViewRxPage() ? getRxProduct(decodeURIComponent(id)) : undefined;
  if (!p) return { robots: { index: false, follow: false } };
  return {
    title: `${rxDisplayName(p)} (prescription)`,
    description: `What ${p.genericName ?? p.brandName} is and how its FDA label says it's used. Prescription only: ask your dermatologist.`,
    robots: { index: false, follow: false },
  };
}

export default async function RxProductPage({ params }: { params: Promise<{ id: string }> }) {
  if (!canViewRxPage()) notFound();
  const { id } = await params;
  const p = getRxProduct(decodeURIComponent(id));
  if (!p) notFound();

  const label = getRxLabel(p.splSetId);
  const potency = p.steroidPotencyClass as PotencyClass | null;
  const packages = p.packageDescription ? innermostPackage(p.packageDescription) : null;
  const generic = p.genericName ?? p.brandName;
  // Other strengths and forms of the same generic, one link each.
  const siblings = new Map<string, { id: string; name: string }>();
  const all = listRxProducts();
  // Every maker's listing of this same medicine, strength and vehicle, with its inactive ingredients.
  const vehicles = rxVehicleMap();
  const key = variantKey(p);
  const sameVariant = all.filter((r) => !r.canonicalId && (r.id === p.id || variantKey(r) === key));
  const makers = compareMakers(
    sameVariant.map((r) => ({
      id: r.id,
      labeler: r.manufacturer ? displayManufacturer(r.manufacturer) : r.brandName,
      brandName: r.brandName,
      names: vehicles.get(r.id)?.names ?? null,
      allergenHits: vehicles.get(r.id)?.allergenHits ?? null,
    })),
  );
  for (const r of all) {
    if (r.id === p.id || r.genericName !== p.genericName) continue;
    const name = rxDisplayName(r);
    if (name !== rxDisplayName(p) && !siblings.has(name)) siblings.set(name, { id: r.id, name });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <Link href="/rx" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Prescription medicines
      </Link>

      {/* Package label image (DailyMed, via the image sync) helps match the
          product a patient brings in; absent until synced. */}
      {p.imageUrl && (
        <figure className="float-right ml-6 w-40 space-y-1 sm:w-56">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-rendered self-hosted WebP; next/image adds nothing here */}
            <img src={thumbnailUrl(p.imageUrl)} alt={productImageAlt(p)} width={320} height={320} className="h-full w-full object-contain p-2" decoding="async" />
          </div>
          {isDailymedImageUrl(p.imageUrl) && <figcaption className="text-center text-[11px] text-muted-foreground">{DAILYMED_IMAGE_CAPTION}</figcaption>}
        </figure>
      )}

      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">{rxGroupLabel(p.rxGroup)} · prescription reference</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">{rxDisplayName(p)}</h1>
        <p className="text-muted-foreground">
          {p.brandName}
          {p.manufacturer && <> · {displayManufacturer(p.manufacturer)}</>}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Prescription only</Badge>
          {potency && <Badge variant="outline">{POTENCY_LABEL[potency]}</Badge>}
          {p.route && <Badge variant="outline">{p.route.toLowerCase()}</Badge>}
        </div>
      </header>

      <div className="flex gap-3 rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 text-sm">
        <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div className="space-y-1">
          <p className="font-semibold">Prescription only: ask your dermatologist.</p>
          <p className="text-foreground/80">
            This page summarizes what the FDA label says about {generic}. It isn&apos;t a recommendation for you: whether it&apos;s right
            for your skin, at what strength and how often, is a decision for a clinician who has examined you.
          </p>
        </div>
      </div>

      {p.informationalOnly && (
        <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p>
            <span className="font-semibold">Reference only.</span> Isotretinoin is dispensed only through the FDA&apos;s iPLEDGE REMS
            program, with pregnancy testing and monthly visits. Your dermatologist manages it directly; it is never part of a{" "}
            {SITE_NAME} plan or handout.
          </p>
        </div>
      )}

      {label?.boxedWarning && (
        <section className="space-y-2 rounded-2xl border-2 border-red-600 bg-red-50 p-5 dark:bg-red-950/30" aria-labelledby="boxed">
          <h2 id="boxed" className="flex items-center gap-2 text-lg font-bold text-red-800 dark:text-red-300">
            <AlertOctagon className="h-5 w-5" /> Boxed warning
          </h2>
          <p className="text-xs text-red-900/80 dark:text-red-200/80">The FDA&apos;s most serious label warning, quoted from the label.</p>
          <div className="space-y-2 text-sm leading-relaxed">
            {label.boxedWarning.split(/\n+/).map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <Fact label="Strength">
          {p.strengthText ?? "Not listed"}
          {p.rxStrengthCheck?.status === "corrected" && (
            <span className="block text-xs text-muted-foreground">
              Corrected: the FDA drug listing says &ldquo;{p.rxStrengthCheck.listed}&rdquo;, a unit slip. FDA approved {p.rxStrengthCheck.approved} for this
              product{p.rxStrengthCheck.source.includes("label") ? ", and the label text agrees" : ""}.
            </span>
          )}
          {p.rxStrengthCheck?.status === "unverified" && (
            <span className="block text-xs text-amber-700 dark:text-amber-400">
              We couldn&apos;t confirm the listed strength (&ldquo;{p.rxStrengthCheck.listed}&rdquo;) against the FDA approval ({p.rxStrengthCheck.approved}). Check the package label.
            </span>
          )}
        </Fact>
        <Fact label="Form">{(p.dosageForm ?? "Not listed").toLowerCase()}</Fact>
        {potency && (
          <Fact label="Steroid potency">
            {POTENCY_LABEL[potency]}
            <span className="block text-xs text-muted-foreground">US 7-class system (I strongest, VII mildest).</span>
          </Fact>
        )}
        <Fact label="Approval">{marketingCategoryLabel(p.marketingCategory) ?? "Not listed"}</Fact>
        {packages && <Fact label="Package (one listed size)">{packages}</Fact>}
        <Fact label="NDC">{p.id}</Fact>
      </section>

      <div className="space-y-3">
        <RxLabelSection title="What it's for" text={label?.indications} open />
        <RxLabelSection title="How it's typically used" text={label?.dosageAndAdministration} open />
        <RxLabelSection title="Pregnancy" text={label?.pregnancy} />
        <RxLabelSection title="Breastfeeding" text={label?.lactation} />
        <RxLabelSection title="Who shouldn't use it" text={label?.contraindications} />
        <RxLabelSection title="Warnings and precautions" text={label?.warnings} />
      </div>

      <section className="space-y-2 rounded-2xl border bg-card p-4 text-sm">
        <h2 className="font-semibold">Cost</h2>
        <p className="text-muted-foreground">
          Prescription prices vary a lot by pharmacy and coupon. Your prescriber sends the prescription; you can compare cash prices
          before you fill it.
        </p>
        <a
          href={rxPriceCheckUrl(generic)}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
        >
          Check prices <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <p className="text-xs text-muted-foreground">A plain search on GoodRx. Not an affiliate link: we earn nothing from it.</p>
      </section>

      {makers.makers.some((m) => m.names) && <MakersSection c={makers} currentId={p.id} display={rxDisplayName(p)} />}

      {siblings.size > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Other strengths and forms</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {[...siblings.values()].slice(0, 24).map((s) => (
              <li key={s.id}>
                <Link href={`/rx/${encodeURIComponent(s.id)}`} className="rounded-full border px-3 py-1 hover:border-brand">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Label text is quoted from the manufacturer&apos;s FDA prescribing information
        {p.splSetId && (
          <>
            {" "}
            (
            <a
              href={`https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${p.splSetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              full label on DailyMed
            </a>
            )
          </>
        )}
        . Sections are shortened for length. Never start, stop or change a prescription medicine without your prescriber.
      </p>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  );
}

function MakersSection({ c, currentId, display }: { c: MakerComparison; currentId: string; display: string }) {
  const name = (id: string) => (id === "fragrance" ? "fragrance" : (allergenLabel(id) ?? id));
  const makerOf = new Map(c.makers.map((m) => [m.id, m.labeler]));
  const known = c.makers.filter((m) => m.names).length;
  const several = c.makers.length > 1;
  const labelers = new Set(c.makers.map((m) => m.labeler)).size;
  const who = (ids: string[]) => [...new Set(ids.map((id) => makerOf.get(id)))].join(", ");
  return (
    <section id="makers" className="scroll-mt-20 space-y-4 rounded-2xl border bg-card p-4" aria-labelledby="makers-h">
      <div className="space-y-1">
        <h2 id="makers-h" className="font-semibold">{several ? "Inactive ingredients by maker" : "Inactive ingredients"}</h2>
        <p className="text-sm text-muted-foreground">
          {several
            ? `${c.makers.length} listings of ${display.toLowerCase()} from ${labelers} maker${labelers === 1 ? "" : "s"}. The active is the same, but each maker picks its own base, so the inactive ingredients, and the contact allergens in them, can differ. A pharmacy may fill any of them unless the prescription says "dispense as written".`
            : "What this label lists besides the active ingredient."}
        </p>
      </div>

      {several && c.allergens.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Allergens that differ between makers</h3>
          <ul className="space-y-1.5 text-sm">
            {c.allergens.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{name(a.id)}</span>
                <span className="text-amber-800 dark:text-amber-300"> in {who(a.inIds)}</span>
                <span className="text-muted-foreground">; not in {who(a.notInIds)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {several && known > 1 && c.allergens.length === 0 && (
        <p className="text-sm">Every maker with a list on file lists the same contact allergens{c.makers[0].allergenHits?.length ? "" : " (none)"}.</p>
      )}

      <ul className="divide-y text-sm">
        {c.makers.map((m) => (
          <li key={m.id} className="space-y-1 py-2.5">
            <p>
              {m.id === currentId ? (
                <span className="font-medium">{m.labeler}</span>
              ) : (
                <Link href={`/rx/${encodeURIComponent(m.id)}#makers`} className="font-medium hover:underline">{m.labeler}</Link>
              )}
              <span className="text-muted-foreground"> · {m.brandName} · NDC {m.id}{m.id === currentId ? " · this page" : ""}</span>
            </p>
            {!m.names ? (
              <p className="text-xs text-muted-foreground">No inactive ingredient list on file.</p>
            ) : (
              <>
                <p className="flex flex-wrap gap-1.5">
                  {(m.allergenHits ?? []).length === 0 ? (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">No common contact allergen listed</span>
                  ) : (
                    m.allergenHits!.map((id) => (
                      <Badge key={id} variant="outline" className="font-normal">{name(id)}</Badge>
                    ))
                  )}
                </p>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    {several && known > 1 ? `Only in this version (${m.distinctive.length})` : `All ${m.names.length} inactive ingredients`}
                  </summary>
                  <p className="pt-1 text-xs [overflow-wrap:anywhere]">{(several && known > 1 ? m.distinctive : m.names).join(", ") || "Nothing beyond the shared list."}</p>
                </details>
              </>
            )}
          </li>
        ))}
      </ul>

      {several && known > 1 && c.shared.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">In every version ({c.shared.length})</summary>
          <p className="pt-1 text-xs [overflow-wrap:anywhere]">{c.shared.join(", ")}</p>
        </details>
      )}
      <p className="text-xs text-muted-foreground">
        From each maker&apos;s FDA label. A label can change, and a trace below labeling thresholds isn&apos;t excluded. Checking a patient&apos;s patch-test list?{" "}
        <Link href="/clinic-tools/vehicle-finder" className="font-medium text-brand hover:underline">Prescribe-safe finder →</Link>
      </p>
    </section>
  );
}
