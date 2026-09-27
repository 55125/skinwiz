import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { db } from "./client";
import * as schema from "./schema";
import { ACTIVE_DEFINITIONS, CONCERN_DEFINITIONS, matchActiveIds, nicheToConcernId } from "./actives";

const REPO_ROOT = path.resolve(process.cwd(), "..");
// Four sources: the primary openFDA catalog, the DailyMed resolution pass
// that recovers some of the label records openFDA's own label->NDC
// linkage missed, the Open Beauty Facts cosmetic-ingredient catalog
// (crowd-sourced, unverified), and the brand-direct catalog (scraped from
// a manufacturer's own product pages — a higher-trust middle tier between
// the two). Any file may not exist yet if its generating script hasn't
// been run — handled below.
const CATALOG_CSVS = [
  path.join(REPO_ROOT, "tools/catalog_pipeline/output/acne_sun_catalog.csv"),
  path.join(REPO_ROOT, "tools/catalog_pipeline/output/dailymed_resolved_catalog.csv"),
  path.join(REPO_ROOT, "tools/catalog_pipeline/output/cosmetic_catalog.csv"),
  path.join(REPO_ROOT, "tools/catalog_pipeline/output/brand_direct_catalog.csv"),
];
const AFFILIATE_CSV = path.join(REPO_ROOT, "tools/affiliate_feeds/output/matched_catalog.csv");

type CatalogRow = {
  product_ndc: string;
  niche:
    | "acne"
    | "sunscreen"
    | "antifungal"
    | "antidandruff"
    | "anti-itch"
    | "skin-protectant"
    | "antiperspirant"
    | "brightening-texture";
  brand_name: string;
  manufacturer_name: string;
  active_ingredient_text: string;
  active_ingredients_structured: string;
  dosage_form: string;
  substance_name: string;
  spl_set_id: string;
  // Present in cosmetic_catalog.csv and brand_direct_catalog.csv. When set,
  // active_ingredients_structured already holds canonical active ids (from
  // that script's own matching against the full ingredient list) — trust it
  // directly rather than re-deriving via matchActiveIds().
  source?: "open_beauty_facts" | "brand_direct";
  verified?: "true" | "false";
};

const PRE_MATCHED_SOURCES = new Set(["open_beauty_facts", "brand_direct"]);

type AffiliateRow = {
  network: string;
  price: string;
  currency: string;
  buy_url: string;
  image_url: string;
  matched_product_ndc: string;
};

function readCsv<T>(filePath: string): T[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  return parse(raw, { columns: true, skip_empty_lines: true }) as T[];
}

async function main() {
  console.log("Seeding SkinWiz database...");

  // Wipe and regenerate reference/catalog data only, in FK-safe order.
  // dermRatings, audienceOutcomes, dermRaters, and raterApplications are
  // deliberately NOT wiped here -- once real submissions exist (a
  // clinician's panel application, a real derm rating), this script needs
  // to keep running safely on every deploy (see the repo-root Dockerfile's
  // startup command) without silently deleting them. Safe today because
  // SQLite doesn't enforce foreign keys here by default and product ids
  // are stable across reseeds (openFDA NDC / barcode / manufacturer SKU),
  // so any rows referencing them keep resolving correctly.
  db.delete(schema.affiliateLinks).run();
  db.delete(schema.evidenceNotes).run();
  db.delete(schema.products).run();
  db.delete(schema.actives).run();
  db.delete(schema.concerns).run();

  db.insert(schema.concerns)
    .values(CONCERN_DEFINITIONS.map((c) => ({ id: c.id, name: c.name, description: c.description })))
    .run();

  db.insert(schema.actives)
    .values(
      ACTIVE_DEFINITIONS.map((a) => ({
        id: a.id,
        canonicalName: a.canonicalName,
        categories: a.categories,
        synonyms: a.synonyms,
      })),
    )
    .run();

  // One evidence note per (active, concern) pair — an active recognized for
  // more than one concern (e.g. salicylic acid: acne + antidandruff) gets
  // one row per concern, not one row shared across concerns.
  const evidenceRows = ACTIVE_DEFINITIONS.flatMap((a) =>
    a.categories.map((niche) => ({
      activeId: a.id,
      concernId: nicheToConcernId(niche),
      summary: a.summary,
      typicalConcentrationText: a.typicalConcentrationText,
      evidenceGrade: null,
      needsClinicianReview: true,
      citations: [] as string[],
    })),
  );
  db.insert(schema.evidenceNotes).values(evidenceRows).run();

  let inserted = 0;
  let skippedNoActive = 0;
  const productBatch: (typeof schema.products.$inferInsert)[] = [];
  const seenNdc = new Set<string>();

  for (const csvPath of CATALOG_CSVS) {
    if (!fs.existsSync(csvPath)) {
      console.log(`Skipping ${csvPath} (not found — run its generating script first)`);
      continue;
    }
    console.log(`Reading catalog from ${csvPath}...`);
    const catalogRows = readCsv<CatalogRow>(csvPath);
    console.log(`  ${catalogRows.length} rows`);

    for (const row of catalogRows) {
      if (!row.product_ndc || seenNdc.has(row.product_ndc)) continue;

      const activeIds = row.source && PRE_MATCHED_SOURCES.has(row.source)
        ? row.active_ingredients_structured.split(";").filter(Boolean)
        : matchActiveIds([row.active_ingredients_structured, row.substance_name, row.active_ingredient_text].join(" "));

      if (activeIds.length === 0) {
        skippedNoActive++;
        continue;
      }
      seenNdc.add(row.product_ndc);
      productBatch.push({
        id: row.product_ndc,
        concernId: nicheToConcernId(row.niche),
        brandName: row.brand_name?.trim() || "(unnamed product)",
        manufacturer: row.manufacturer_name || null,
        dosageForm: row.dosage_form || null,
        // For pre-matched sources, active_ingredients_structured holds
        // internal canonical ids (see activeIds above), not display text —
        // show the raw ingredient list instead.
        activeIngredientText:
          row.source && PRE_MATCHED_SOURCES.has(row.source)
            ? row.active_ingredient_text || null
            : row.active_ingredients_structured || row.active_ingredient_text || null,
        activeIds,
        splSetId: row.spl_set_id || null,
        dataSource: row.source ?? (csvPath.includes("dailymed") ? "dailymed" : "openfda"),
        verified: row.verified === "false" ? false : true,
      });
    }
  }

  // better-sqlite3 has a bound-parameter ceiling per statement — batch inserts.
  const BATCH_SIZE = 500;
  for (let i = 0; i < productBatch.length; i += BATCH_SIZE) {
    db.insert(schema.products).values(productBatch.slice(i, i + BATCH_SIZE)).run();
    inserted += Math.min(BATCH_SIZE, productBatch.length - i);
  }
  console.log(`  inserted ${inserted} products, skipped ${skippedNoActive} with no recognized active ingredient`);

  console.log(`Reading affiliate demo data from ${AFFILIATE_CSV}...`);
  if (fs.existsSync(AFFILIATE_CSV)) {
    const affiliateRows = readCsv<AffiliateRow>(AFFILIATE_CSV);
    let affiliateInserted = 0;
    for (const row of affiliateRows) {
      if (!row.matched_product_ndc || !seenNdc.has(row.matched_product_ndc)) continue;
      db.insert(schema.affiliateLinks)
        .values({
          productId: row.matched_product_ndc,
          network: row.network,
          price: row.price ? parseFloat(row.price) : null,
          currency: row.currency || "USD",
          buyUrl: row.buy_url,
          imageUrl: row.image_url || null,
          isDemo: true, // no real affiliate account approved yet — see tools/affiliate_feeds/README.md
        })
        .run();
      affiliateInserted++;
    }
    console.log(`  inserted ${affiliateInserted} DEMO affiliate links (synthetic data, not live prices)`);
  } else {
    console.log("  no affiliate output found, skipping (run tools/affiliate_feeds/match_catalog.py first)");
  }

  console.log("Done. dermRaters, dermRatings, and audienceOutcomes are intentionally empty — no real panel or users yet.");
}

main();
