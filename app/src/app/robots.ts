import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { openForReview } from "@/lib/review-mode";

// Dynamic so the sitemap URL reflects the runtime environment, not the
// build container (which has no public domain).
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Search engines are welcome; bulk crawlers and AI-training scrapers are not.
      // (Compliant bots honor this; src/proxy.ts refuses the rest.)
      {
        userAgent: [
          "GPTBot", "CCBot", "ClaudeBot", "Claude-Web", "anthropic-ai",
          "Bytespider", "Amazonbot", "Google-Extended", "Applebot-Extended",
          "meta-externalagent", "Diffbot", "ImagesiftBot", "Omgilibot", "cohere-ai", "PetalBot",
          // SEO crawlers are let in while OPEN_FOR_REVIEW is on (lib/review-mode.ts).
          ...(openForReview() ? [] : ["SemrushBot", "AhrefsBot", "MJ12bot", "DotBot", "DataForSeoBot", "BLEXBot"]),
        ],
        disallow: "/",
      },
      // /h/ links are private claim links printed on clinician handouts.
      // "/*?": filtered, sorted and paged listing URLs are all noindex
      // (lib/seo.ts variantRobots) and Google was spending most of its crawl on
      // them (170k crawled, deep /browse filter combinations timing out).
      // Every indexed page has a query-free URL, except the A-Z ingredient
      // directory's letters. Next's own assets stay crawlable for rendering.
      {
        userAgent: "*",
        allow: ["/", "/_next/", "/ingredients?letter="],
        disallow: ["/api/", "/search", "/shelf", "/profile", "/avoid", "/h/", "/clinicians", "/regimen", "/*?"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
