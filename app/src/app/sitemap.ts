import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { products, concerns } from "@/db/schema";

// NEXT_PUBLIC_SITE_URL isn't set anywhere yet — there's no deployed domain
// (project.md §11 open decision). Falls back to localhost so this doesn't
// crash in dev; set the env var once a real domain exists.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const concernRows = db.select({ id: concerns.id }).from(concerns).all();
  const productRows = db.select({ id: products.id }).from(products).all();

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...concernRows.map((c) => ({
      url: `${SITE_URL}/concern/${c.id}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...productRows.map((p) => ({
      url: `${SITE_URL}/product/${encodeURIComponent(p.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
