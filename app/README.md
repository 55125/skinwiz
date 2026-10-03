# Actively Skin — app

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
npm run db:migrate # creates/upgrades data/skinwiz.db from drizzle/ migrations
npm run db:seed    # loads the real openFDA catalog + demo affiliate data
npm run dev
```

**Schema changes:** edit `src/db/schema.ts`, run `npm run db:generate`,
and review the SQL it writes to `drizzle/` before committing — that file
is exactly what runs against production on the next boot. Don't use
`drizzle-kit push`: it bypasses the migration history.

Re-run `db:seed` any time — it reloads catalog/reference data (concerns,
actives, products, affiliate links) inside one transaction, so a failure
rolls back to the previous catalog. Rows in derived tables (`ewg_scores`,
`video_links`) for products that left the catalog are deleted, and
routine steps linked to them keep their text but lose the link. It does
**not** touch `dermRatings`,
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

- **Custom domain** `activelyskin.com` (+ `www`), DNS on Cloudflare as
  CNAMEs to Railway with the proxy off (grey cloud). `SITE_URL` is set to
  the apex in Railway; the old `skinwiz-production.up.railway.app` still
  serves too, but canonical URLs point at the apex.
- **Persistent volume** mounted at `/data`; `DATABASE_PATH=/data/skinwiz.db`
  env var (see `src/db/client.ts`) points SQLite at it instead of the
  container's ephemeral filesystem, which is wiped on every redeploy.
- **Startup command** runs `db:migrate` (applies pending `drizzle/`
  migrations; a database created by the old `db:push` flow is adopted by
  marking the baseline as applied) then `db:seed` then `next start` on
  every boot — see the note above on why
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

## Email, outcome check-ins and recall alerts

Optional email on top of the anonymous `sw_session` cookie — still no
accounts or passwords.

- **Identity** (`src/lib/identity.ts`, `people` / `person_sessions` in
  `src/db/schema.ts`). Entering an email sends a one-time link (stored as a
  SHA-256 hash, 15-minute expiry, single use). The link opens
  `/email/verify`, which only *shows* a confirm button — mail scanners
  prefetch links, so a GET must never use the token up. Confirming creates
  (or finds) the person and links the browser. A person's data lives under
  a random `homeSessionId` that is never a cookie; each linked browser's
  cookie is an alias, and `lib/session.ts` resolves it, so every existing
  session-keyed query follows the person to new devices unchanged. Linking
  an anonymous browser merges its shelf/regimen/outcomes/votes into the
  person (newer shelf row and outcome win; one vote per person survives).
  `/account` has preferences, sign-out (unlinks the device and gives it a
  fresh cookie) and "delete my email and data" (really deletes).
- **Sending** (`src/lib/email.ts`). Resend's HTTP API when `RESEND_API_KEY`
  is set; otherwise every email is printed to the server console, so the
  whole flow works locally with no account. Check-in and recall emails
  carry `List-Unsubscribe` + `List-Unsubscribe-Post` (one-click) headers and
  a footer link; each respects its own preference.
- **Check-ins** (`src/lib/checkins.ts`, `checkin-schedule.ts`). Marking an
  owned product "In use" (the opened toggle) with a verified email and
  check-ins on schedules 2/4/8/12-week rows in `checkins`. The email's
  answer buttons (better / same / worse / stopped) open
  `/checkin/[signed token]` with the answer pre-selected; one tap on "Save
  answer" records an `outcome_observations` row (with an optional
  reaction flag). Again a confirm tap rather than record-on-GET, because
  link scanners open all four links. **User Score rule:** only the 8-week
  answer feeds `audience_outcomes` (the 12-week answer stands in if 8 was
  never answered); better = improved, same/worse = not improved, stopped
  = not scored (kept as an observation for drop-out analysis). This keeps
  the score "% reporting improvement at 8 weeks" (project.md §5) and one
  row per person.
- **Recalls** (`src/lib/recalls.ts`, `recall-match.ts`). Drug recalls from
  the openFDA enforcement API, pulled incrementally by `report_date`
  (at most every 6 hours; an incremental sync is one or two requests,
  paced well under openFDA's limits; `OPENFDA_API_KEY` optional), plus a
  weekly status refresh of matched, still-open recalls. Matching: NDC from
  `openfda.product_ndc` (confidence 1.0), NDC printed in the recall text
  (0.95), barcode / drug UPC (0.9–0.95); otherwise a conservative
  same-firm + every-distinctive-name-word text match (0.6–0.75, never when
  the recall lists its own different NDC, never across product forms).
  Matches show as a banner on the product page and under "Safety alerts" on
  `/shelf`; only identifier matches (≥ 0.9) are emailed, once per recall
  per person (unique index on `recall_notifications`), and only for recalls
  reported in the last year that aren't terminated.
  `npm run recalls:backfill` loads the last 3 years (`-- --years=N`;
  `-- --rematch-only` re-runs matching without fetching).

### The cron job

`POST /api/cron/run` with `Authorization: Bearer $CRON_SECRET` runs the
recall sync + alerts, sends due check-ins and purges expired sign-in
tokens. Idempotent and safe to call every hour (rows are claimed before
sending; a second overlapping call gets 409). The anti-scrape proxy lets
`/api/cron/*` through only when the bearer secret is correct. Outside
production, `?now=2026-12-01T00:00:00Z` fakes the clock; `?jobs=checkins`
limits what runs.

Schedule it hourly — not set up yet. Either:

1. **Railway cron service** (same project): new service from the
   `curlimages/curl` image (or any image with curl), Settings → Cron
   Schedule `0 * * * *`, start command
   `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://activelyskin.com/api/cron/run`,
   with `CRON_SECRET` set as a shared/reference variable. The service runs,
   exits, and is billed only for those seconds.
2. **External pinger** (cron-job.org, GitHub Actions `schedule:`, etc.)
   sending the same POST with the header.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_SECRET` | production | 32+ random chars; signs check-in and unsubscribe links (`openssl rand -base64 48`). Rotating it invalidates links in emails already sent. |
| `CRON_SECRET` | for the job | 24+ random chars; bearer token for `/api/cron/run`. |
| `RESEND_API_KEY` | to send real email | Without it, email is logged to the console. |
| `EMAIL_FROM` | with Resend | e.g. `Actively <hello@mail.activelyskin.com>`; must be on a domain verified in Resend. |
| `EMAIL_REPLY_TO` | no | Where replies go (e.g. the legal inbox). |
| `OPENFDA_API_KEY` | no | Raises openFDA's limit from 1,000 to 120,000 requests/day; not needed at hourly cadence. |
| `SITE_URL` | already set | Base for links in emails. Set it to `http://localhost:PORT` when testing locally. |

### Owner setup before turning on real email

1. Create a Resend account and add a sending domain — a subdomain such as
   `mail.activelyskin.com` keeps the apex's reputation separate.
2. Add the DNS records Resend shows, in Cloudflare (DNS only / grey cloud):
   the DKIM `TXT` record (`resend._domainkey…`), the SPF `TXT` and `MX`
   records on the `send.` bounce subdomain, then a DMARC record, e.g.
   `_dmarc.activelyskin.com TXT "v=DMARC1; p=none; rua=mailto:<you>"`
   (tighten to `quarantine` once reports look clean). Wait for "Verified".
3. In Railway set `RESEND_API_KEY`, `EMAIL_FROM`, `APP_SECRET`,
   `CRON_SECRET` (and optionally `EMAIL_REPLY_TO`, `OPENFDA_API_KEY`).
4. Deploy (migration `0008` adds the new tables), run
   `npm run recalls:backfill` once in the Railway shell (or let the first
   cron run fetch the same 3 years), then add the hourly cron.

## Affiliate links and live prices

### Manual affiliate links (no env vars needed)

Before Sovrn approves a site it offers no API key, script or price API, only
short links made by hand in its dashboard (`https://sovrn.co/<code>`), and
the approval review starts after the first real click on one. Those links
live in `../tools/affiliate_feeds/manual_links.csv`
(`product_id,retailer,url,size_label,added_at`), which `npm run db:seed`
loads into `manual_affiliate_links` (migration `0014`) on every deploy. A
product with rows shows them in its "Where to buy" section as
"Buy at Walmart (8 oz)" with the affiliate disclosure, `rel="sponsored
nofollow noopener"`, and no price.

- Only `https://sovrn.co/...` URLs are accepted (`MANUAL_LINK_HOSTS` in
  `src/lib/manual-links.ts`); the seed logs and skips anything else, an
  unknown product, or an Rx product, and the page read checks again.
- Never open these links from a script or test: an automated click can count
  as invalid traffic on the Sovrn account.

## What's real vs. not

This matters more than usual for a health product — read before demoing.

**Real:**
- All products, brand names, active ingredients, and exact concentrations
  — pulled live from openFDA + DailyMed + Open Beauty Facts + brand-direct
  scraping (`tools/catalog_pipeline/`), not fabricated. 17,698 as of
  2026-09-28 (15,255 FDA-sourced across 7 drug concerns; 2,437 cosmetic
  products split between Brightening & Texture and Dry Skin & Eczema based
  on which tracked actives a product actually contains — see "actual-fit
  concern tagging" in `tools/catalog_pipeline/README_cosmetic.md` — across
  two trust tiers below) — run `npm run db:seed` and read its printed count
  for the current total, it grows as the catalog pipeline is re-run.
- **Product photos, where a source has one.** `products.imageUrl`
  (`src/db/schema.ts`) is populated from Open Beauty Facts'
  `image_front_url` and each brand-direct page's own product photo (JSON-LD
  for The Ordinary/CeraVe, the Shopify catalog API for Naturium/COSRX/First
  Aid Beauty, Skinfix, Vanicream) — 1,633+ of 17,698 products as of
  2026-09-28. The ~15,255
  openFDA/DailyMed products have no image field in either source at all and
  render a plain "No photo yet" placeholder (`src/components/product-card.tsx`)
  instead of a broken image or a stock photo standing in for an unverified
  product — a real, disclosed coverage gap, not a bug. OBF photos are
  hotlinked (an open database built for exactly that kind of reuse); all
  205 brand-direct photos are downloaded and self-hosted at
  `public/product-images/brand-direct/` instead, since those are
  commercial product photography scraped off a retail page with no license
  to embed live from the brand's own CDN — see
  `tools/catalog_pipeline/README_cosmetic.md`.
- **"Buy directly" links for brand-direct products.** `products.sourceUrl`
  stores the exact manufacturer page a brand-direct row was scraped from,
  surfaced on the product page as a plainly-labeled non-affiliate link
  ("we don't earn a commission on this one") whenever no real affiliate
  link exists for that product — which today is almost always, since only
  27 demo affiliate rows exist. Not shown for Open Beauty Facts rows (not a
  place to buy) or openFDA/DailyMed rows (no single product page to link).
- **Three distinct trust tiers, never blended silently**
  (`src/lib/data-source.ts`, `products.dataSource`/`verified` in
  `src/db/schema.ts`): openFDA/DailyMed (a manufacturer's legal FDA
  filing — no badge, the default), brand-direct (scraped from a brand's
  own published product page — The Ordinary, CeraVe, Naturium, COSRX,
  First Aid Beauty, Skinfix, and Vanicream, 241 products; blue
  "Brand-verified" badge), and Open
  Beauty Facts (crowd-edited — real junk entries found in it during
  testing, e.g. a `"TESTBRAND"` test product; amber "Community-sourced"
  badge). Every non-default tier renders its badge on both the card and
  detail page (`src/components/product-card.tsx`,
  `src/app/product/[id]/page.tsx`) — see
  `tools/catalog_pipeline/README_cosmetic.md` and the brand-direct script's
  docstring for every source's specifics.
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
  full catalog, not a canned subset. **Filters added 2026-09-28**: by
  concern, by trust tier, and by ingredient-based flags (below) — all
  server-rendered toggle links, no client JS, same query-param approach as
  the existing active-ingredient chips on `/concern/[slug]`.
- **"Clean ingredient" and common-contact-allergen filters**
  (`src/db/ingredient-flags.ts`, `products.freeFromFlags`) — computed
  directly from each product's own published ingredient list (openFDA's
  Inactive Ingredients section, included for the first time; OBF's/brand-
  direct's full INCI list), not from a brand's marketing claims or a
  certification. `null` means "not enough ingredient text to assess"
  (short active-only lines, or DailyMed-resolved rows, which have no
  inactive-ingredient data at all) and is never treated as "assumed
  clean." v1, not exhaustive — a real dermatologist reviewing/extending
  the contact-allergen half would be genuinely valuable.
- "Top Actives" on the homepage is a real signal — an actual count of how
  many catalog products contain each active (`getTopActives`, via SQLite's
  `json_each` over `products.active_ids`), not a guess.
- Routine vote scores (`routine_votes`) are real, unfaked community votes
  once someone posts and others vote. **Routine steps can link to a real
  catalog product** (`routine_steps.productId`, added 2026-09-28 via
  `product-picker.tsx`'s search-as-you-type) — optional, additive to the
  free-text description, never required, and a stale/removed product id
  just makes the step render as plain text again.

**Demo/placeholder — do not treat as real:**
- **"Top Products" on the homepage is not a quality ranking.** There's no
  popularity or rating signal to rank by yet (Derm Score / Audience Score
  are still empty for everything), so it orders by data-source trust tier
  first, then rotates randomly within tier (`getTopProducts`). The UI
  caption says this explicitly — don't remove that caption without
  replacing the underlying logic with a real signal first.
- **Routines have a report flow, not a review queue.** Anyone can still
  post a routine and it goes live immediately with no pre-publish check —
  what changed 2026-09-28 is that every routine page now has a "Report
  this routine" link (`src/components/routine-report.tsx`) writing to
  `routine_reports`. This is signal collection only: no auto-hide
  threshold, no admin view yet (query the DB directly, same as
  `rater_applications`). A real pre-publish queue is a bigger, different
  decision still open in `project.md` §11 if stronger protection is wanted.
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
- **Brand names are FDA label text, capitalization-normalized only.**
  ~16% of openFDA/DailyMed brand names came back either ALL-CAPS or
  all-lowercase straight from the SPL label text — `normalizeBrandName()`
  in `src/db/seed.ts` now Title-Cases those (preserving known acronyms
  like SPF/UV/CC so they don't get mangled into "Spf"), but this only
  fixes capitalization. Some names are still verbose marketing copy or
  full shade lists concatenated into one string (see
  `tools/catalog_pipeline/README.md`'s known-issues section) — genuinely
  shortening those without risking fabricated/wrong product names would
  need per-brand judgment, not a safe blanket text transform, so it's
  still open work.

## What's not built yet

- The `/for-clinicians` interest form writes to `rater_applications` but
  there's no admin view to read submissions yet (query the SQLite file
  directly for now: `SELECT * FROM rater_applications;`).
- No auth, no user accounts, no first-party outcome-logging UI yet (the
  `audience_outcomes` table exists but nothing writes to it) — that's the
  next real feature once there's something to log against.
- Routines have a report flow (see above) but still no pre-publish review
  queue — anyone's routine still goes live immediately.
- No admin UI for `routine_reports` either — same "query the DB directly"
  situation as `rater_applications` above.
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
