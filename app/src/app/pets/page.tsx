import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PetProductList, SpeciesFilter, parseSpecies } from "@/components/pet-mode";
import { PET_CONCERNS } from "@/db/pet";
import { listPetProducts, petConcernCounts } from "@/lib/pet-catalog";
import { FEATURES } from "@/lib/feature-flags";

// Flag read per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pet skin care",
  description: "Dog and cat shampoos, ear products and flea and tick treatments, with their labels' ingredients and species warnings.",
  // Until the species-toxicity list has had veterinary review.
  robots: { index: false, follow: false },
};

const RESULT_LIMIT = 100;

export default async function PetsPage({ searchParams }: { searchParams: Promise<{ species?: string; q?: string }> }) {
  if (!FEATURES.PET_MODE) notFound();
  const { species: sp, q } = await searchParams;
  const species = parseSpecies(sp);
  const query = (q ?? "").trim().slice(0, 100);
  const counts = petConcernCounts(species);
  const results = query ? listPetProducts({ species, q: query }) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="Pet mode"
        title="Skin care for dogs and cats"
        description="Medicated shampoos, ear products, wipes and flea and tick treatments, with what their labels say is in them. Pet products are kept apart from the people catalog."
      />
      <div className="space-y-3">
        <form action="/pets" className="flex max-w-xl gap-2">
          {species && <input type="hidden" name="species" value={species} />}
          <input
            name="q"
            defaultValue={query}
            placeholder="Search pet products or ingredients"
            aria-label="Search pet products"
            className="h-10 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm"
          />
          <button className="h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">Search</button>
        </form>
        <SpeciesFilter base="/pets" species={species} params={{ q: query || undefined }} />
      </div>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
        Never use a human skin product on a pet without asking your veterinarian. Several common ones (minoxidil, 5-FU,
        calcipotriene, diclofenac creams, tea tree oil) can poison dogs and cats, and permethrin dog flea products can kill cats.
      </div>

      {query ? (
        <section className="space-y-3" aria-labelledby="results">
          <h2 id="results" className="text-xl font-semibold">
            {results.length} {results.length === 1 ? "product" : "products"} for “{query}”
          </h2>
          <PetProductList products={results.slice(0, RESULT_LIMIT)} species={species} />
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2" aria-label="Pet concerns">
          {PET_CONCERNS.map((c) => (
            <Link
              key={c.id}
              href={`/pets/${c.id}${species ? `?species=${species}` : ""}`}
              className="rounded-2xl border bg-card p-4 transition-colors hover:border-brand"
            >
              <p className="font-semibold">
                {c.name} <span className="text-sm font-normal text-muted-foreground">{counts.get(c.id) ?? 0}</span>
              </p>
              <p className="text-sm text-muted-foreground">{c.description}</p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
