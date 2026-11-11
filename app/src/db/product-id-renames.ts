import renames from "./product-id-renames.json";

// Product ids that changed, old -> new. CeraVe brand-site products used their
// page URL as the id (/product/https%3A%2F%2Fwww.cerave.com%2F...), now
// "cerave-<page name>" (tools/catalog_pipeline/build_brand_direct_catalog.py).
// The seed moves saved data to the new ids (db/seed.ts), and the product
// pages redirect an old id's address permanently, so links and bookmarks
// keep working.
export const PRODUCT_ID_RENAMES: Readonly<Record<string, string>> = renames;

/** The id a product goes by now, if this one was renamed. */
export function renamedProductId(id: string): string | undefined {
  return Object.hasOwn(PRODUCT_ID_RENAMES, id) ? PRODUCT_ID_RENAMES[id] : undefined;
}
