# SkinWiz — app

The MVP web app: browse skincare products by active ingredient across 8
concerns (acne, sun protection, antifungal, antidandruff, anti-itch, dry
skin/eczema, excessive sweating, brightening & texture), each with a dual
score model (Derm Score / Audience Score) in the spirit of Rotten
Tomatoes' critic/audience split, plus video-review search links (YouTube/
TikTok/Instagram) — see `../project.md` for the full product brief.

Built overnight (2026-09-27), expanded same-day — see "What's real vs. not"
below before treating anything here as launch-ready.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui (base-ui),
Drizzle ORM. SQLite locally for zero-setup dev; the schema
(`src/db/schema.ts`) is written to be portable to Postgres (Supabase/Neon,
per `project.md`'s cost table) at deploy time — swap `drizzle-orm/better-sqlite3`
for `drizzle-orm/postgres-js` in `src/db/client.ts`, nothing else changes.

## Run it

```bash
npm install
npm run db:push    # creates data/skinwiz.db from src/db/schema.ts
npm run db:seed    # loads the real openFDA catalog + demo affiliate data
npm run dev
```

Re-run `db:seed` any time — it wipes and reloads, so it's safe to repeat.

## What's real vs. not

This matters more than usual for a health product — read before demoing.

**Real:**
- All products, brand names, active ingredients, and exact concentrations
  — pulled live from openFDA + DailyMed + Open Beauty Facts
  (`tools/catalog_pipeline/`), not fabricated. 16,482 as of 2026-09-27
  (15,255 FDA-sourced across 7 drug concerns; 1,227 community-sourced
  cosmetic products in the new Brightening & Texture concern — see the two
  trust tiers below) — run `npm run db:seed` and read its printed count for
  the current total, it grows as the catalog pipeline is re-run.
- **Two distinct trust tiers, never blended silently.** `products.verified`
  is `true` for openFDA/DailyMed rows (derived from what a manufacturer
  legally filed with the FDA) and `false` for Open Beauty Facts rows
  (crowd-edited — real junk entries were found in it during testing, e.g.
  a `"TESTBRAND"` test product). Every unverified product renders a visible
  "Community-sourced, not FDA-verified" badge on both the card and detail
  page (`src/components/product-card.tsx`, `src/app/product/[id]/page.tsx`)
  — see `tools/catalog_pipeline/README_cosmetic.md`.
- **Product identity is barcode/NDC-keyed on purpose.** A repackaged or
  reformulated relaunch gets a new barcode in practice (GS1 convention), so
  it becomes a new catalog row instead of overwriting what an existing
  link/review pointed at — see the `products` table comment in
  `src/db/schema.ts`. Known accepted gap: a silent reformulation with no
  barcode change won't be caught.
- The empty derm-rating and audience-outcome states. **No dermatologist
  has rated anything and no user has logged an outcome yet** — that's
  reality, not a bug, and the UI is built to show "not yet rated" honestly
  rather than fabricate a trust signal. `MIN_DERM_RATERS = 5` and
  `MIN_AUDIENCE_OUTCOMES = 10` (`src/lib/scoring.ts`) gate when a score is
  even allowed to display, per project.md §5.
- Evidence notes (`src/db/actives.ts`) are factual/regulatory descriptions
  (what an FDA monograph active is, typical concentration) — deliberately
  not a clinical efficacy grade. `evidenceGrade` stays `null` in the schema
  until a verified dermatologist sets one; nothing here invents one.

**Demo/placeholder — do not treat as real:**
- **Affiliate prices and buy links** (27 products total, all acne). No
  affiliate account is approved yet (see
  `../tools/affiliate_feeds/README.md`), so these are synthetic mock-feed
  rows, and every one of them renders with a visible "Demo — not a live
  price" badge (`isDemo` in the schema defaults `true`). Don't strip that
  badge without a real feed behind it.
- **Video review links are search links, not curated results**, for the
  same reason: YouTube/TikTok/Instagram have no accessible free search API
  for a small/solo site to actually fetch and vet specific videos (see
  `src/lib/video-links.ts`). The one exception is YouTube, which does have
  a real (optional) integration: set `YOUTUBE_API_KEY` and run
  `npm run fetch:youtube-videos` to cache real top results into
  `video_links` — quota-limited to ~90 products/run by default, so it's a
  slow-build-up, not a one-shot fill. Until that's run, every product falls
  back to the plain search-link buttons, clearly labeled as such in the UI.
- **The Terms of Service section on `/about`** is explicitly labeled draft,
  pending the attorney review `project.md` §11 still has open. Don't ship
  it as final legal language.
- **Brand names are FDA label text, unedited.** Some are marketing
  taglines rather than clean product names (see
  `tools/catalog_pipeline/README.md`'s known-issues section) — truncated
  with CSS `line-clamp`, not cleaned up. A normalization pass is still
  open work.

## What's not built yet

- The `/for-clinicians` interest form writes to `rater_applications` but
  there's no admin view to read submissions yet (query the SQLite file
  directly for now: `SELECT * FROM rater_applications;`).
- No auth, no user accounts, no first-party outcome-logging UI yet (the
  `audience_outcomes` table exists but nothing writes to it) — that's the
  next real feature once there's something to log against.
- No search, only per-concern browsing + an active-ingredient filter chip
  row.
- Import pipeline, character-shift logic, etc. from the wizard architecture
  in the *other* project this workspace's CLAUDE.md describes (StoryPlume)
  are unrelated — don't confuse the two codebases.

## Structure

```
src/db/schema.ts     Drizzle schema — read the comments, several fields
                      encode a deliberate integrity decision (see above)
src/db/actives.ts     canonical active-ingredient + concern definitions, synonym matching
src/db/seed.ts        loads tools/catalog_pipeline + tools/affiliate_feeds CSVs
src/db/fetch-youtube-videos.ts   optional, real YouTube API fetch — see above
src/lib/scoring.ts    the dual-score threshold logic
src/lib/queries.ts    all DB reads, used by pages
src/lib/video-links.ts   review search-link builder (YouTube/TikTok/Instagram)
src/app/              routes: / , /concern/[slug] , /product/[id] , /about , /for-clinicians
```
