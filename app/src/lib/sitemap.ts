import type { MetadataRoute } from "next";
import { ne } from "drizzle-orm";
import { db } from "@/db/client";
import { RX_CONCERN_ID } from "@/db/rx";
import { concerns } from "@/db/schema";
import { siteUrl } from "@/lib/site-url";
import { canonicalProductIds } from "@/lib/queries";
import { getIndexableIngredientIds } from "@/lib/ingredient-index";
import { getTopRoutines } from "@/lib/routines";
import { FREE_FROM_CHECKS } from "@/db/ingredient-flags";
import { ALLERGEN_GROUPS, CONTACT_ALLERGENS } from "@/db/contact-allergens";
import { getEquivalenceGroups } from "@/lib/otc-index";
import { FEATURES } from "@/lib/feature-flags";
import { ttlCache } from "@/lib/ttl-cache";

const STATIC_PAGES = ["/browse", "/ingredients", "/allergens", "/same", "/guide/hsa-fsa-eligible", "/routines", "/check", "/about", "/for-clinicians", "/clinic-tools", "/contact", "/privacy", "/terms", "/accessibility"];

// The sitemap is split by page type (app/sitemap.xml is the index, each part
// is app/sitemaps/sitemap.ts), so Search Console reports indexing per type.
// Parts are built per request from the DB, not at build time: the catalog
// grows independently of deploys (re-running the pipeline + db:seed doesn't
// rebuild the app), and the build container's database may be empty.
export const SITEMAP_PARTS = ["pages", "ingredients", "products", "routines"] as const;
export type SitemapPart = (typeof SITEMAP_PARTS)[number];

// Crawlers fetch these repeatedly, so each part is built at most every 10 minutes.
export const sitemapPart = ttlCache((part: SitemapPart): MetadataRoute.Sitemap => {
  switch (part) {
    case "pages":
      return pagesPart();
    case "ingredients":
      return getIndexableIngredientIds().map((id) => ({
        url: `${siteUrl()}/ingredient/${encodeURIComponent(id)}`,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      }));
    case "products":
      // Duplicate FDA listings (same product, several pack-size codes) are
      // left out: each page's canonical points at the one listed here.
      return canonicalProductIds().map((id) => ({
        url: `${siteUrl()}/product/${encodeURIComponent(id)}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    case "routines":
      // Net-downvoted community routines aren't worth pointing crawlers at.
      return getTopRoutines(5000)
        .filter((r) => r.score >= 0)
        .map((r) => ({ url: `${siteUrl()}/routines/${r.id}`, changeFrequency: "weekly" as const, priority: 0.4 }));
  }
});

function pagesPart(): MetadataRoute.Sitemap {
  // Never the hidden prescription concern; no /rx, /clinicians or /h URLs
  // either (the Rx pages are noindex for now, handouts are private).
  const concernRows = db.select({ id: concerns.id }).from(concerns).where(ne(concerns.id, RX_CONCERN_ID)).all();
  const SITE_URL = siteUrl();

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...STATIC_PAGES.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    // Gated clinical content: listed only once it's switched on.
    ...(FEATURES.PREGNANCY_MODE ? [{ url: `${SITE_URL}/guide/pregnancy-breastfeeding`, changeFrequency: "monthly" as const, priority: 0.7 }] : []),
    ...concernRows.map((c) => ({
      url: `${SITE_URL}/concern/${c.id}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...FREE_FROM_CHECKS.map((c) => ({
      url: `${SITE_URL}/guide/${c.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    // Only groups with 2+ labelers exist at all (lib/equivalence.ts).
    ...getEquivalenceGroups().map((g) => ({
      url: `${SITE_URL}/same/${g.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...[...ALLERGEN_GROUPS, ...CONTACT_ALLERGENS].map((a) => ({
      url: `${SITE_URL}/allergens/${a.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
