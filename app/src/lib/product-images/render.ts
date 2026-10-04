// Source image -> the two WebP renditions served by /img/dm/... (no DB here,
// so it's testable on its own).
import sharp, { type Metadata } from "sharp";
import { IMAGE_SIZES, type ImageSize } from "@/lib/image-urls";

// Smaller than this on its longest side is a thumbnail or a logo, not a
// package photo worth showing at 800px.
export const MIN_SOURCE_PX = 300;
const QUALITY: Record<ImageSize, number> = { full: 78, thumb: 72 };

/** An image that can't be used; the sync moves on to the next candidate. */
export class Rejected extends Error {}

/** Both renditions from one source image. Throws Rejected for undecodable or tiny images. */
export async function renderRenditions(buf: Buffer): Promise<{ width: number; height: number; files: Record<ImageSize, Buffer> }> {
  let meta: Metadata;
  try {
    meta = await sharp(buf, { failOn: "none" }).metadata();
  } catch (err) {
    throw new Rejected(`undecodable: ${(err as Error).message}`);
  }
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (Math.max(w, h) < MIN_SOURCE_PX) throw new Rejected(`too small (${w}x${h})`);
  // Label artwork is often a small panel on a big white page: trim the
  // uniform margin first so the artwork fills the card. (A trim that would
  // leave nothing -- a blank image -- throws; keep the untrimmed image then.)
  const render = (px: number, quality: number, trim: boolean) => {
    let img = sharp(buf, { failOn: "none" }).rotate(); // honour EXIF orientation
    if (trim) img = img.trim({ threshold: 12 });
    return img
      .resize({ width: px, height: px, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  };
  const files = {} as Record<ImageSize, Buffer>;
  let width = 0;
  let height = 0;
  for (const size of Object.keys(IMAGE_SIZES) as ImageSize[]) {
    const px = IMAGE_SIZES[size];
    const { data, info } = await render(px, QUALITY[size], true).catch(() => render(px, QUALITY[size], false));
    files[size] = data;
    if (size === "full") {
      width = info.width;
      height = info.height;
    }
  }
  return { width, height, files };
}
