// URLs for the self-hosted DailyMed package photos (lib/product-images/).
// Pure string helpers, safe to import anywhere (seed, route, components).
//
//   /img/dm/{setid}/{key}/full.webp    <= 800px, product page
//   /img/dm/{setid}/{key}/thumb.webp   <= 320px, product cards
//
// `key` is a short hash of the set id + the chosen DailyMed image name, so a
// new label image gets a new URL and every URL can be cached as immutable.
// The ".webp" suffix also keeps these requests out of the anti-scrape proxy
// (src/proxy.ts matcher skips static-asset extensions): a grid of 24
// thumbnails never counts against a visitor's page budget.

export const IMAGE_SIZES = { full: 800, thumb: 320 } as const;
export type ImageSize = keyof typeof IMAGE_SIZES;

export const SETID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const IMAGE_KEY_RE = /^[0-9a-f]{12}$/;

const DM_URL_RE = /^\/img\/dm\/([0-9a-f-]{36})\/([0-9a-f]{12})\/(full|thumb)\.webp$/i;

export function dailymedImageUrl(setid: string, key: string, size: ImageSize = "full"): string {
  return `/img/dm/${setid.toLowerCase()}/${key}/${size}.webp`;
}

export function isDailymedImageUrl(url: string | null | undefined): boolean {
  return !!url && DM_URL_RE.test(url);
}

/** The card-sized rendition of a product image; other sources' URLs pass through unchanged. */
export function thumbnailUrl(url: string): string {
  const m = DM_URL_RE.exec(url);
  return m ? dailymedImageUrl(m[1], m[2], "thumb") : url;
}

/** Alt text: a DailyMed image is the FDA label's package artwork, not a retail photo. */
export function productImageAlt(product: { brandName: string; imageUrl: string | null }): string {
  return isDailymedImageUrl(product.imageUrl) ? `${product.brandName} package label` : product.brandName;
}

export const DAILYMED_IMAGE_CAPTION = "Package image: FDA label via DailyMed";

/** Open Beauty Facts photos are CC BY-SA, which requires a credit wherever one is shown. */
export function isOpenBeautyFactsImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return /(^|\.)openbeautyfacts\.org$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Parses the route's file segment ("full.webp" / "thumb.webp"). */
export function parseImageFile(file: string): ImageSize | null {
  const m = /^(full|thumb)\.webp$/.exec(file);
  return m ? (m[1] as ImageSize) : null;
}
