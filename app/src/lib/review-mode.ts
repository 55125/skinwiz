// Temporary "open the doors" switch for affiliate-network reviews (Impact,
// CJ, Sovrn), approved by the owner on 2026-10-03. With OPEN_FOR_REVIEW=on:
//   - src/proxy.ts skips bot checks and rate limits, so any review tool or
//     screenshot service gets in, but still refuses AI-training crawlers
//     and scraping frameworks (anti-scrape.ts alwaysBlockedCrawler);
//   - robots.txt stops disallowing SEO crawlers (Semrush, Ahrefs...), whose
//     traffic and backlink estimates affiliate managers use to size a site.
// AI-training crawlers stay disallowed in robots.txt either way. Unset it
// once the applications are decided. Read per request: no rebuild needed.
export function openForReview(): boolean {
  const v = process.env.OPEN_FOR_REVIEW?.trim().toLowerCase();
  return v === "on" || v === "1" || v === "true";
}
