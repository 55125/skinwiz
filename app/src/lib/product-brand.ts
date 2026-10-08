import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { displayManufacturer } from "@/lib/format";
import { KNOWN_BRANDS, brandEntries, brandFromName, type BrandEntry } from "@/lib/product-brand-match";

// The brand to show on a product: for an FDA listing, the brand that starts
// its name (product-brand-match.ts), with the labeler kept as "Made by";
// for brand-sourced and community listings, the manufacturer field already
// is the brand. The brand list is the curated one plus every brand with a
// few listings of its own in the catalog, rebuilt every 10 minutes.
const TTL_MS = 10 * 60_000;
let cached: { at: number; brands: BrandEntry[] } | null = null;

// Catalog "brands" that are also everyday words would claim names like
// "Clear Future Deep Pore Cleanser".
const GENERIC = new Set(["clear", "essence", "natural", "naturals", "pure", "simple", "skin", "beauty", "daily", "acne", "care", "glow", "fresh", "basic", "basics", "soft", "gentle", "sun", "baby", "derma", "dermo", "body", "face", "organic", "true", "bright", "nature", "original"]);

const LEGAL = /\b(inc|llc|ltd|co|corp|corporation|company|gmbh|s\.?a|a\.?s|ag|plc|limited|norge|sanayi)\b\.?/i;

function brands(): BrandEntry[] {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.brands;
  const rows = db.all<{ name: string }>(sql`
    SELECT manufacturer AS name FROM products
    WHERE is_rx = 0 AND data_source NOT IN ('openfda', 'dailymed') AND manufacturer IS NOT NULL
    GROUP BY lower(manufacturer) HAVING count(*) >= 3
  `);
  const fromCatalog = rows.map((r) => r.name.trim()).filter((n) => n.length >= 3 && n.length <= 30 && !LEGAL.test(n) && !GENERIC.has(n.toLowerCase()));
  cached = { at: Date.now(), brands: brandEntries([...KNOWN_BRANDS, ...fromCatalog]) };
  return cached.brands;
}

const FDA_SOURCES = new Set(["openfda", "dailymed"]);

export type ProductBrand = { brand: string | null; madeBy: string | null };

export function productBrand(p: { dataSource: string; brandName: string; manufacturer: string | null }): ProductBrand {
  const labeler = p.manufacturer ? displayManufacturer(p.manufacturer) : null;
  if (!FDA_SOURCES.has(p.dataSource)) return { brand: labeler, madeBy: null };
  const brand = brandFromName(p.brandName, brands());
  if (!brand) return { brand: labeler, madeBy: null };
  // "Made by" only when it says something the brand doesn't.
  return { brand, madeBy: labeler && !labeler.toLowerCase().includes(brand.toLowerCase()) ? labeler : null };
}
