import type { MetadataRoute } from "next";
import { SITEMAP_PARTS, sitemapPart, type SitemapPart } from "@/lib/sitemap";

// One sitemap per page type at /sitemaps/sitemap/<part>.xml, listed by the
// index at /sitemap.xml (app/sitemap.xml/route.ts). Built from the DB per
// request (lib/sitemap.ts says why).
export const dynamic = "force-dynamic";

export async function generateSitemaps() {
  return SITEMAP_PARTS.map((id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  return (SITEMAP_PARTS as readonly string[]).includes(id) ? sitemapPart(id as SitemapPart) : [];
}
