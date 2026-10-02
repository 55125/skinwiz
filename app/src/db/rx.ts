// Shared constants for the prescription (Rx) rows of the catalog. Pure data,
// no DB, so client components and tests can import it.

// Rx rows need a concern (products.concernId is NOT NULL with an FK), but
// they belong to no browsable concern. This one is inserted by the seed and
// filtered out of every concern listing (lib/queries.ts getConcerns, the
// sitemap) -- /concern/rx is a 404.
export const RX_CONCERN_ID = "rx";
export const RX_CONCERN = {
  id: RX_CONCERN_ID,
  name: "Prescription (reference only)",
  description: "Hidden: prescription reference rows, never listed as a concern.",
};

export type RxGroup = "retinoid" | "acne" | "rosacea" | "corticosteroid" | "nonsteroidal" | "antifungal" | "other" | "oral";

export const RX_GROUPS: { id: RxGroup; label: string }[] = [
  { id: "retinoid", label: "Topical retinoids" },
  { id: "acne", label: "Acne topicals" },
  { id: "rosacea", label: "Rosacea topicals" },
  { id: "corticosteroid", label: "Topical corticosteroids" },
  { id: "nonsteroidal", label: "Non-steroidal anti-inflammatories" },
  { id: "antifungal", label: "Antifungals" },
  { id: "other", label: "Other topicals" },
  { id: "oral", label: "Oral medicines" },
];

export function rxGroupLabel(id: string | null | undefined): string {
  return RX_GROUPS.find((g) => g.id === id)?.label ?? "Prescription";
}

/** Plain-English reading of the NDC directory's marketing category. */
export function marketingCategoryLabel(cat: string | null | undefined): string | null {
  switch ((cat ?? "").toUpperCase()) {
    case "NDA":
      return "FDA-approved brand (NDA)";
    case "ANDA":
      return "FDA-approved generic (ANDA)";
    case "NDA AUTHORIZED GENERIC":
      return "Authorized generic of an FDA-approved brand";
    case "BLA":
      return "FDA-licensed biologic (BLA)";
    case "UNAPPROVED DRUG OTHER":
      return "Marketed without FDA approval (unapproved drug)";
    case "":
      return null;
    default:
      return cat!.charAt(0) + cat!.slice(1).toLowerCase();
  }
}

// A plain price-comparison search, NOT an affiliate link: no partner id, no
// tracking parameter, rel="nofollow" wherever it's rendered. GoodRx's partner
// program terms are an open question (business-plan.md §3) -- if a partner
// link is ever used it needs a disclosure, and this is the one place to change.
export function rxPriceCheckUrl(genericName: string): string {
  return `https://www.goodrx.com/search?query=${encodeURIComponent(genericName.trim().toLowerCase())}`;
}

// The first package's own size for display ("45 g tube"), from the NDC
// directory description "1 TUBE in 1 CARTON (0187-5170-45) / 45 g in 1 TUBE".
export function innermostPackage(description: string | null | undefined): string | null {
  if (!description) return null;
  const parts = description.split("/").map((s) => s.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  return parts.at(-1) ?? null;
}
