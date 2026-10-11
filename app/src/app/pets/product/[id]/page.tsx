import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, ExternalLink, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RxLabelSection } from "@/components/rx-label-section";
import { CatCautionBadge, PetStatusBadge, parseSpecies } from "@/components/pet-mode";
import { catCaution, petConcern, petWarnings, regulatoryStatus, speciesLabel } from "@/db/pet";
import { getPetProduct } from "@/lib/pet-catalog";
import { displayManufacturer } from "@/lib/format";
import { FEATURES } from "@/lib/feature-flags";

// A pet product: what its label (or the brand) says, its regulatory
// status in place of the human monograph range badges, and the
// species-toxicity warnings (db/pet.ts, pending veterinary review).
// Prescription animal drugs are informational only: no buy link.

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = FEATURES.PET_MODE ? getPetProduct(decodeURIComponent((await params).id)) : undefined;
  return { title: p ? `${p.brandName} (pet product)` : "Pet product", robots: { index: false, follow: false } };
}

const SPECIES_WORD = { dog: "dogs", cat: "cats" } as const;

export default async function PetProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ species?: string }>;
}) {
  if (!FEATURES.PET_MODE) notFound();
  const p = getPetProduct(decodeURIComponent((await params).id));
  // The Dogs / Cats view the visitor came from, kept on the way back.
  const species = parseSpecies((await searchParams).species);
  if (!p) notFound();

  const status = regulatoryStatus(p.regulatoryStatus);
  const input = { ...p, actives: p.activesJson };
  const warnings = petWarnings(input);
  const caution = catCaution(input);
  const concern = petConcern(p.concernId);
  const fromFda = p.dataSource === "dailymed_animal";
  const back = `${concern ? `/pets/${concern.id}` : "/pets"}${species ? `?species=${species}` : ""}`;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> {concern?.name ?? "Pet skin care"}
        </Link>
        </div>

      {p.imageUrl && (
        <figure className="float-right ml-6 w-36 sm:w-48">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- self-hosted brand photo */}
            <img src={p.imageUrl} alt={p.brandName} width={320} height={320} className="h-full w-full object-contain p-2" decoding="async" />
          </div>
        </figure>
      )}

      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Pet mode · {speciesLabel(p.species)}</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">{p.brandName}</h1>
        {p.manufacturer && <p className="text-muted-foreground">{displayManufacturer(p.manufacturer)}</p>}
        <div className="flex flex-wrap gap-2">
          <PetStatusBadge p={p} />
          <CatCautionBadge p={p} />
          {p.dosageForm && <Badge variant="outline">{p.dosageForm.toLowerCase()}</Badge>}
        </div>
      </header>

      {p.isRx && (
        <div className="flex gap-3 rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 text-sm">
          <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <p>
            <span className="font-semibold">Veterinary prescription: for information only.</span> Federal law restricts this drug to use
            by or on the order of a licensed veterinarian. Ask your vet whether it fits your pet.
          </p>
        </div>
      )}

      {(warnings.length > 0 || caution === "danger") && (
        <section className="space-y-3 rounded-2xl border-2 border-red-500 bg-red-50 p-5 dark:bg-red-950/30" aria-labelledby="species-warnings">
          <h2 id="species-warnings" className="flex items-center gap-2 text-lg font-bold text-red-800 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" /> Species warnings
          </h2>
          {p.notForCats && <p className="text-sm font-medium">The label says not to use this product on cats.</p>}
          <ul className="space-y-2 text-sm">
            {warnings.map((w) => (
              <li key={w.rule.id}>
                <span className="font-semibold">
                  {w.rule.name}: dangerous for {w.species.map((s) => SPECIES_WORD[s]).join(" and ")}.
                </span>{" "}
                {w.rule.risk}{" "}
                <a href={w.rule.source.url} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-4">
                  {w.rule.source.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-900/80 dark:text-red-200/80">Our species list is awaiting review by a veterinarian. If your pet was exposed, call your vet or an animal poison control line.</p>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-4 text-sm">
        <p className="font-semibold">{status.label}</p>
        <p className="text-muted-foreground">{status.detail}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Fact label="For">{speciesLabel(p.species)}</Fact>
        <Fact label="Active ingredients">
          {p.activesJson.length > 0 ? (
            <ul>
              {p.activesJson.map((a) => (
                <li key={a.name}>
                  {a.name.toLowerCase()} {a.display}
                </li>
              ))}
            </ul>
          ) : (
            (p.activeIngredientText ?? "None listed")
          )}
        </Fact>
        {p.applicationNumber && <Fact label="FDA application">{p.applicationNumber}</Fact>}
        {p.epaRegNo && <Fact label="EPA Reg. No.">{p.epaRegNo}</Fact>}
        {p.signalWord && <Fact label="EPA signal word">{p.signalWord}</Fact>}
        {p.alternateNames && <Fact label="Registered and sold as">{p.alternateNames}</Fact>}
        {fromFda && <Fact label="NDC">{p.id}</Fact>}
      </section>

      <section className="space-y-1 text-sm">
        <h2 className="font-semibold">{p.dataSource === "brand_direct" ? "Ingredients" : "Other ingredients"}</h2>
        <p className="text-muted-foreground">
          {p.inactiveIngredientText ??
            (p.dataSource === "epa_pesticide"
              ? "Not listed: pesticide labels only have to name their active ingredients."
              : "Not listed on the label.")}
        </p>
        {p.ingredientSourceUrl && (
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Ingredient details not on this product&apos;s own {p.dataSource === "brand_direct" ? "page" : "label"}: matched from{" "}
            <a href={p.ingredientSourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="underline underline-offset-4">
              {sourceHost(p.ingredientSourceUrl)}
            </a>
            . Check the package before relying on it.
          </p>
        )}
      </section>

      <div className="space-y-3">
        <RxLabelSection title="What it's for" text={p.indications} open />
        <RxLabelSection title="Directions" text={p.directions} />
        <RxLabelSection title="Warnings and cautions" text={p.warnings} />
        {p.pests && (
          <section className="rounded-2xl border bg-card p-4 text-sm">
            <p className="font-semibold">Pests on the EPA registration</p>
            <p className="mt-1 text-muted-foreground">{p.pests.toLowerCase()}</p>
          </section>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {fromFda && p.splSetId && (
          <>
            Label text is quoted from the product&apos;s label on{" "}
            <a href={`https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${p.splSetId}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              DailyMed
            </a>
            , shortened for length.{" "}
          </>
        )}
        {p.sourceUrl && (
          <a href={p.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
            {p.dataSource === "epa_pesticide" ? "EPA-accepted label (PDF)" : "Brand's product page"} <ExternalLink className="h-3 w-3" />
          </a>
        )}{" "}
        Not veterinary advice: follow the label and ask your veterinarian.
      </p>
    </div>
  );
}

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "another source";
  }
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  );
}
