import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

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
          "SemrushBot", "AhrefsBot", "MJ12bot", "DotBot", "DataForSeoBot", "BLEXBot",
        ],
        disallow: "/",
      },
      { userAgent: "*", allow: "/", disallow: ["/api/", "/search"] },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
