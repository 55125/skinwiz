import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PetProductList, SpeciesFilter, parseSpecies } from "@/components/pet-mode";
import { petConcern } from "@/db/pet";
import { listPetProducts } from "@/lib/pet-catalog";
import { FEATURES } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ concern: string }> }): Promise<Metadata> {
  const c = petConcern((await params).concern);
  return { title: c ? `${c.name}: pet products` : "Pet products", robots: { index: false, follow: false } };
}

export default async function PetConcernPage({
  params,
  searchParams,
}: {
  params: Promise<{ concern: string }>;
  searchParams: Promise<{ species?: string }>;
}) {
  if (!FEATURES.PET_MODE) notFound();
  const concern = petConcern((await params).concern);
  if (!concern) notFound();
  const species = parseSpecies((await searchParams).species);
  const products = listPetProducts({ concern: concern.id, species });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/pets${species ? `?species=${species}` : ""}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Pet skin care
        </Link>
        </div>
      <PageHeader eyebrow="Pet mode" title={concern.name} description={concern.description} />
      <SpeciesFilter base={`/pets/${concern.id}`} species={species} />
      <p className="text-sm text-muted-foreground">
        {products.length} products. FDA-approved and EPA-registered products first, veterinary prescriptions last. This is what each
        label says, not a recommendation: ask your veterinarian what fits your pet.
      </p>
      <PetProductList products={products} species={species} />
    </div>
  );
}
