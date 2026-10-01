#!/usr/bin/env python3
"""
Mine public App Store, Google Play, and Reddit mentions of a competitor app
(default target: SkinSort), classify each into complaint themes, and output
complaints_raw.csv + a ranked complaints_summary.csv.

Must run locally with real internet access — see README.md.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass, field

import pandas as pd
import requests

# Reddit's API rules ask for a real contact in the User-Agent; set
# SKINWIZ_CONTACT (an email or URL) rather than shipping a placeholder.
_CONTACT = os.environ.get("SKINWIZ_CONTACT")
USER_AGENT = f"activelyskin-complaint-miner/0.1 (contact: {_CONTACT})" if _CONTACT else "activelyskin-complaint-miner/0.1"

# Each theme mirrors a row in project.md §4's complaint table, plus an "other"
# catch-all. baseline_severity reflects the manual severity read in that
# table; compute_severity() bumps it when the underlying review/rating is
# itself very negative.
THEMES: dict[str, dict] = {
    "score_validity": {
        "label": "Personalized match score doesn't predict real-world results",
        "baseline_severity": "high",
        "keywords": [
            "match score", "compatibility score", "personalized score",
            "score doesn't", "score means nothing", "score was wrong",
            "didn't work for my skin", "broke me out", "algorithm doesn't know",
            "score% ", "match %", "inaccurate recommendation", "not personalized",
        ],
    },
    "paywall": {
        "label": "Aggressive paywall / subscription",
        "baseline_severity": "medium",
        "keywords": [
            "paywall", "pay wall", "subscription", "free trial", "3-day trial", "3 day trial",
            "hard to cancel", "auto renew", "auto-renew", "scan limit",
            "upsell", "per week", "$6/wk", "too expensive", "cancel my subscription",
            "money back", "refund", "unsubscribe", "charged", "deducted", "deduction",
        ],
    },
    "contradictory_routine": {
        "label": "Routine logic contradicts itself",
        "baseline_severity": "medium",
        "keywords": [
            "contradict", "conflicting advice", "doesn't make sense",
            "says not to combine", "then tells me to use them together",
            "recommends combining", "flags a conflict",
        ],
    },
    "avoided_ingredient_recommended": {
        "label": "Avoided ingredients still recommended",
        "baseline_severity": "high",
        "keywords": [
            "avoid list", "ingredient i'm allergic", "i'm allergic to",
            "still recommended", "flagged as avoid", "recommended anyway",
            "i said to avoid", "on my avoid list",
        ],
    },
    "bugs": {
        "label": "Bugs / blank pages / slow app",
        "baseline_severity": "low",
        "keywords": [
            "crash", "crashes", "bug", "blank page", "won't load", "wont load",
            "freezes", "freezing", "slow", "glitch", "broken", "keeps loading",
            "stuck on", "error message", "won't let me log", "can't log in",
            "cannot login", "sign in with", "won't redirect",
        ],
    },
    "no_context": {
        "label": "No seasonal/climate/location context",
        "baseline_severity": "low",
        "keywords": [
            "seasonal", "climate", "humidity", "winter routine", "summer routine",
            "doesn't account for location", "weather",
        ],
    },
    "ingredient_claim_accuracy": {
        "label": "Ingredient-claim accuracy disputed",
        "baseline_severity": "high",
        "keywords": [
            "claim is wrong", "not backed by science", "misleading",
            "fake science", "no evidence", "made up", "pseudoscience",
            "not scientifically accurate", "misinformation",
        ],
    },
    "other": {
        "label": "Other / uncategorized",
        "baseline_severity": "unknown",
        "keywords": [],
    },
}

THEME_PRIORITY = [k for k in THEMES if k != "other"] + ["other"]
SEVERITY_WEIGHT = {"low": 1, "medium": 2, "high": 3, "unknown": 1}
WEIGHT_SEVERITY = {1: "low", 2: "medium", 3: "high"}


@dataclass
class Record:
    source: str
    date: str | None
    rating: int | None
    text: str
    url: str | None
    matched_themes: list[str] = field(default_factory=list)
    primary_theme: str = "other"
    severity: str = "unknown"


def classify(text: str) -> tuple[list[str], str]:
    lowered = text.lower()
    hits: dict[str, int] = {}
    for key, theme in THEMES.items():
        if key == "other":
            continue
        count = sum(1 for kw in theme["keywords"] if kw in lowered)
        if count:
            hits[key] = count
    if not hits:
        return [], "other"
    matched = sorted(hits, key=lambda k: (-hits[k], THEME_PRIORITY.index(k)))
    return matched, matched[0]


def compute_severity(theme_key: str, rating: int | None) -> str:
    weight = SEVERITY_WEIGHT[THEMES[theme_key]["baseline_severity"]]
    if rating is not None and rating <= 2:
        weight = min(3, weight + 1)
    return WEIGHT_SEVERITY[weight]


def make_record(source: str, text: str, date: str | None, rating: int | None, url: str | None) -> Record | None:
    text = (text or "").strip()
    if not text:
        return None
    matched, primary = classify(text)
    return Record(
        source=source,
        date=date,
        rating=rating,
        text=text,
        url=url,
        matched_themes=matched,
        primary_theme=primary,
        severity=compute_severity(primary, rating),
    )


def fetch_app_store_reviews(app_id: str, country: str, max_pages: int, sleep: float) -> list[Record]:
    records: list[Record] = []
    for page in range(1, max_pages + 1):
        url = (
            f"https://itunes.apple.com/{country}/rss/customerreviews/"
            f"id={app_id}/sortby=mostrecent/page={page}/json"
        )
        try:
            resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=20)
            resp.raise_for_status()
            entries = resp.json().get("feed", {}).get("entry", [])
        except Exception as exc:
            print(f"[app_store] page {page} failed: {exc}", file=sys.stderr)
            break
        if not entries:
            break
        page_records = 0
        for entry in entries:
            content = entry.get("content", {}).get("label")
            rating_raw = entry.get("im:rating", {}).get("label")
            if content is None or rating_raw is None:
                continue  # first entry on page 1 is feed metadata, not a review
            rec = make_record(
                source="app_store",
                text=content,
                date=entry.get("updated", {}).get("label"),
                rating=int(rating_raw),
                url=entry.get("id", {}).get("label"),
            )
            if rec:
                records.append(rec)
                page_records += 1
        if page_records == 0:
            break
        time.sleep(sleep)
    return records


def fetch_google_play_reviews(package_name: str, country: str, lang: str, max_count: int, sleep: float) -> list[Record]:
    try:
        from google_play_scraper import Sort, reviews
    except ImportError:
        print("[play] google-play-scraper not installed, skipping", file=sys.stderr)
        return []
    records: list[Record] = []
    token = None
    while len(records) < max_count:
        batch_size = min(200, max_count - len(records))
        try:
            result, token = reviews(
                package_name,
                lang=lang,
                country=country,
                sort=Sort.NEWEST,
                count=batch_size,
                continuation_token=token,
            )
        except Exception as exc:
            print(f"[play] fetch failed: {exc}", file=sys.stderr)
            break
        if not result:
            break
        for entry in result:
            rec = make_record(
                source="google_play",
                text=entry.get("content", ""),
                date=str(entry.get("at")) if entry.get("at") else None,
                rating=entry.get("score"),
                url=f"https://play.google.com/store/apps/details?id={package_name}&reviewId={entry.get('reviewId')}",
            )
            if rec:
                records.append(rec)
        if token is None:
            break
        time.sleep(sleep)
    return records


def _reddit_get(url: str, params: dict, sleep: float) -> dict | None:
    try:
        resp = requests.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=20)
        resp.raise_for_status()
        time.sleep(sleep)
        return resp.json()
    except Exception as exc:
        print(f"[reddit] request to {url} failed: {exc}", file=sys.stderr)
        return None


def fetch_reddit_posts_and_comments(query: str, max_posts: int, fetch_comments: bool, sleep: float) -> list[Record]:
    records: list[Record] = []
    after = None
    posts_seen = 0
    while posts_seen < max_posts:
        params = {"q": query, "sort": "new", "limit": 100, "t": "all"}
        if after:
            params["after"] = after
        data = _reddit_get("https://www.reddit.com/search.json", params, sleep)
        if not data:
            break
        children = data.get("data", {}).get("children", [])
        if not children:
            break
        for child in children:
            post = child.get("data", {})
            posts_seen += 1
            text = f"{post.get('title', '')} {post.get('selftext', '')}"
            rec = make_record(
                source="reddit_post",
                text=text,
                date=str(post.get("created_utc")),
                rating=None,
                url=f"https://www.reddit.com{post.get('permalink', '')}",
            )
            if rec:
                records.append(rec)

            if fetch_comments and post.get("permalink"):
                comment_data = _reddit_get(
                    f"https://www.reddit.com{post['permalink']}.json", {"limit": 200}, sleep
                )
                if comment_data and isinstance(comment_data, list) and len(comment_data) > 1:
                    for comment_child in comment_data[1].get("data", {}).get("children", []):
                        comment = comment_child.get("data", {})
                        body = comment.get("body", "")
                        if query.lower() not in body.lower():
                            continue  # only keep comments that independently mention the target
                        rec = make_record(
                            source="reddit_comment",
                            text=body,
                            date=str(comment.get("created_utc")),
                            rating=None,
                            url=f"https://www.reddit.com{post.get('permalink', '')}{comment.get('id', '')}",
                        )
                        if rec:
                            records.append(rec)

            if posts_seen >= max_posts:
                break
        after = data.get("data", {}).get("after")
        if not after:
            break
    return records


def build_summary(df: pd.DataFrame) -> pd.DataFrame:
    total = len(df)
    rows = []
    for key, theme in THEMES.items():
        subset = df[df["primary_theme"] == key]
        if subset.empty and key != "other":
            continue
        rows.append({
            "theme": key,
            "label": theme["label"],
            "baseline_severity": theme["baseline_severity"],
            "count": len(subset),
            "pct_of_total": round(100 * len(subset) / total, 1) if total else 0.0,
            "count_app_store": int((subset["source"] == "app_store").sum()),
            "count_google_play": int((subset["source"] == "google_play").sum()),
            "count_reddit": int(subset["source"].isin(["reddit_post", "reddit_comment"]).sum()),
            "avg_rating": round(subset["rating"].dropna().mean(), 2) if subset["rating"].notna().any() else None,
            "high_severity_count": int((subset["severity"] == "high").sum()),
        })
    summary = pd.DataFrame(rows).sort_values("count", ascending=False).reset_index(drop=True)
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app-store-id", help="Numeric App Store app id, e.g. 1502396717")
    parser.add_argument("--play-package", help="Google Play package id, e.g. com.example.skinsort")
    parser.add_argument("--reddit-query", default="skinsort", help="Search term for Reddit posts/comments")
    parser.add_argument("--country", default="us")
    parser.add_argument("--lang", default="en")
    parser.add_argument("--max-app-store-pages", type=int, default=10, help="~50 reviews/page, RSS caps around 500 total")
    parser.add_argument("--max-play-reviews", type=int, default=500)
    parser.add_argument("--max-reddit-posts", type=int, default=250)
    parser.add_argument("--no-reddit-comments", action="store_true", help="Skip fetching per-post comment trees (faster, less data)")
    parser.add_argument("--skip-app-store", action="store_true")
    parser.add_argument("--skip-play", action="store_true")
    parser.add_argument("--skip-reddit", action="store_true")
    parser.add_argument("--sleep", type=float, default=1.0, help="Delay between requests, seconds")
    parser.add_argument("--out-dir", default=".")
    args = parser.parse_args()

    records: list[Record] = []

    if not args.skip_app_store:
        if not args.app_store_id:
            print("[app_store] no --app-store-id given, skipping", file=sys.stderr)
        else:
            print("Fetching App Store reviews...")
            records += fetch_app_store_reviews(args.app_store_id, args.country, args.max_app_store_pages, args.sleep)

    if not args.skip_play:
        if not args.play_package:
            print("[play] no --play-package given, skipping", file=sys.stderr)
        else:
            print("Fetching Google Play reviews...")
            records += fetch_google_play_reviews(args.play_package, args.country, args.lang, args.max_play_reviews, args.sleep)

    if not args.skip_reddit:
        print("Fetching Reddit posts/comments...")
        records += fetch_reddit_posts_and_comments(
            args.reddit_query, args.max_reddit_posts, not args.no_reddit_comments, args.sleep
        )

    if not records:
        print("No records fetched — check app id/package/query and network access.", file=sys.stderr)
        sys.exit(1)

    df = pd.DataFrame([{
        "source": r.source,
        "date": r.date,
        "rating": r.rating,
        "text": r.text,
        "url": r.url,
        "matched_themes": ";".join(r.matched_themes),
        "primary_theme": r.primary_theme,
        "severity": r.severity,
    } for r in records])

    raw_path = f"{args.out_dir}/complaints_raw.csv"
    summary_path = f"{args.out_dir}/complaints_summary.csv"
    df.to_csv(raw_path, index=False)
    build_summary(df).to_csv(summary_path, index=False)

    print(f"\n{len(df)} records -> {raw_path}")
    print(f"Summary -> {summary_path}")


if __name__ == "__main__":
    main()
