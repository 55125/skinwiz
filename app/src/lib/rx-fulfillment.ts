// Hook for a future pharmacy partner (e.g. a mail-order or cash-price
// pharmacy that can take a transfer). DISABLED: no partner exists, and
// ordering a prescription through Actively raises pharmacy-advertising,
// anti-kickback and state pharmacy-law questions that need the attorney
// first (business-plan.md §3, §8). Until then a prescription step on a
// clinician plan shows only "Your clinician sends this prescription to your
// pharmacy" plus a plain, non-affiliate price check (db/rx.ts
// rxPriceCheckUrl).
//
// To enable later: set RX_FULFILLMENT_PARTNER to the partner's details,
// implement rxFulfillmentLink, add the disclosure the attorney specifies, and
// list it in the review doc. Nothing else in the app needs to change.

export type RxFulfillmentPartner = { name: string; disclosure: string; buildUrl: (genericName: string) => string };

export const RX_FULFILLMENT_PARTNER: RxFulfillmentPartner | null = null;

/** Always null while no partner is configured. */
export function rxFulfillmentLink(genericName: string): { name: string; url: string; disclosure: string } | null {
  const p = RX_FULFILLMENT_PARTNER as RxFulfillmentPartner | null;
  if (!p) return null;
  return { name: p.name, url: p.buildUrl(genericName), disclosure: p.disclosure };
}
