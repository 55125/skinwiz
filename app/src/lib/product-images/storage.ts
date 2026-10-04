// Where the DailyMed package photos live on disk: IMAGE_DIR, defaulting to an
// "images" directory next to the SQLite file -- on Railway that's the same
// persistent volume as DATABASE_PATH, so photos survive deploys without
// being committed or baked into the image.
import crypto from "node:crypto";
import path from "node:path";
import { IMAGE_KEY_RE, SETID_RE, type ImageSize } from "@/lib/image-urls";

export function imageDir(): string {
  if (process.env.IMAGE_DIR) return path.resolve(process.env.IMAGE_DIR);
  const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "skinwiz.db");
  return path.join(path.dirname(path.resolve(dbPath)), "images");
}

export function imageKey(setid: string, imageName: string): string {
  return crypto.createHash("sha256").update(`${setid.toLowerCase()}/${imageName}`).digest("hex").slice(0, 12);
}

export function setDir(setid: string, root = imageDir()): string {
  return path.join(root, "dailymed", setid.toLowerCase());
}

/** File for one rendition, or null when the parts aren't a valid set id / key (no path tricks). */
export function imagePath(setid: string, key: string, size: ImageSize, root = imageDir()): string | null {
  if (!SETID_RE.test(setid) || !IMAGE_KEY_RE.test(key)) return null;
  return path.join(setDir(setid, root), `${key}-${size}.webp`);
}
