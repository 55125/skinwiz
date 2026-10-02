import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { concerns } from "@/db/schema";
import { siteUrl } from "@/lib/site-url";
import { canonicalProductIds, getPublicIngredientIds } from "@/lib/queries";
import { getTopRoutines } from "@/lib/routines";
import { FREE_FROM_CHECKS } from "@/db/ingredient-flags";
import { ALLERGEN_GROUPS, CONTACT_ALLERGENS } from "@/db/contact-allergens";
import { FEATURES } from "@/lib/feature-flags";

const STATIC_PAGES = ["/browse", "/ingredients", "/allergens", "/routines", "/check", "/about", "/for-clinicians", "/privacy", "/terms"];

// Force dynamic (query the DB per-request) rather than the default static
// generation: a static sitemap would be computed once at build time,
// against whatever the database happens to contain at that moment (empty,
// if the seed step hasn't run yet — this crashed the production build
// before this was added), and would then go stale until the next deploy
// even after that. The catalog grows independently of deploys (re-running
// the pipeline + db:seed doesn't rebuild the app), so a sitemap baked in
// at build time would silently drift from the real catalog.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const concernRows = db.select({ id: concerns.id }).from(concerns).all();
  // Duplicate FDA listings (same product, several pack-size codes) are left
  // out: each page's canonical points at the one listed here.
  const productIds = canonicalProductIds();
  // Net-downvoted community routines aren't worth pointing crawlers at.
  const routineRows = getTopRoutines(5000).filter((r) => r.score >= 0);
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
    ...[...ALLERGEN_GROUPS, ...CONTACT_ALLERGENS].map((a) => ({
      url: `${SITE_URL}/allergens/${a.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...getPublicIngredientIds().map((i) => ({
      url: `${SITE_URL}/ingredient/${encodeURIComponent(i.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...routineRows.map((r) => ({
      url: `${SITE_URL}/routines/${r.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    ...productIds.map((id) => ({
      url: `${SITE_URL}/product/${encodeURIComponent(id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
