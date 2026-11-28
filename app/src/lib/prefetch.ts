// Cloudflare rate-limits /concern/* per IP ("Concern flood — rate limit",
// >30 requests in 10 s). Next.js prefetches every <Link> that scrolls into
// view, so a page that lists all the concerns (nav, footer, home grid) could
// send 10+ /concern/ requests at once and get a real phone visitor blocked
// (seen Nov 27 2026). Links to concern pages therefore load on click only.
export function linkPrefetch(href: string): false | undefined {
  return href.startsWith("/concern/") ? false : undefined;
}
