import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Dynamic so the sitemap URL reflects the runtime environment, not the
// build container (which has no public domain).
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
