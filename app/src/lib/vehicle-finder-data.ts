// Loads the topical prescription rows with a known vehicle for the
// Prescribe-safe finder (lib/vehicle-finder.ts). Catalog-only, so cached.
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { products, rxVehicles } from "@/db/schema";
import { allergensInList } from "@/db/contact-allergens";
import { rxDisplayName } from "@/lib/rx-catalog";
import { ttlCache } from "@/lib/ttl-cache";
import type { VehicleRow } from "@/lib/vehicle-finder";

export const loadVehicleRows = ttlCache((): VehicleRow[] => {
  const rows = db
    .select({ p: products, v: rxVehicles })
    .from(rxVehicles)
    .innerJoin(products, eq(products.id, rxVehicles.productId))
    .where(and(eq(products.isRx, true), eq(products.informationalOnly, false), ne(products.rxGroup, "oral")))
    .all();
  return rows.map(({ p, v }) => {
    // The active counts too: a class A steroid allergy rules out hydrocortisone itself.
    const activeHits = allergensInList([p.genericName, p.activeIngredientText].filter(Boolean).join(", "));
    return {
      id: p.id,
      brandName: p.brandName,
      labeler: p.manufacturer,
      genericName: p.genericName ?? p.brandName,
      strengthText: p.strengthText,
      dosageForm: p.dosageForm,
      rxGroup: p.rxGroup,
      potency: p.steroidPotencyClass,
      display: rxDisplayName(p),
      names: v.names,
      hits: [...new Set([...v.allergenHits, ...activeHits])],
      freeFromFlags: v.freeFromFlags,
    };
  });
});
