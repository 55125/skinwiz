// "Order all" for a clinician plan's OTC steps. Pure (tested in
// retailer-carts.test.ts); the page passes in the plan's OTC products and
// their LIVE affiliate rows (lib/queries.ts getAffiliateLinksForProducts --
// prescription rows never have any).
//
// Retailers that accept several items in one add-to-cart URL get one link;
// everyone else gets one link per item. Only non-demo affiliate rows ever
// produce a buy link: today every row is synthetic demo data
// (schema.ts affiliateLinks.isDemo), so this returns no carts and the page
// shows the per-item "find it at" fallback. It lights up as soon as real
// Impact / CJ / Amazon feeds are seeded.
//
// Multi-item cart URLs (verify against each program's current terms before
// switching on -- noted in the review doc):
//  - Amazon Associates "Add to Cart form": https://www.amazon.com/gp/aws/cart/add.html
//    ?AssociateTag=<tag>&ASIN.1=<asin>&Quantity.1=1&ASIN.2=... Needs
//    AMAZON_ASSOCIATE_TAG; without it no Amazon cart is built.
//  - Walmart affiliate add-to-cart: https://affil.walmart.com/cart/addToCart
//    ?items=<itemId>|<qty>,<itemId>|<qty>, wrapped in the publisher's Impact
//    tracking link when WALMART_IMPACT_LINK is set ("https://goto.walmart.com/c/<pub>/<ad>/9383").
//    Without it no Walmart cart is built (an unwrapped cart earns nothing and
//    would read as an affiliate link without being one).
//  - Target, CVS, Ulta, Sephora, Walgreens: no public multi-item cart URL;
//    per-item links.

export type CartLink = { productId: string; network: string; buyUrl: string; isDemo: boolean; price: number | null };
export type CartItem = { productId: string; name: string };

export type RetailerCart = { retailer: string; url: string; items: CartItem[] };
export type SingleLink = { retailer: string; url: string; item: CartItem; price: number | null };
export type OrderPlan = { carts: RetailerCart[]; singles: SingleLink[]; unmatched: CartItem[] };

export type CartEnv = { amazonTag?: string | null; walmartImpactLink?: string | null };

export function cartEnvFromProcess(): CartEnv {
  return { amazonTag: process.env.AMAZON_ASSOCIATE_TAG || null, walmartImpactLink: process.env.WALMART_IMPACT_LINK || null };
}

export function retailerOf(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (/(^|\.)amazon\.com$/.test(host)) return "amazon";
  if (/(^|\.)walmart\.com$/.test(host)) return "walmart";
  if (/(^|\.)target\.com$/.test(host)) return "target";
  if (/(^|\.)cvs\.com$/.test(host)) return "cvs";
  if (/(^|\.)ulta\.com$/.test(host)) return "ulta";
  return host.replace(/^www\./, "") || "other";
}

export function amazonAsin(url: string): string | null {
  return /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/.exec(url)?.[1] ?? null;
}

export function walmartItemId(url: string): string | null {
  return /\/ip\/(?:[^/?]+\/)?(\d{6,12})(?:[/?]|$)/.exec(url)?.[1] ?? null;
}

export const RETAILER_NAME: Record<string, string> = { amazon: "Amazon", walmart: "Walmart", target: "Target", cvs: "CVS", ulta: "Ulta" };

export function buildOrderPlan(items: CartItem[], links: CartLink[], env: CartEnv): OrderPlan {
  const live = links.filter((l) => !l.isDemo && l.buyUrl);
  // Cheapest live link per product per retailer.
  const best = new Map<string, Map<string, CartLink>>();
  for (const l of live) {
    const r = retailerOf(l.buyUrl);
    const byRetailer = best.get(l.productId) ?? best.set(l.productId, new Map()).get(l.productId)!;
    const prev = byRetailer.get(r);
    if (!prev || (l.price ?? Infinity) < (prev.price ?? Infinity)) byRetailer.set(r, l);
  }

  const carts: RetailerCart[] = [];
  const singles: SingleLink[] = [];
  const unmatched: CartItem[] = [];
  const placed = new Set<string>();

  // Multi-item carts first, for retailers that support them and are configured.
  const amazon = items.flatMap((it) => {
    const l = best.get(it.productId)?.get("amazon");
    const asin = l ? amazonAsin(l.buyUrl) : null;
    return asin ? [{ it, asin }] : [];
  });
  if (env.amazonTag && amazon.length >= 2) {
    const qs = amazon.map((a, i) => `ASIN.${i + 1}=${encodeURIComponent(a.asin)}&Quantity.${i + 1}=1`).join("&");
    carts.push({ retailer: "amazon", url: `https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=${encodeURIComponent(env.amazonTag)}&${qs}`, items: amazon.map((a) => a.it) });
    amazon.forEach((a) => placed.add(a.it.productId));
  }
  const walmart = items.flatMap((it) => {
    if (placed.has(it.productId)) return [];
    const l = best.get(it.productId)?.get("walmart");
    const id = l ? walmartItemId(l.buyUrl) : null;
    return id ? [{ it, id }] : [];
  });
  if (env.walmartImpactLink && walmart.length >= 2) {
    const target = `https://affil.walmart.com/cart/addToCart?items=${walmart.map((w) => `${w.id}|1`).join(",")}`;
    carts.push({ retailer: "walmart", url: `${env.walmartImpactLink}?u=${encodeURIComponent(target)}`, items: walmart.map((w) => w.it) });
    walmart.forEach((w) => placed.add(w.it.productId));
  }

  // Everything else: the cheapest live link for the item, one per item.
  for (const it of items) {
    if (placed.has(it.productId)) continue;
    const options = [...(best.get(it.productId)?.entries() ?? [])].sort((a, b) => (a[1].price ?? Infinity) - (b[1].price ?? Infinity));
    if (options.length === 0) {
      unmatched.push(it);
      continue;
    }
    const [retailer, l] = options[0];
    singles.push({ retailer, url: l.buyUrl, item: it, price: l.price });
  }
  return { carts, singles, unmatched };
}

/** Plain (non-affiliate) store searches for the "find it at" fallback. rel="nofollow" where rendered. */
export function findItAt(name: string): { retailer: string; url: string }[] {
  const q = encodeURIComponent(name.trim());
  return [
    { retailer: "Amazon", url: `https://www.amazon.com/s?k=${q}` },
    { retailer: "Walmart", url: `https://www.walmart.com/search?q=${q}` },
    { retailer: "Target", url: `https://www.target.com/s?searchTerm=${q}` },
  ];
}
