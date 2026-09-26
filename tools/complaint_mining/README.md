# mine_complaints.py

Pulls public App Store, Google Play, and Reddit mentions of a competitor app
(default target: SkinSort), classifies each into one of 8 complaint themes
(matching `project.md` §4), and writes:

- `complaints_raw.csv` — one row per review/post/comment, with matched theme(s), primary theme, and severity
- `complaints_summary.csv` — ranked theme counts, source breakdown, avg rating, high-severity count

Feed `complaints_summary.csv` back into the §4 complaint table in `project.md`
to replace the manual frequency estimates with real counts.

## Must run locally

This can't run from a sandboxed Claude Code environment — that environment's
network egress is limited to package registries (pypi, npm, github, etc.),
not to `apple.com`, `play.google.com`, or `reddit.com`. Run it from your own
machine.

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

## Rate limits & etiquette

- App Store RSS: unauthenticated, but the feed only exposes roughly the
  most recent 500 reviews (10 pages × 50) per country — that's a hard
  ceiling on `--max-app-store-pages`, not a script bug.
- Google Play: `google-play-scraper` scrapes the public web UI, no API key,
  but batch size >200/request is unreliable — the script already batches at 200.
- Reddit: uses the unauthenticated public `.json` search/comment endpoints
  with a 1s default delay (`--sleep`) between requests. Cloud/datacenter IPs
  are sometimes blocked outright by Reddit — if requests fail on a VPS but
  work from your laptop, that's why.

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
