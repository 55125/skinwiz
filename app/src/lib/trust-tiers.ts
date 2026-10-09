// Shared by /search and /browse -- the three dataSource groupings a user
// can filter by, mapped to the underlying products.dataSource values (see
// src/lib/data-source.ts for the badge-rendering side of this same split).
export const TRUST_TIERS: { label: string; dataSources: string[] }[] = [
  { label: "FDA-sourced", dataSources: ["openfda", "dailymed"] },
  { label: "Brand-sourced", dataSources: ["brand_direct"] },
  { label: "Community-sourced", dataSources: ["open_beauty_facts", "third_party"] },
];
