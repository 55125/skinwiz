// Read access to pet mode's own table (db/schema.ts petProducts). The only
// module that selects it; callers are the flag-gated /pets pages. Human
// listings, search and counts never read pet_products, so a pet product
// can't appear in them.
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { petProducts } from "@/db/schema";
import { forSpecies, type PetSpeciesFilter } from "@/db/pet";
import { foldAccents } from "@/db/fold";

export type PetProduct = typeof petProducts.$inferSelect;

// Within a listing: what a pet owner can buy and use first (Rx last), then
// by how much review stands behind it.
const STATUS_ORDER = ["fda_approved", "fda_conditional", "epa_registered", "unapproved", "brand_listing", "other_source"];

function rank(p: PetProduct): number {
  return (p.isRx ? 10 : 0) + Math.max(0, STATUS_ORDER.indexOf(p.regulatoryStatus));
}

function allPetProducts(): PetProduct[] {
  return db.select().from(petProducts).orderBy(asc(petProducts.brandName)).all();
}

export function getPetProduct(id: string): PetProduct | undefined {
  return db.select().from(petProducts).where(eq(petProducts.id, id)).get();
}

const norm = (s: string | null | undefined) => (foldAccents(s ?? "") ?? "").toLowerCase();

/** Pet products filtered by concern, species and a free-text query (every word must match). */
export function listPetProducts({ concern, species, q }: { concern?: string; species?: PetSpeciesFilter; q?: string }): PetProduct[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  return allPetProducts()
    .filter((p) => !concern || p.concernIds.includes(concern))
    .filter((p) => !species || forSpecies(p.species, species, p.notForCats))
    .filter((p) => {
      if (words.length === 0) return true;
      const hay = norm(`${p.brandName} ${p.manufacturer} ${p.activeIngredientText} ${p.inactiveIngredientText} ${p.epaRegNo} ${p.alternateNames}`);
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => rank(a) - rank(b));
}

/** Product count per pet concern, for one species or all. */
export function petConcernCounts(species?: PetSpeciesFilter): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of allPetProducts()) {
    if (species && !forSpecies(p.species, species, p.notForCats)) continue;
    for (const c of p.concernIds) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return counts;
}
