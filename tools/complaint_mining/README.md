# mine_complaints.py

Pulls public App Store, Google Play, and Reddit mentions of a competitor app
(default target: SkinSort), classifies each into one of 8 complaint themes
(matching `project.md` §4), and writes:

- `complaints_raw.csv` — one row per review/post/comment, with matched theme(s), primary theme, and severity
- `complaints_summary.csv` — ranked theme counts, source breakdown, avg rating, high-severity count

Feed `complaints_summary.csv` back into the §4 complaint table in `project.md`
to replace the manual frequency estimates with real counts.

## Must run somewhere with real network egress

Some sandboxed Claude Code environments only allow egress to package
registries (pypi, npm, github, etc.), not to `apple.com`, `play.google.com`,
or `reddit.com`. If that's the case where you're running this, run it from
your own machine instead. (Confirmed working from a Claude Code server
environment with normal internet access on 2026-09-27 — see "Known source
status" below for what actually worked.)

## Setup

```bash
pip install -r requirements.txt
```

## Find the target app's IDs

- **App Store id**: open the app's App Store page, the id is the number in
  the URL after `id`, e.g. `apps.apple.com/us/app/skinsort/id1502396717` → `1502396717`.
- **Google Play package**: open the Play Store page, the id is the `id=`
  query param, e.g. `play.google.com/store/apps/details?id=com.skinsort.app`.

Neither is hardcoded in the script — pass them as flags so this works for
any competitor, not just SkinSort.

For SkinSort specifically (looked up 2026-09-27): App Store id `6478040418`,
Google Play package `com.skinsort` — same bundle id on both stores.

## Run

```bash
python mine_complaints.py \
  --app-store-id 1502396717 \
  --play-package com.skinsort.app \
  --reddit-query skinsort \
  --out-dir .
```

Use `--skip-app-store` / `--skip-play` / `--skip-reddit` to run a subset
(e.g. while iterating on theme keywords, skip the slow Reddit comment fetch
with `--skip-play --skip-app-store`).

`--no-reddit-comments` skips fetching the comment tree under each matched
post (faster, but you'll only see post titles/selftext, not comment-level
complaints).

## Tuning the classifier

Theme keyword lists live in the `THEMES` dict at the top of
`mine_complaints.py`. They're seeded from the manual complaint themes in
`project.md` §4 — after a first run, skim `complaints_raw.csv` rows that
landed in `other` and add keywords/phrases you see repeating.

## Known source status (as of 2026-09-27, live run against SkinSort)

- **App Store RSS — dead.** `itunes.apple.com/*/rss/customerreviews/...`
  returns a valid empty feed (200 OK, no `entry` key) for every app tested,
  including high-review apps like Instagram, in both `us` and `gb`. This is
  Apple's side, not a SkinSort- or code-specific issue — the RSS reviews
  feed appears to have been effectively retired. The community
  `app-store-scraper` PyPI package is not a fix either: it pins
  `requests==2.23.0`/`urllib3<2`, which are incompatible with modern Python
  (3.13+) — don't sink time into it. If iOS review data is worth the
  cost, the real options are Apple's App Store Connect API (requires being
  the app's own developer — not usable against a competitor) or a paid
  third-party review-aggregation API (e.g. AppFollow, Appbot).
- **Google Play — works, but capped.** `google-play-scraper`'s `Sort.NEWEST`
  pagination exhausts after roughly 150–200 reviews regardless of
  `--max-play-reviews` — that's Play's own unauthenticated-scraping limit,
  not a script bug. Good enough for a first read, not for exhaustive
  coverage.
- **Reddit — blocked from server IPs.** The public `.json` search/comment
  endpoints now redirect to a login wall (`/login/?reason=lor2`) when hit
  from a datacenter/server IP, regardless of `User-Agent`. Confirmed via
  direct `curl` from this environment, not just the script. Run the Reddit
  half of this from a residential/laptop IP, or skip straight to the PRAW
  (OAuth) path below.

## Scaling beyond this script

- **Reddit volume**: the public `.json` endpoints are fine for a few hundred
  posts but get rate-limited and miss older content. For real volume,
  register a Reddit app and use `PRAW` (OAuth) instead — same theme
  classifier, swap the fetch layer.
- **TikTok**: no public unauthenticated search API. Options if TikTok
  chatter becomes worth mining: a paid scraping API (e.g. Apify's TikTok
  scraper), or manually export a list of video/comment URLs and run them
  through `classify()` directly.
- **Comment coverage on Reddit**: the script only keeps comments that
  themselves mention the query term, to avoid pulling in generic replies
  from an unrelated sub-thread. If that's too conservative, drop that
  filter in `fetch_reddit_posts_and_comments` to keep every comment on a
  matched post.
