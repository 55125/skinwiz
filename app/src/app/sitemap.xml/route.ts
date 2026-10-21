import { siteUrl } from "@/lib/site-url";
import { SITEMAP_PARTS } from "@/lib/sitemap";

// The sitemap index robots.txt points at: one child sitemap per page type
// (app/sitemaps/sitemap.ts), so Search Console reports indexing per type.
export const dynamic = "force-dynamic";

export function GET() {
  const base = siteUrl();
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...SITEMAP_PARTS.map((id) => `<sitemap><loc>${base}/sitemaps/sitemap/${id}.xml</loc></sitemap>`),
    "</sitemapindex>",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
