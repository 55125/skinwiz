import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertOctagon, ChevronLeft, ExternalLink, Info, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RxLabelSection } from "@/components/rx-label-section";
import { getRxProduct } from "@/lib/queries";
import { getRxLabel, listRxProducts, rxDisplayName } from "@/lib/rx-catalog";
import { innermostPackage, marketingCategoryLabel, rxGroupLabel, rxPriceCheckUrl } from "@/db/rx";
import { POTENCY_LABEL, type PotencyClass } from "@/db/steroid-potency";
import { displayManufacturer } from "@/lib/format";
import { SITE_NAME } from "@/lib/brand";
import { canViewRxReference } from "@/lib/clinicians";
import { DAILYMED_IMAGE_CAPTION, isDailymedImageUrl, productImageAlt, thumbnailUrl } from "@/lib/image-urls";

// Prescription reference page: what the FDA label says, never a
// recommendation. Verified clinicians only (lib/clinicians.ts canViewRxReference;
// 404 for everyone else), noindex, no
// JSON-LD, no affiliate or buy link -- only a plain "check prices" search.

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = (await canViewRxReference()) ? getRxProduct(decodeURIComponent(id)) : undefined;
  if (!p) return { robots: { index: false, follow: false } };
  return {
    title: `${rxDisplayName(p)} (prescription)`,
    description: `What ${p.genericName ?? p.brandName} is and how its FDA label says it's used. Prescription only: ask your dermatologist.`,
    robots: { index: false, follow: false },
  };
}

export default async function RxProductPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await canViewRxReference())) notFound();
  const { id } = await params;
  const p = getRxProduct(decodeURIComponent(id));
  if (!p) notFound();

  const label = getRxLabel(p.splSetId);
  const potency = p.steroidPotencyClass as PotencyClass | null;
  const packages = p.packageDescription ? innermostPackage(p.packageDescription) : null;
  const generic = p.genericName ?? p.brandName;
  // Other strengths and forms of the same generic, one link each.
  const siblings = new Map<string, { id: string; name: string }>();
  for (const r of listRxProducts()) {
    if (r.id === p.id || r.genericName !== p.genericName) continue;
    const name = rxDisplayName(r);
    if (name !== rxDisplayName(p) && !siblings.has(name)) siblings.set(name, { id: r.id, name });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <Link href="/rx" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Prescription reference
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
        <Fact label="Strength">{p.strengthText ?? "Not listed"}</Fact>
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
