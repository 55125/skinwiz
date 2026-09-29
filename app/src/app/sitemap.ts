import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { products, concerns } from "@/db/schema";
import { siteUrl } from "@/lib/site-url";
import { getPublicIngredientIds } from "@/lib/queries";

const STATIC_PAGES = ["/browse", "/ingredients", "/routines", "/about", "/for-clinicians"];

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
  const productRows = db.select({ id: products.id }).from(products).all();
  const SITE_URL = siteUrl();

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...STATIC_PAGES.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...concernRows.map((c) => ({
      url: `${SITE_URL}/concern/${c.id}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...getPublicIngredientIds().map((i) => ({
      url: `${SITE_URL}/ingredient/${encodeURIComponent(i.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...productRows.map((p) => ({
      url: `${SITE_URL}/product/${encodeURIComponent(p.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
