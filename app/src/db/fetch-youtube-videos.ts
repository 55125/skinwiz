// Populates video_links with real YouTube search results, via the YouTube
// Data API v3. Opt-in and manual — not run automatically, and does nothing
// without a real YOUTUBE_API_KEY (get one free at
// console.cloud.google.com, enable "YouTube Data API v3").
//
// Why this isn't a live per-pageview fetch: the free quota is 10,000
// units/day and search.list costs 100 units per call — 100 searches/day,
// nowhere near enough for a catalog in the thousands. This script instead
// processes a bounded batch per run (--limit, default 90, leaving quota
// headroom) and caches results in video_links; re-run it periodically
// (e.g. daily via cron) to slowly build up coverage. Products already in
// video_links are skipped, so repeated runs make forward progress.
//
// TikTok and Instagram have no equivalent here — see
// src/lib/video-links.ts's comment for why (no accessible free search API
// for a small/solo site for either).
import { notInArray, sql } from "drizzle-orm";
import { db } from "./client";
import { products, videoLinks } from "./schema";

const API_KEY = process.env.YOUTUBE_API_KEY;
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "90", 10);

type YouTubeSearchItem = {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
};

async function searchYouTube(query: string): Promise<YouTubeSearchItem[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "3");
  url.searchParams.set("key", API_KEY!);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.items ?? [];
}

async function main() {
  if (!API_KEY) {
    console.log("YOUTUBE_API_KEY is not set — nothing to do. Every product falls back to the");
    console.log("plain YouTube search link in src/lib/video-links.ts until this is set.");
    return;
  }

  const alreadyFetched = db.selectDistinct({ productId: videoLinks.productId }).from(videoLinks).all();
  const alreadyFetchedIds = alreadyFetched.map((r) => r.productId);

  const candidates = db
    .select({ id: products.id, brandName: products.brandName })
    .from(products)
    .where(alreadyFetchedIds.length > 0 ? notInArray(products.id, alreadyFetchedIds) : sql`1=1`)
    .limit(LIMIT)
    .all();

  console.log(`Fetching YouTube results for ${candidates.length} products (${alreadyFetchedIds.length} already cached)...`);

  let done = 0;
  for (const product of candidates) {
    const query = `${product.brandName.split(/\s+/).slice(0, 6).join(" ")} review`;
    try {
      const items = await searchYouTube(query);
      for (const item of items) {
        db.insert(videoLinks)
          .values({
            productId: product.id,
            platform: "youtube",
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? null,
            publishedAt: item.snippet.publishedAt,
          })
          .run();
      }
      done++;
    } catch (err) {
      console.error(`  ${product.id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`Done. Fetched for ${done}/${candidates.length} products.`);
}

main();
