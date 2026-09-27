# SkinWiz — app

The MVP web app: browse OTC acne + sun-protection products by active
ingredient, each with a dual score model (Derm Score / Audience Score),
in the spirit of Rotten Tomatoes' critic/audience split — see
`../project.md` for the full product brief.

Built overnight (2026-09-27) as a first pass — see "What's real vs. not"
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
- All 6,653 products, brand names, active ingredients, and exact
  concentrations — pulled live from openFDA (`tools/catalog_pipeline/`),
  not fabricated.
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
- **Affiliate prices and buy links** (27 of 6,653 products). No affiliate
  account is approved yet (see `../tools/affiliate_feeds/README.md`), so
  these are synthetic mock-feed rows, and every one of them renders with a
  visible "Demo — not a live price" badge (`isDemo` in the schema
  defaults `true`). Don't strip that badge without a real feed behind it.
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
src/db/actives.ts     canonical active-ingredient definitions + synonym matching
src/db/seed.ts        loads tools/catalog_pipeline + tools/affiliate_feeds CSVs
src/lib/scoring.ts    the dual-score threshold logic
src/lib/queries.ts    all DB reads, used by pages
src/app/              routes: / , /concern/[slug] , /product/[id] , /about , /for-clinicians
```
