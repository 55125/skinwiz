// Temporary "open the doors" switch for affiliate-network reviews (Impact,
// CJ, Sovrn), approved by the owner on 2026-10-03. With OPEN_FOR_REVIEW=on:
//   - the bot filter (lib/anti-scrape.ts) swaps its per-visitor limits for
//     one high ceiling (LIMITS.review) that any review tool or screenshot
//     service stays far below; AI-training crawlers, scraping frameworks
//     and direct scraping of the JSON endpoints are still refused;
//   - robots.txt stops disallowing SEO crawlers (Semrush, Ahrefs...), whose
//     traffic and backlink estimates affiliate managers use to size a site.
// AI-training crawlers stay disallowed in robots.txt either way. Unset it
// once the applications are decided. Read per request: no rebuild needed.
export function openForReview(): boolean {
  const v = process.env.OPEN_FOR_REVIEW?.trim().toLowerCase();
  return v === "on" || v === "1" || v === "true";
}
