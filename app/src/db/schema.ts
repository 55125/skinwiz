import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

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

// Structural/chemical reference data from PubChem (src/db/enrich-pubchem.ts)
// -- purely factual (a compound id and formula), never editorial text, so
// it doesn't need the clinician-review gate evidenceNotes has. Kept in its
// own table rather than columns on `actives` because `actives` itself is
// wiped and reinserted on every `npm run db:seed` (see seed.ts) -- this
// table isn't, the same way video_links/routine_reports aren't, so the
// enrichment script only has to run once (or after adding new actives),
// not on every deploy. Safe against the actives wipe because seed.ts
// reinserts the exact same static ids every time (suspending FK
// enforcement for that one block already handles this, see its comment).
// Not every active resolves on PubChem -- botanical extracts (centella
// asiatica) and polymers (sodium hyaluronate) aren't single compounds, so
// this table simply has no row for those, not a null placeholder.
export const activeChemData = sqliteTable("active_chem_data", {
  activeId: text("active_id").primaryKey().references(() => actives.id),
  pubchemCid: integer("pubchem_cid").notNull(),
  molecularFormula: text("molecular_formula"),
  fetchedAt: text("fetched_at").notNull().default(sql`(current_timestamp)`),
});

// EWG Skin Deep's own 1-10 ingredient hazard score for a product we also
// carry (src/db/enrich-ewg.ts) -- a genuinely independent, external safety
// reference, not something we compute ourselves. Same "own table, not
// wiped on reseed" reasoning as active_chem_data. Fuzzy-matched by brand +
// product name (same token-Jaccard approach as
// tools/affiliate_feeds/match_catalog.py), so a wrong/missing match just
// means no row -- never a guessed score. dataAvailability is EWG's own
// confidence qualifier on the score ("Good"/"Fair"/"Limited" -- theirs, not
// invented here) and matters as much as the score itself: a score of 2
// with "Limited" data means less than a score of 2 with "Good" data.
export const ewgScores = sqliteTable("ewg_scores", {
  productId: text("product_id").primaryKey().references(() => products.id),
  ewgScore: integer("ewg_score").notNull(),
  dataAvailability: text("data_availability"),
  ewgProductUrl: text("ewg_product_url").notNull(),
  fetchedAt: text("fetched_at").notNull().default(sql`(current_timestamp)`),
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
  // Only populated for open_beauty_facts (OBF's own image_front_url) and
  // brand_direct (the manufacturer page's own product photo) rows -- openFDA
  // and DailyMed have no product-photo field anywhere in their data, so the
  // ~15k FDA-sourced rows (the large majority of the catalog) stay null.
  // That's a real, disclosed data gap, not a bug -- the UI must show a plain
  // placeholder rather than a broken image or a stock photo standing in for
  // an unverified product.
  imageUrl: text("image_url"),
  // Only populated for dataSource="brand_direct" -- the exact manufacturer
  // page a product's ingredient list/photo was scraped from. Surfaced as a
  // plain "Buy directly from {brand}" link when no affiliate link exists
  // (the common case today) -- NOT an affiliate link, no commission, just
  // the real page a user can already reach by searching the brand name.
  // Never set for openfda/dailymed/open_beauty_facts rows: the first two
  // have no single product page to link to, and OBF isn't a place to buy.
  sourceUrl: text("source_url"),
  // "Clean ingredient" / common-contact-allergen-avoidance flags -- see
  // db/ingredient-flags.ts for the full rationale and check list. null means
  // "not enough ingredient text to assess" (most openfda-only rows before
  // DailyMed resolution, and dailymed-resolved rows, which have no inactive-
  // ingredient data at all) -- the UI must treat null as "unknown," never as
  // "assumed clean." A non-null value is computed from the actual published
  // ingredient list, not a brand's own marketing claim.
  freeFromFlags: text("free_from_flags", { mode: "json" }).$type<string[] | null>(),
  // Contact allergens (db/contact-allergens.ts) the full ingredient list
  // CONTAINS -- the inverse of freeFromFlags, since a product holds only a
  // few of ~100 allergens. "fragrance" here means an undisclosed fragrance,
  // which may hide any fragrance allergen. null exactly when freeFromFlags
  // is null: unknown, never "free of everything."
  allergenHits: text("allergen_hits", { mode: "json" }).$type<string[] | null>(),
  // Percent strength per active id, parsed from the FDA label's exact
  // active-ingredient line (db/strength.ts) -- only openfda/dailymed rows
  // carry concentrations, so this is null for cosmetic sources and for the
  // ~5% of drug rows whose line can't be converted (a per-package amount
  // with no denominator). strengthKey is the same data flattened to a
  // sortable "active:pct|active:pct" string, set only when every active on
  // the row has a parsed strength, so "same actives at the same strengths"
  // (store-brand equivalents) is a plain indexed equality match.
  strengths: text("strengths", { mode: "json" }).$type<Record<string, number> | null>(),
  strengthKey: text("strength_key"),
  // "openfda" | "dailymed" | "open_beauty_facts" -- which pipeline produced
  // this row. verified=true only for openfda/dailymed (derived from what a
  // manufacturer legally filed with the FDA); false for open_beauty_facts
  // (crowd-sourced, unverified -- confirmed real junk entries exist in it
  // during spot-checks, see build_cosmetic_catalog.py). The UI must render
  // an unmistakable badge when verified is false -- never blend this with
  // the FDA-sourced rows without a visible distinction.
  dataSource: text("data_source").notNull().default("openfda"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(true),
  // From the openFDA NDC directory (tools/catalog_pipeline): "OTC MONOGRAPH
  // DRUG", "NDA", "ANDA", "UNAPPROVED HOMEOPATHIC", ... and "HUMAN OTC DRUG" /
  // "HUMAN PRESCRIPTION DRUG". null when the directory doesn't list the NDC
  // (most DailyMed-resolved rows) and for cosmetic sources.
  marketingCategory: text("marketing_category"),
  productType: text("product_type"),
  // The first package's NDC-directory description ("1 TUBE in 1 CARTON / 45
  // g in 1 TUBE"), for price per ounce (lib/equivalence.ts).
  packageDescription: text("package_description"),
  // ---- Prescription rows (rx_catalog.csv) --------------------------------
  // isRx rows are reference/handout data only. They must never reach a
  // consumer listing, search, match score, equivalence group, HSA tag,
  // affiliate link or the sitemap: every consumer query filters
  // isRx = false (lib/queries.ts OTC_ONLY; rx-exclusion.test.ts checks each
  // one). They live under the hidden "rx" concern, carry no activeIds /
  // strengths / ingredient memberships, and are only shown by the
  // flag-gated /rx pages and clinician handouts.
  isRx: integer("is_rx", { mode: "boolean" }).notNull().default(false),
  genericName: text("generic_name"), // "tretinoin", "clindamycin phosphate and benzoyl peroxide"
  rxGroup: text("rx_group"), // retinoid | acne | rosacea | corticosteroid | nonsteroidal | antifungal | other | oral
  strengthText: text("strength_text"), // "tretinoin 0.025%", "doxycycline hyclate 100 mg"
  route: text("route"), // "TOPICAL", "ORAL"
  // US topical steroid potency class 1 (superpotent) .. 7, from
  // db/steroid-potency.ts; null = not a steroid, or unclassified.
  steroidPotencyClass: integer("steroid_potency_class"),
  // Isotretinoin: a reference page only, never addable to a handout (iPLEDGE).
  informationalOnly: integer("informational_only", { mode: "boolean" }).notNull().default(false),
}, (table) => [index("products_strength_key_idx").on(table.strengthKey)]);

// One row per distinct normalized ingredient across every product's full
// ingredient list (db/ingredient-parse.ts), so each gets its own
// /ingredient/[slug] page. Rebuilt on every seed from the catalog CSVs --
// never hand-edited. `id` is the active id for tracked actives (so
// /ingredient/niacinamide and the actives table agree) and a slug of the
// normalized INCI name for everything else. productCount is denormalized
// for ordering/suggestions; aliases are the other spellings actually seen.
export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  productCount: integer("product_count").notNull().default(0),
});

// Membership + order. `position` is the 1-based place in the product's own
// list (INCI order is roughly descending concentration, but only for the
// cosmetic sources -- FDA inactive lists are not guaranteed ordered); 0 is
// <=0 is used for a drug label's active-ingredient line. rawName is the spelling
// as listed, so the product page shows the label's own text and links it.
export const productIngredients = sqliteTable(
  "product_ingredients",
  {
    productId: text("product_id").notNull().references(() => products.id),
    position: integer("position").notNull(),
    ingredientId: text("ingredient_id").notNull().references(() => ingredients.id),
    rawName: text("raw_name").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("product_ingredients_pk").on(table.productId, table.position),
    index("product_ingredients_ingredient_idx").on(table.ingredientId),
  ],
);

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
// One row per rater per (product, concern), so MIN_DERM_RATERS counts
// distinct dermatologists rather than submissions.
export const dermRatings = sqliteTable(
  "derm_ratings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: text("product_id").notNull().references(() => products.id),
    concernId: text("concern_id").notNull().references(() => concerns.id),
    raterId: integer("rater_id").notNull().references(() => dermRaters.id),
    score: integer("score").notNull(), // 0-100
    rubricJson: text("rubric_json", { mode: "json" }).$type<Record<string, number>>(),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("derm_ratings_product_concern_rater_idx").on(table.productId, table.concernId, table.raterId)],
);

// First-party outcome logging (project.md §5: "audience side = outcome
// score ... not scraped stars"). Written by the "Did this help?" form on
// each product page (api/products/[id]/outcome). One row per session per
// (product, concern) -- enforced by the unique index, same as routine
// votes, so a repeat submission updates the earlier answer instead of
// counting twice.
export const audienceOutcomes = sqliteTable(
  "audience_outcomes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: text("product_id").notNull().references(() => products.id),
    concernId: text("concern_id").notNull().references(() => concerns.id),
    sessionId: text("session_id").notNull(),
    improved: integer("improved", { mode: "boolean" }).notNull(),
    weeksUsed: integer("weeks_used"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("audience_outcomes_product_concern_session_idx").on(table.productId, table.concernId, table.sessionId),
  ],
);

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

// User-submitted skincare routines, one per concern, ranked by community
// vote score (lib/routines.ts computes the score from routine_votes; no
// stored score column, so it can never drift out of sync with the votes
// table). Unlike everything else on the site, this is unmoderated
// user-generated content with no verification step at all — see the
// disclaimer required on every routines page in app/routines/*. A report/
// moderation mechanism is a known gap, not an oversight; project.md §11
// should get an entry for it.
export const routines = sqliteTable("routines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  concernId: text("concern_id").notNull().references(() => concerns.id),
  authorName: text("author_name"), // optional, free text, not authenticated
  sessionId: text("session_id").notNull(), // anonymous submitter identity — see lib/session.ts
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// Ordered steps within a routine. description is always free text (e.g.
// "Cleanser — CeraVe Hydrating Cleanser"), but productId optionally links
// it to an exact catalog row -- added 2026-09-28 via a product-search
// picker in routine-form.tsx. Nullable and independent of description on
// purpose: a step can name a product without a catalog match (a brand we
// don't carry yet) or describe something that isn't a single product at
// all ("Sunscreen: reapply midday") -- the link is additive, never required.
export const routineSteps = sqliteTable("routine_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routineId: integer("routine_id").notNull().references(() => routines.id),
  stepOrder: integer("step_order").notNull(),
  description: text("description").notNull(),
  productId: text("product_id").references(() => products.id),
});

// One row per (routine, session) — the unique index is what actually
// enforces "one vote per session per routine", not application logic
// alone, so a race between two requests from the same session can't double
// up a vote.
export const routineVotes = sqliteTable(
  "routine_votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    routineId: integer("routine_id").notNull().references(() => routines.id),
    sessionId: text("session_id").notNull(),
    value: integer("value").notNull(), // 1 = upvote, -1 = downvote
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("routine_votes_routine_session_idx").on(table.routineId, table.sessionId)],
);

// The first piece of the routines moderation gap (see routines' comment
// above): a report signal, collected but NOT acted on automatically -- no
// auto-hide threshold, no admin review UI yet. Same pattern as
// rater_applications: query the DB directly for now. This is a deliberately
// scoped starting point (lowest-risk, most reversible of the options), not
// the final word on routines moderation -- a pre-publish review queue is a
// bigger, different decision that would change the submit-to-live UX itself.
export const routineReports = sqliteTable(
  "routine_reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    routineId: integer("routine_id").notNull().references(() => routines.id),
    sessionId: text("session_id").notNull(),
    reason: text("reason"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  // One report per session per routine -- prevents a single visitor from
  // inflating the signal by repeat-clicking, same principle as routine_votes.
  (table) => [uniqueIndex("routine_reports_routine_session_idx").on(table.routineId, table.sessionId)],
);

// A visitor's personal shelf (no account -- keyed by the anonymous session
// cookie, like routine votes). One row per (session, product): a product is
// either something they own, something they want, or a finished "empty".
// `opened` only means something for status = "own" (sealed vs in use).
export const shelfItems = sqliteTable(
  "shelf_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id").notNull(),
    productId: text("product_id").notNull().references(() => products.id),
    status: text("status").notNull(), // "own" | "want" | "empty"
    opened: integer("opened", { mode: "boolean" }).notNull().default(false),
    updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("shelf_items_session_product_idx").on(table.sessionId, table.productId),
    index("shelf_items_session_idx").on(table.sessionId),
  ],
);

// A visitor's personal AM/PM regimen (anonymous session cookie, like the
// shelf). One row per (session, product). `slot` is where the visitor put
// it -- "am", "pm" or "both"; the order within a slot isn't stored, it's
// derived from the product's formulation (lib/regimen.ts) so steps always
// layer thinnest to thickest with sunscreen last in the morning.
export const regimenItems = sqliteTable(
  "regimen_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id").notNull(),
    productId: text("product_id").notNull().references(() => products.id),
    slot: text("slot").notNull(), // "am" | "pm" | "both"
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("regimen_items_session_product_idx").on(table.sessionId, table.productId),
    index("regimen_items_session_idx").on(table.sessionId),
  ],
);

// The Drug Facts "how to use" sections of each product's FDA label, keyed by
// SPL set id (products.splSetId), fetched by
// tools/catalog_pipeline/fetch_label_sections.py. Verbatim label text --
// shown as "From the FDA label", never paraphrased. Catalog data: wiped and
// reloaded by every seed.
export const labelSections = sqliteTable("label_sections", {
  splSetId: text("spl_set_id").primaryKey(),
  effectiveTime: text("effective_time"),
  directions: text("directions"),
  warnings: text("warnings"),
  doNotUse: text("do_not_use"),
  whenUsing: text("when_using"),
  stopUse: text("stop_use"),
  askDoctor: text("ask_doctor"),
});

// Prescribing-information sections for the Rx catalog, keyed by SPL set id
// (tools/catalog_pipeline/build_rx_catalog.py). Verbatim label text, each
// section capped at ~6,000 characters by the pipeline. Catalog data: wiped
// and reloaded by every seed.
export const rxLabelSections = sqliteTable("rx_label_sections", {
  splSetId: text("spl_set_id").primaryKey(),
  effectiveTime: text("effective_time"),
  indications: text("indications"),
  dosageAndAdministration: text("dosage_and_administration"),
  boxedWarning: text("boxed_warning"),
  contraindications: text("contraindications"),
  warnings: text("warnings"),
  pregnancy: text("pregnancy"),
  lactation: text("lactation"),
});

// ---------------------------------------------------------------------------
// Optional email (lib/identity.ts). There are still no accounts or
// passwords: a person is just a verified email address that one or more
// anonymous browser sessions have been linked to by a magic link.
//
// homeSessionId is the session id all of a person's session-keyed rows
// (shelf, regimen, outcomes, votes, routines) live under. It is a fresh
// random id that is never handed out as a cookie; each linked browser keeps
// its own sw_session cookie, and lib/session.ts resolves that cookie to the
// home id through person_sessions. So every existing session-keyed query
// keeps working unchanged, and signing out one device is just deleting its
// alias row. All timestamps in these tables are ISO 8601 UTC strings set in
// JS (not current_timestamp), so string comparison orders them correctly.
export const people = sqliteTable("people", {
  id: text("id").primaryKey(), // random uuid
  email: text("email").notNull().unique(), // lowercased + trimmed
  homeSessionId: text("home_session_id").notNull().unique(),
  emailVerifiedAt: text("email_verified_at").notNull(), // a row only exists once verified
  checkinsEnabled: integer("checkins_enabled", { mode: "boolean" }).notNull().default(true),
  safetyAlertsEnabled: integer("safety_alerts_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

// Browser session (sw_session cookie value) -> person. A session links to
// at most one person; a person can have many (phone, laptop).
export const personSessions = sqliteTable(
  "person_sessions",
  {
    sessionId: text("session_id").primaryKey(),
    personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    linkedAt: text("linked_at").notNull(),
  },
  (table) => [index("person_sessions_person_idx").on(table.personId)],
);

// One-time sign-in links. Only the SHA-256 of the token is stored, so a
// database leak can't be replayed into sign-ins. Single use (usedAt) and
// short-lived (expiresAt, ~15 minutes); the cron job purges rows a day after
// expiry. requestSessionId is the browser that asked, so its shelf is saved
// too when the link is opened on another device.
export const emailTokens = sqliteTable(
  "email_tokens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tokenHash: text("token_hash").notNull().unique(),
    email: text("email").notNull(),
    requestSessionId: text("request_session_id"),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("email_tokens_email_idx").on(table.email, table.createdAt)],
);

// Longitudinal outcome check-ins (lib/checkins.ts): when a person with a
// verified email marks a shelf product as opened, one row per follow-up
// point (2, 4, 8, 12 weeks). productId deliberately has no FK to products:
// db:seed's orphan check aborts on dangling user-data FKs, and a check-in
// for a product that later leaves the catalog should just stop, not block a
// deploy. status: scheduled -> sending -> sent, or skipped | cancelled |
// expired | failed.
export const checkins = sqliteTable(
  "checkins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    concernId: text("concern_id").notNull(),
    weeks: integer("weeks").notNull(),
    startedAt: text("started_at").notNull(),
    dueAt: text("due_at").notNull(),
    status: text("status").notNull().default("scheduled"),
    attempts: integer("attempts").notNull().default(0),
    claimedAt: text("claimed_at"),
    sentAt: text("sent_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("checkins_person_product_weeks_idx").on(table.personId, table.productId, table.weeks),
    index("checkins_status_due_idx").on(table.status, table.dueAt),
  ],
);

// The answers: time-stamped observations of how a concern is going on a
// product, one per check-in (answering again corrects it). This is the
// longitudinal data asset (project.md §5); audience_outcomes stays the
// one-row-per-person input to the public User Score, fed from the 8-week
// answer (see recordCheckinAnswer in lib/checkins.ts).
export const outcomeObservations = sqliteTable(
  "outcome_observations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    checkinId: integer("checkin_id").unique().references(() => checkins.id, { onDelete: "cascade" }),
    personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    concernId: text("concern_id").notNull(),
    weeks: integer("weeks").notNull(), // weeks since starting the product
    answer: text("answer").notNull(), // "better" | "same" | "worse" | "stopped"
    reaction: integer("reaction", { mode: "boolean" }), // null = not answered
    observedAt: text("observed_at").notNull(),
  },
  (table) => [index("outcome_observations_product_idx").on(table.productId, table.concernId)],
);

// FDA drug recalls from the openFDA enforcement API (lib/recalls.ts). Not
// touched by db:seed; refreshed incrementally by the cron job.
export const recalls = sqliteTable(
  "recalls",
  {
    recallNumber: text("recall_number").primaryKey(), // e.g. "D-0419-2025"
    eventId: text("event_id"),
    classification: text("classification"), // "Class I" | "Class II" | "Class III"
    status: text("status"), // "Ongoing" | "Completed" | "Terminated" | ...
    reasonForRecall: text("reason_for_recall"),
    productDescription: text("product_description").notNull(),
    codeInfo: text("code_info"),
    recallingFirm: text("recalling_firm"),
    recallInitiationDate: text("recall_initiation_date"), // YYYY-MM-DD
    reportDate: text("report_date"), // YYYY-MM-DD
    terminationDate: text("termination_date"),
    productNdcs: text("product_ndcs", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    brandNames: text("brand_names", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    fetchedAt: text("fetched_at").notNull(),
  },
  (table) => [index("recalls_report_date_idx").on(table.reportDate)],
);

// Recall -> catalog product, with how we matched and how sure we are.
// confidence >= 0.9 is an identifier match (NDC or barcode) and is the only
// kind emailed; lower values are conservative brand+firm text matches,
// shown on the product page as "may be affected". Rebuilt on every recall
// sync, so no FK to products (same db:seed reasoning as checkins).
export const recallMatches = sqliteTable(
  "recall_matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recallNumber: text("recall_number").notNull().references(() => recalls.recallNumber, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    matchType: text("match_type").notNull(), // "ndc" | "ndc_text" | "upc" | "text"
    confidence: real("confidence").notNull(),
    matchedOn: text("matched_on").notNull(),
  },
  (table) => [
    uniqueIndex("recall_matches_recall_product_idx").on(table.recallNumber, table.productId),
    index("recall_matches_product_idx").on(table.productId),
  ],
);

// "Exactly once per recall per person": the unique index is the guarantee.
// A row is claimed (status "sending") before the email goes out.
export const recallNotifications = sqliteTable(
  "recall_notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    recallNumber: text("recall_number").notNull(),
    productId: text("product_id").notNull(),
    status: text("status").notNull(), // "sending" | "sent" | "failed"
    attempts: integer("attempts").notNull().default(1),
    claimedAt: text("claimed_at").notNull(),
    sentAt: text("sent_at"),
  },
  (table) => [uniqueIndex("recall_notifications_person_recall_idx").on(table.personId, table.recallNumber)],
);

// Small key/value store for background-job bookkeeping (last recall sync,
// newest report_date seen).
export const jobState = sqliteTable("job_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
