# SkinWiz — app

The MVP web app: browse skincare products by active ingredient across 8
concerns (acne, sun protection, antifungal, antidandruff, anti-itch, dry
skin/eczema, excessive sweating, brightening & texture), each with a dual
score model (Derm Score / Audience Score) in the spirit of Rotten
Tomatoes' critic/audience split, plus video-review search links (YouTube/
TikTok/Instagram), site search, "top" showcases, and community-submitted,
voted-on routines — see `../project.md` for the full product brief.

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

Re-run `db:seed` any time — it wipes and reloads catalog/reference data
(concerns, actives, products, affiliate links), but **not** `dermRatings`,
`audienceOutcomes`, `dermRaters`, or `rater_applications` — those are real
user-submitted data once they exist, and this script runs on every deploy
(see the repo-root `Dockerfile`), so wiping them there would mean losing
real submissions on every redeploy. Verified by inserting a test row and
re-running the seed before this was relied on in production.

## Deployment

Live on Railway (project `skinwiz`), deployed 2026-09-27 from the
repo-root `Dockerfile` — not `app/`-scoped, because `db/seed.ts` resolves
the catalog CSVs via a relative `../tools/...` path and the container
needs `tools/` alongside `app/` for that to keep working unchanged.

- **Persistent volume** mounted at `/data`; `DATABASE_PATH=/data/skinwiz.db`
  env var (see `src/db/client.ts`) points SQLite at it instead of the
  container's ephemeral filesystem, which is wiped on every redeploy.
- **Startup command** runs `db:push` (idempotent schema sync) then
  `db:seed` then `next start` on every boot — see the note above on why
  that's safe for catalog data but must never touch the user-data tables.
- **`/` and `/sitemap.xml` are forced dynamic** (`export const dynamic =
  "force-dynamic"`) rather than statically generated. The Docker build
  runs `next build` *before* the database is seeded (no volume is mounted
  during the build stage) — a static build would have queried an empty
  database once and baked that in permanently. This is what caused the
  first deploy attempt to fail outright (see below) before being fixed.
- **Node 22, not 20**, in the Dockerfile — `better-sqlite3@13` requires it;
  Node 20 didn't just warn, it segfaulted during the production build.

No Postgres migration needed for this — SQLite-on-a-volume is a
reasonable choice for an MVP at this traffic level; revisit if real
concurrent write load ever shows up (see `src/db/client.ts`'s comment on
swapping to `drizzle-orm/postgres-js`).

## What's real vs. not

This matters more than usual for a health product — read before demoing.

**Real:**
- All products, brand names, active ingredients, and exact concentrations
  — pulled live from openFDA + DailyMed + Open Beauty Facts + brand-direct
  scraping (`tools/catalog_pipeline/`), not fabricated. 17,509 as of
  2026-09-27 (15,255 FDA-sourced across 7 drug concerns; 2,248 in the
  Brightening & Texture concern across 14 cosmetic actives, split across
  two trust tiers below) — run `npm run db:seed` and read its printed
  count for the current total, it grows as the catalog pipeline is re-run.
- **Product photos, where a source has one.** `products.imageUrl`
  (`src/db/schema.ts`) is populated from Open Beauty Facts'
  `image_front_url` and each brand-direct page's own JSON-LD product photo
  — 1,633 of 17,509 products as of 2026-09-28. The ~15,255 openFDA/DailyMed
  products have no image field in either source at all and render a plain
  "No photo yet" placeholder (`src/components/product-card.tsx`) instead of
  a broken image or a stock photo standing in for an unverified product —
  a real, disclosed coverage gap, not a bug. OBF photos are hotlinked
  (an open database built for exactly that kind of reuse); the 53
  brand-direct photos are downloaded and self-hosted at
  `public/product-images/brand-direct/` instead, since those are
  commercial product photography scraped off a retail page with no license
  to embed live from the brand's own CDN — see
  `tools/catalog_pipeline/README_cosmetic.md`.
- **Three distinct trust tiers, never blended silently**
  (`src/lib/data-source.ts`, `products.dataSource`/`verified` in
  `src/db/schema.ts`): openFDA/DailyMed (a manufacturer's legal FDA
  filing — no badge, the default), brand-direct (scraped from a brand's
  own published product page — The Ordinary and CeraVe, 48 products; blue
  "Brand-verified" badge), and Open Beauty Facts (crowd-edited — real junk
  entries found in it during testing, e.g. a `"TESTBRAND"` test product;
  amber "Community-sourced" badge). Every non-default tier renders its
  badge on both the card and detail page
  (`src/components/product-card.tsx`, `src/app/product/[id]/page.tsx`) —
  see `tools/catalog_pipeline/README_cosmetic.md` and the brand-direct
  script's docstring for both sources' specifics.
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
- Search (`/search`, `src/lib/queries.ts`'s `searchProducts`/`searchActives`)
  is a real substring match against brand name, manufacturer, and the raw
  ingredient text — not FTS5/ranked relevance, but genuinely queries the
  full catalog, not a canned subset.
- "Top Actives" on the homepage is a real signal — an actual count of how
  many catalog products contain each active (`getTopActives`, via SQLite's
  `json_each` over `products.active_ids`), not a guess.
- Routine vote scores (`routine_votes`) are real, unfaked community votes
  once someone posts and others vote — see the routines section below for
  what "real" doesn't cover here (no moderation).

**Demo/placeholder — do not treat as real:**
- **"Top Products" on the homepage is not a quality ranking.** There's no
  popularity or rating signal to rank by yet (Derm Score / Audience Score
  are still empty for everything), so it orders by data-source trust tier
  first, then rotates randomly within tier (`getTopProducts`). The UI
  caption says this explicitly — don't remove that caption without
  replacing the underlying logic with a real signal first.
- **Routines have zero moderation.** Anyone can post a routine and it's
  live immediately — no review step, no report mechanism, unlike every
  other form of content on the site (products are sourced/verified,
  evidence notes are dermatologist-only). Every routines page carries a
  visible disclaimer (`src/components/routine-disclaimer.tsx`) for this
  reason. A moderation/reporting flow is a real gap for actual launch, not
  an oversight — flag it in `project.md` §11 if it isn't already there.
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
- No moderation/reporting mechanism for routines (see above) — the single
  biggest content-safety gap on the site right now.
- No product-linked routine steps — a step is free text (e.g. "Cleanser:
  CeraVe Hydrating Cleanser"), not a reference to an actual catalog row.
  Linking would need a product-search picker component this pass didn't
  build.
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
src/lib/data-source.ts   the three-tier trust badge logic — see above
src/lib/routines.ts   routine queries + vote upsert (computed score, never stored)
src/lib/session.ts    anonymous session cookie for routine submission/voting
src/app/              routes: / , /concern/[slug] , /product/[id] , /about ,
                      /for-clinicians , /search , /routines , /routines/[id] , /routines/new
```
