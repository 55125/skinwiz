// Points FDA products' image_url at their synced DailyMed package photo.
// Used by the seed (every deploy rebuilds products with image_url null for
// FDA rows) and by the sync after each download. Only rows whose renditions
// are actually on disk are linked, so a page never shows a broken image --
// if the volume's image directory goes missing, products fall back to the
// no-photo layout until the sync refills it.
import fs from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { dailymedImageUrl } from "@/lib/image-urls";
import { imageDir, imagePath } from "./storage";

// open_beauty_facts / brand_direct photos are usually nicer retail shots and
// are never replaced; Rx rows carry dataSource "openfda" too.
const FDA_SOURCES = sql`('openfda', 'dailymed')`;

export function renditionsExist(setid: string, key: string, root = imageDir()): boolean {
  const full = imagePath(setid, key, "full", root);
  const thumb = imagePath(setid, key, "thumb", root);
  return !!full && !!thumb && fs.existsSync(full) && fs.existsSync(thumb);
}

/** Links one set id's products to its image (or clears a stale DailyMed link with key = null). */
export function linkSetImage(setid: string, key: string | null): number {
  const url = key ? dailymedImageUrl(setid, key) : null;
  return db.run(sql`
    UPDATE products SET image_url = ${url}
    WHERE spl_set_id = ${setid} AND data_source IN ${FDA_SOURCES}
      AND (image_url IS NULL OR image_url LIKE '/img/dm/%')`).changes;
}

/** Every synced image that's on disk -> its products. Returns { sets, products } linked. */
export function linkAllDailymedImages(root = imageDir()): { sets: number; products: number; missingFiles: number } {
  const rows = db.all<{ setid: string; key: string }>(
    sql`SELECT spl_set_id AS setid, image_key AS key FROM dailymed_images WHERE image_key IS NOT NULL`,
  );
  let sets = 0;
  let products = 0;
  let missingFiles = 0;
  for (const r of rows) {
    if (!renditionsExist(r.setid, r.key, root)) {
      missingFiles++;
      continue;
    }
    const n = linkSetImage(r.setid, r.key);
    if (n) {
      sets++;
      products += n;
    }
  }
  return { sets, products, missingFiles };
}
