import type { NextRequest } from "next/server";
import { serveDailymedImage } from "@/lib/product-images/serve";

// DailyMed package photos, pre-rendered to WebP on the persistent volume by
// the image sync (lib/product-images/sync.ts). Served by a route handler
// rather than next/image: the optimizer's cache lives in .next/ inside the
// container and is lost on every deploy, so it would re-process (and
// re-download) thousands of label images after each release on our single
// instance. Fixed renditions made once, at sync time, are cheaper and never
// touch DailyMed on a visitor's request. The path ends in .webp, so the
// anti-scrape proxy doesn't run for it (see src/proxy.ts matcher).
export async function GET(request: NextRequest, ctx: RouteContext<"/img/dm/[setid]/[key]/[file]">) {
  return serveDailymedImage(await ctx.params, { ifNoneMatch: request.headers.get("if-none-match") });
}

export async function HEAD(request: NextRequest, ctx: RouteContext<"/img/dm/[setid]/[key]/[file]">) {
  return serveDailymedImage(await ctx.params, { head: true });
}
