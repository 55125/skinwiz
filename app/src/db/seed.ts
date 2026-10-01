import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";
import { ACTIVE_DEFINITIONS, CONCERN_DEFINITIONS, matchActiveIds, nicheToConcernId } from "./actives";
import { computeFreeFromFlags } from "./ingredient-flags";
import { parseStrengths, strengthKey } from "./strength";
import { aliasesFor, canonicalSlug, parseIngredients, pickDisplayName } from "./ingredient-parse";
import { SITE_NAME } from "@/lib/brand";

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
const LABEL_SECTIONS_CSV = path.join(REPO_ROOT, "tools/catalog_pipeline/output/label_sections.csv");

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
  // Also only present in those two CSVs — openFDA/DailyMed have no
  // product-photo field at all, so this is undefined for the bulk of rows
  // and products.imageUrl stays null for them (see schema.ts's comment).
  image_url?: string;
  // Only present in brand_direct_catalog.csv -- the exact page scraped,
  // reused as a "Buy directly" link (see schema.ts's sourceUrl comment).
  source_url?: string;
  // Populated for ~99.8% of acne_sun_catalog.csv rows (the SPL label's own
  // Inactive Ingredients section) but 0% of dailymed_resolved_catalog.csv
  // (that resolution pass never recovered it) -- a real, full ingredient
  // list when present, not a guess. Combined with active_ingredient_text to
  // feed computeFreeFromFlags() below; never previously read at all before
  // the free-from-flags feature.
  inactive_ingredient_text?: string;
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

// Common skincare/regulatory acronyms an FDA label brand name might contain
// — Title Case would otherwise mangle these into "Spf 50", "Cc Cream", etc.
const PRESERVE_UPPERCASE = new Set([
  "SPF", "UV", "UVA", "UVB", "UPF", "PA", "CC", "BB", "OTC", "FDA", "USP",
  "SKU", "LLC", "INC", "USA", "PM", "AM",
]);

// openFDA/DailyMed brand names come straight from the SPL label text, and
// ~16% of the catalog is either ALL-CAPS ("PARURE GOLD SKIN MATTE
// FOUNDATION...") or all-lowercase ("clear days ahead fast-acting salicylic
// acid acne spot treatment") — a real, measured display-quality problem,
// not a guess. This only touches capitalization, never rewrites, shortens,
// or reorders words, so it can't fabricate or lose information the way a
// "smart" name-shortening pass could. Mixed-case names (the majority,
// already human-written-looking) are left untouched on purpose. Known
// limitation: an acronym glued to a number with no space ("SPF50") won't be
// caught since it doesn't exact-match PRESERVE_UPPERCASE — accepted rather
// than adding regex splitting for a marginal, currently-unmeasured slice.
function normalizeBrandName(raw: string): string {
  const letters = raw.replace(/[^A-Za-z]/g, "");
  if (!letters) return raw;
  const isAllUpper = letters === letters.toUpperCase() && letters !== letters.toLowerCase();
  const isAllLower = letters === letters.toLowerCase();
  if (!isAllUpper && !isAllLower) return raw; // mixed case -- leave alone

  return raw
    .split(" ")
    .map((word) => {
      if (PRESERVE_UPPERCASE.has(word.toUpperCase())) return word.toUpperCase();
      if (!word) return word;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

async function main() {
  console.log(`Seeding ${SITE_NAME} database...`);

  // Wipe and regenerate reference/catalog data only, in FK-safe order.
  // dermRatings, audienceOutcomes, dermRaters, raterApplications, routines,
  // routineSteps, routineVotes, and routineReports are deliberately NOT
  // wiped here -- once
  // real submissions exist (a clinician's panel application, a real derm
  // rating, a posted routine), this script needs to keep running safely on
  // every deploy (see the repo-root Dockerfile's startup command) without
  // silently deleting them.
  //
  // better-sqlite3 enforces foreign keys by default (confirmed the hard
  // way: this threw SQLITE_CONSTRAINT_FOREIGNKEY the moment a real routine
  // existed and referenced a concern this script was about to delete-then-
  // reinsert) -- suspended for just this refresh, since concern/active ids
  // are static code constants (CONCERN_DEFINITIONS/ACTIVE_DEFINITIONS) and
  // product ids are stable across reseeds (openFDA NDC / barcode /
  // manufacturer SKU), so every id a preserved row references gets
  // reinserted identically a few lines down. Re-enabled before returning
  // so runtime inserts (a new routine, a new vote) still get real
  // integrity checking.
  // PRAGMA foreign_keys is a no-op inside a transaction, so it's toggled
  // outside and always restored in the finally below.
  db.run(sql`PRAGMA foreign_keys = OFF`);
  try {
    // One transaction: a crash mid-seed (bad CSV row, disk full) rolls back
    // to the previous catalog instead of leaving the volume DB with no
    // products, and concurrent readers keep seeing the old catalog until
    // commit.
    db.transaction(() => reseed());
  } finally {
    db.run(sql`PRAGMA foreign_keys = ON`);
  }
  console.log("Done. dermRaters, dermRatings, audienceOutcomes, routines (incl. votes/reports), shelves and regimens are intentionally left untouched.");
}

function reseed() {
  db.delete(schema.affiliateLinks).run();
  db.delete(schema.productIngredients).run();
  db.delete(schema.ingredients).run();
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
  const memberships: { productId: string; position: number; slug: string; rawName: string; isActive: boolean }[] = [];

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
        ? (row.active_ingredients_structured ?? "").split(";").filter(Boolean)
        : matchActiveIds([row.active_ingredients_structured, row.substance_name, row.active_ingredient_text].join(" "));

      if (activeIds.length === 0) {
        skippedNoActive++;
        continue;
      }
      seenNdc.add(row.product_ndc);
      const trimmedBrandName = row.brand_name?.trim() || "(unnamed product)";
      // Only openfda/dailymed rows get normalized -- brand_direct/OBF brand
      // names are already human-written product names, not SPL label text.
      const isPreMatched = row.source && PRE_MATCHED_SOURCES.has(row.source);
      // The full ingredient list for free-from-flag purposes -- NOT the
      // same text as activeIngredientText above, which for openfda/dailymed
      // is deliberately just the active-ingredient line for display. Using
      // that alone here would wrongly mark almost everything "paraben-free"
      // etc. just because an active-ingredient line never mentions parabens.
      const fullIngredientText = isPreMatched
        ? row.active_ingredient_text || null
        : row.inactive_ingredient_text
          ? `${row.active_ingredient_text || ""} ${row.inactive_ingredient_text}`
          : null; // dailymed-resolved rows and any acne_sun row missing it: unknown, not "clean"
      // Cosmetic sources never disclose concentrations, so only the FDA
      // label line is parsed -- see db/strength.ts.
      const strengths = isPreMatched
        ? null
        : parseStrengths(row.active_ingredients_structured || row.active_ingredient_text);
      const activeIdSet = new Set(activeIds);
      // Drug labels: the tracked actives (position 0) plus the SPL's own
      // inactive list. Cosmetic sources: the single INCI list, in order.
      if (isPreMatched) {
        parseIngredients(row.active_ingredient_text).forEach((ing, i) =>
          memberships.push({ productId: row.product_ndc, position: i + 1, slug: ing.slug, rawName: ing.raw, isActive: activeIdSet.has(ing.slug) }),
        );
      } else {
        const listed = new Set<string>();
        // Actives sit at 0, -1, -2... so (product, position) stays unique and
        // they sort ahead of the inactive list (positions 1..n).
        activeIds.forEach((id, i) => {
          listed.add(id);
          memberships.push({ productId: row.product_ndc, position: -i, slug: id, rawName: id, isActive: true });
        });
        parseIngredients(row.inactive_ingredient_text).forEach((ing, i) => {
          if (!listed.has(ing.slug)) memberships.push({ productId: row.product_ndc, position: i + 1, slug: ing.slug, rawName: ing.raw, isActive: false });
        });
      }
      productBatch.push({
        id: row.product_ndc,
        concernId: nicheToConcernId(row.niche),
        brandName: isPreMatched ? trimmedBrandName : normalizeBrandName(trimmedBrandName),
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
        imageUrl: row.image_url || null,
        sourceUrl: row.source === "brand_direct" ? row.source_url || null : null,
        freeFromFlags: computeFreeFromFlags(fullIngredientText),
        strengths,
        strengthKey: strengthKey(strengths, activeIds),
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

  insertIngredients(memberships);

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

  insertLabelSections();
  reconcileOrphans();
}

type LabelSectionRow = {
  spl_set_id: string;
  effective_time: string;
  directions: string;
  warnings: string;
  do_not_use: string;
  when_using: string;
  stop_use: string;
  ask_doctor: string;
};

// Drug Facts directions/warnings per SPL set id (fetch_label_sections.py).
// Keyed by set id rather than product id: several NDCs share one label.
function insertLabelSections() {
  db.delete(schema.labelSections).run();
  if (!fs.existsSync(LABEL_SECTIONS_CSV)) {
    console.log("  no label_sections.csv, skipping (run tools/catalog_pipeline/fetch_label_sections.py)");
    return;
  }
  const orNull = (v: string) => (v && v.trim() ? v : null);
  const rows = readCsv<LabelSectionRow>(LABEL_SECTIONS_CSV).map((r) => ({
    splSetId: r.spl_set_id,
    effectiveTime: orNull(r.effective_time),
    directions: orNull(r.directions),
    warnings: orNull(r.warnings),
    doNotUse: orNull(r.do_not_use),
    whenUsing: orNull(r.when_using),
    stopUse: orNull(r.stop_use),
    askDoctor: orNull(r.ask_doctor),
  }));
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) db.insert(schema.labelSections).values(rows.slice(i, i + BATCH)).run();
  console.log(`  inserted ${rows.length} FDA label sections`);
}

function insertIngredients(
  raw: { productId: string; position: number; slug: string; rawName: string; isActive: boolean }[],
) {
  // Misspelled labels link to the correct spelling's page. Their spellings are
  // kept on the link (rawName) but don't feed the page's name or "also listed as".
  const seen = new Set<string>();
  const memberships: typeof raw = [];
  const typoVariants = new Map<string, Map<string, number>>();
  const cleanVariants = new Map<string, Map<string, number>>();
  const add = (into: typeof typoVariants, slug: string, name: string) => {
    const v = into.get(slug) ?? new Map<string, number>();
    v.set(name, (v.get(name) ?? 0) + 1);
    into.set(slug, v);
  };
  for (const m of raw) {
    const slug = canonicalSlug(m.slug);
    const k = `${m.productId}|${slug}`;
    if (seen.has(k)) continue; // a product listing both a typo and the correct spelling
    seen.add(k);
    memberships.push({ ...m, slug });
    add(slug === m.slug ? cleanVariants : typoVariants, slug, m.rawName);
  }
  const variants = new Map<string, Map<string, number>>();
  const products = new Map<string, Set<string>>();
  for (const m of memberships) {
    variants.set(m.slug, cleanVariants.get(m.slug) ?? typoVariants.get(m.slug)!);
    const p = products.get(m.slug) ?? new Set<string>();
    p.add(m.productId);
    products.set(m.slug, p);
  }
  const names = new Map<string, string>();
  const rows: (typeof schema.ingredients.$inferInsert)[] = [];
  for (const [slug, v] of variants) {
    const name = pickDisplayName(slug, v);
    names.set(slug, name);
    const aliases = aliasesFor(slug, name, v);
    rows.push({ id: slug, name, aliases, productCount: products.get(slug)!.size });
  }
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) db.insert(schema.ingredients).values(rows.slice(i, i + BATCH)).run();

  const links = memberships.map((m) => ({
    productId: m.productId,
    position: m.position,
    ingredientId: m.slug,
    // tracked actives on a drug label have no raw spelling of their own
    rawName: m.rawName === m.slug ? names.get(m.slug)! : m.rawName,
    isActive: m.isActive,
  }));
  const LINK_BATCH = 150; // 5 bound params per row, under better-sqlite3's variable ceiling
  for (let i = 0; i < links.length; i += LINK_BATCH) db.insert(schema.productIngredients).values(links.slice(i, i + LINK_BATCH)).run();
  console.log(`  indexed ${rows.length} distinct ingredients across ${links.length} product-ingredient links`);
}

// Products that dropped out of the catalog CSVs leave rows pointing at ids
// that no longer exist. Derived tables are regenerable, so their orphans are
// deleted; user-written routine steps keep their text and just lose the
// product link. Ratings/outcomes are user data with a NOT NULL product id,
// so they're reported rather than deleted -- anything else still dangling
// aborts the transaction.
function reconcileOrphans() {
  const missing = (table: string) =>
    sql.raw(`${table}.product_id IS NOT NULL AND ${table}.product_id NOT IN (SELECT id FROM products)`);
  for (const table of ["ewg_scores", "video_links", "shelf_items", "regimen_items"]) {
    const { changes } = db.run(sql`DELETE FROM ${sql.raw(table)} WHERE ${missing(table)}`);
    if (changes) console.log(`  removed ${changes} orphaned ${table} rows`);
  }
  const unlinked = db.run(sql`UPDATE routine_steps SET product_id = NULL WHERE ${missing("routine_steps")}`).changes;
  if (unlinked) console.log(`  unlinked ${unlinked} routine steps from products no longer in the catalog`);

  const violations = db.all<{ table: string }>(sql`PRAGMA foreign_key_check`);
  const userData = new Set(["derm_ratings", "audience_outcomes"]);
  const kept = violations.filter((v) => userData.has(v.table));
  if (kept.length) {
    console.warn(`  WARNING: ${kept.length} rating/outcome rows reference products no longer in the catalog (kept)`);
  }
  const fatal = violations.filter((v) => !userData.has(v.table));
  if (fatal.length) {
    const tables = [...new Set(fatal.map((v) => v.table))].join(", ");
    throw new Error(`Seed aborted: ${fatal.length} foreign-key violations in ${tables}; rolled back.`);
  }
}

main();
