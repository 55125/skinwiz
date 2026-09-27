import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// A "concern" is a launch niche slice (acne, sun protection) — see project.md
// §11's data-driven niche decision. Kept as a table, not an enum, so a third
// concern can be added later without a migration that touches every table.
export const concerns = sqliteTable("concerns", {
  id: text("id").primaryKey(), // slug, e.g. "acne"
  name: text("name").notNull(),
  description: text("description").notNull(),
});

// One row per distinct active ingredient, canonicalized against the
// synonym duplication openFDA's raw substance_name exposes (e.g. octinoxate
// == ethylhexyl methoxycinnamate) — see tools/catalog_pipeline/README.md.
export const actives = sqliteTable("actives", {
  id: text("id").primaryKey(), // canonical slug, e.g. "benzoyl-peroxide"
  canonicalName: text("canonical_name").notNull(),
  // Some actives are FDA-recognized for more than one concern (salicylic
  // acid: acne AND antidandruff) — see db/actives.ts's ActiveDefinition comment.
  categories: text("categories", { mode: "json" }).$type<string[]>().notNull(),
  synonyms: text("synonyms", { mode: "json" }).$type<string[]>().notNull(),
});

// Factual/regulatory descriptive text only — NOT a clinical efficacy grade.
// evidenceGrade stays null until a board-certified dermatologist assigns
// one; needsClinicianReview defaults true and the UI must respect it.
// See project.md §5: the derm-verification requirement is structural, not
// optional, and this table is where that structure lives.
export const evidenceNotes = sqliteTable("evidence_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  activeId: text("active_id").notNull().references(() => actives.id),
  concernId: text("concern_id").notNull().references(() => concerns.id),
  summary: text("summary").notNull(),
  typicalConcentrationText: text("typical_concentration_text"),
  evidenceGrade: text("evidence_grade"), // null = ungraded; set only by a verified rater
  needsClinicianReview: integer("needs_clinician_review", { mode: "boolean" }).notNull().default(true),
  citations: text("citations", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
});

// One row per distinct product, keyed by barcode/NDC (whichever the source
// uses) -- from tools/catalog_pipeline/output/{acne_sun,dailymed_resolved,
// cosmetic}_catalog.csv. Barcode/NDC as the primary key is deliberate: a
// repackaged or reformulated relaunch gets a new barcode in practice (GS1
// convention), so it becomes a new row instead of silently overwriting
// what an existing review/link/citation pointed at.
export const products = sqliteTable("products", {
  id: text("id").primaryKey(), // product_ndc (drug) or barcode (cosmetic)
  concernId: text("concern_id").notNull().references(() => concerns.id),
  brandName: text("brand_name").notNull(),
  manufacturer: text("manufacturer"),
  dosageForm: text("dosage_form"),
  activeIngredientText: text("active_ingredient_text"), // exact FDA label text, incl. %, or raw OBF ingredients_text
  activeIds: text("active_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  splSetId: text("spl_set_id"), // DailyMed backlink: dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=
  // "openfda" | "dailymed" | "open_beauty_facts" -- which pipeline produced
  // this row. verified=true only for openfda/dailymed (derived from what a
  // manufacturer legally filed with the FDA); false for open_beauty_facts
  // (crowd-sourced, unverified -- confirmed real junk entries exist in it
  // during spot-checks, see build_cosmetic_catalog.py). The UI must render
  // an unmistakable badge when verified is false -- never blend this with
  // the FDA-sourced rows without a visible distinction.
  dataSource: text("data_source").notNull().default("openfda"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(true),
});

// Real affiliate integration exists (tools/affiliate_feeds/) but no network
// account is approved yet (project.md §11 open decision), so this table is
// seeded from SYNTHETIC mock-feed data for a small demo subset only.
// isDemo must stay true for all rows until a real feed is wired in —
// the UI enforces a visible "demo" label whenever isDemo is true so this
// never gets presented as a live price to a real user.
export const affiliateLinks = sqliteTable("affiliate_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: text("product_id").notNull().references(() => products.id),
  network: text("network").notNull(),
  price: real("price"),
  currency: text("currency").notNull().default("USD"),
  buyUrl: text("buy_url").notNull(),
  imageUrl: text("image_url"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(true),
});

// Real video results, cached from the YouTube Data API (see
// scripts/fetch-youtube-videos.ts) — only populated if YOUTUBE_API_KEY is
// set and that script has been run; empty otherwise. Populated on demand,
// not fetched live per pageview, to respect the API's free daily quota
// (100 search calls/day). TikTok and Instagram have no comparable
// free/accessible search API for a small site, so there's no equivalent
// table for them — src/lib/video-links.ts builds a plain search-deep-link
// for those two instead, always, with no caching needed.
export const videoLinks = sqliteTable("video_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: text("product_id").notNull().references(() => products.id),
  platform: text("platform").notNull().default("youtube"),
  videoId: text("video_id").notNull(),
  title: text("title").notNull(),
  channelTitle: text("channel_title"),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: text("published_at"),
  fetchedAt: text("fetched_at").notNull().default(sql`(current_timestamp)`),
});

// Verified board-certified dermatologist raters. Empty at seed time —
// nobody has been recruited yet (project.md §11 open decision).
export const dermRaters = sqliteTable("derm_raters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  npi: text("npi").notNull(),
  abdCertified: integer("abd_certified", { mode: "boolean" }).notNull().default(false),
  bio: text("bio"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// Per-concern, per-product derm score submissions. Empty at seed time.
export const dermRatings = sqliteTable("derm_ratings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: text("product_id").notNull().references(() => products.id),
  concernId: text("concern_id").notNull().references(() => concerns.id),
  raterId: integer("rater_id").notNull().references(() => dermRaters.id),
  score: integer("score").notNull(), // 0-100
  rubricJson: text("rubric_json", { mode: "json" }).$type<Record<string, number>>(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// First-party outcome logging (project.md §5: "audience side = outcome
// score ... not scraped stars"). Empty at seed time — no users yet.
export const audienceOutcomes = sqliteTable("audience_outcomes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: text("product_id").notNull().references(() => products.id),
  concernId: text("concern_id").notNull().references(() => concerns.id),
  sessionId: text("session_id").notNull(),
  improved: integer("improved", { mode: "boolean" }).notNull(),
  weeksUsed: integer("weeks_used"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// Interest submissions from the /for-clinicians page — reviewed manually
// before anyone is added to dermRaters (NPI/ABD verification is a manual
// step per project.md §5, not automated here).
export const raterApplications = sqliteTable("rater_applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  credential: text("credential"),
  message: text("message"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});
