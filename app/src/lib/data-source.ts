// Three distinct trust tiers, never blended without a visible label —
// see products.dataSource/verified comment in db/schema.ts.
export function dataSourceBadge(dataSource: string): { label: string; className: string } | null {
  switch (dataSource) {
    case "brand_direct":
      return {
        label: "Brand-sourced",
        className: "border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400",
      };
    case "open_beauty_facts":
      return {
        label: "Community-sourced",
        className: "border-dashed text-amber-700 dark:text-amber-400",
      };
    default:
      return null; // openfda / dailymed — the default, no badge needed
  }
}
