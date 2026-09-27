import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { db } from "./client";
import * as schema from "./schema";
import { ACTIVE_DEFINITIONS, matchActiveIds } from "./actives";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const CATALOG_CSV = path.join(REPO_ROOT, "tools/catalog_pipeline/output/acne_sun_catalog.csv");
const AFFILIATE_CSV = path.join(REPO_ROOT, "tools/affiliate_feeds/output/matched_catalog.csv");

type CatalogRow = {
  product_ndc: string;
  niche: "acne" | "sunscreen";
  brand_name: string;
  manufacturer_name: string;
  active_ingredient_text: string;
  active_ingredients_structured: string;
  dosage_form: string;
  substance_name: string;
  spl_set_id: string;
};

type AffiliateRow = {
  network: string;
  price: string;
  currency: string;
  buy_url: string;
  image_url: string;
  matched_product_ndc: string;
};

function nicheToConcernId(niche: string): string {
  return niche === "sunscreen" ? "sun-protection" : "acne";
}

function readCsv<T>(filePath: string): T[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  return parse(raw, { columns: true, skip_empty_lines: true }) as T[];
}

async function main() {
  console.log("Seeding SkinWiz database...");

  // Wipe in FK-safe order so this script is idempotent.
  db.delete(schema.affiliateLinks).run();
  db.delete(schema.dermRatings).run();
  db.delete(schema.audienceOutcomes).run();
  db.delete(schema.raterApplications).run();
  db.delete(schema.dermRaters).run();
  db.delete(schema.evidenceNotes).run();
  db.delete(schema.products).run();
  db.delete(schema.actives).run();
  db.delete(schema.concerns).run();

  db.insert(schema.concerns)
    .values([
      { id: "acne", name: "Acne", description: "Evidence-graded OTC actives and products for acne-prone skin." },
      { id: "sun-protection", name: "Sun Protection", description: "FDA-recognized sunscreen actives and products." },
    ])
    .run();

  db.insert(schema.actives)
    .values(
      ACTIVE_DEFINITIONS.map((a) => ({
        id: a.id,
        canonicalName: a.canonicalName,
        category: a.category,
        synonyms: a.synonyms,
      })),
    )
    .run();

  const evidenceRows = ACTIVE_DEFINITIONS.map((a) => ({
    activeId: a.id,
    concernId: a.category === "sunscreen" ? "sun-protection" : "acne",
    summary: a.summary,
    typicalConcentrationText: a.typicalConcentrationText,
    evidenceGrade: null,
    needsClinicianReview: true,
    citations: [] as string[],
  }));
  db.insert(schema.evidenceNotes).values(evidenceRows).run();

  console.log(`Reading catalog from ${CATALOG_CSV}...`);
  const catalogRows = readCsv<CatalogRow>(CATALOG_CSV);
  console.log(`  ${catalogRows.length} rows`);

  let inserted = 0;
  let skippedNoActive = 0;
  const productBatch: (typeof schema.products.$inferInsert)[] = [];
  const seenNdc = new Set<string>();

  for (const row of catalogRows) {
    if (!row.product_ndc || seenNdc.has(row.product_ndc)) continue;
    const combinedText = [row.active_ingredients_structured, row.substance_name, row.active_ingredient_text].join(" ");
    const activeIds = matchActiveIds(combinedText);
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
      activeIngredientText: row.active_ingredients_structured || row.active_ingredient_text || null,
      activeIds,
      splSetId: row.spl_set_id || null,
    });
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
