import fs from "node:fs/promises";
import { parseImageFile } from "@/lib/image-urls";
import { imageDir, imagePath } from "./storage";

// A year, immutable: the key in the URL changes whenever the image does.
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
// A miss is cheap to answer and may be filled by the next sync; don't let a
// CDN or browser remember it for long.
export const MISS_CACHE = "public, max-age=300";

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": MISS_CACHE },
  });
}

/** GET /img/dm/{setid}/{key}/{full|thumb}.webp, straight from the volume. */
export async function serveDailymedImage(
  params: { setid: string; key: string; file: string },
  opts: { root?: string; ifNoneMatch?: string | null; head?: boolean } = {},
): Promise<Response> {
  const size = parseImageFile(params.file);
  const file = size && imagePath(params.setid, params.key, size, opts.root ?? imageDir());
  if (!file) return notFound();
  const etag = `"${params.key}-${size}"`;
  const headers = {
    "Content-Type": "image/webp",
    "Cache-Control": IMMUTABLE_CACHE,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };
  try {
    if (opts.ifNoneMatch === etag) {
      await fs.access(file);
      return new Response(null, { status: 304, headers });
    }
    if (opts.head) {
      const st = await fs.stat(file);
      return new Response(null, { status: 200, headers: { ...headers, "Content-Length": String(st.size) } });
    }
    const body = await fs.readFile(file);
    return new Response(new Uint8Array(body), { status: 200, headers: { ...headers, "Content-Length": String(body.length) } });
  } catch {
    return notFound();
  }
}
