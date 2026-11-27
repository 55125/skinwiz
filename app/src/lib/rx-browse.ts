// Prescription browse (/rx): the Rx rows folded into one card per medicine,
// not one per NDC, so 23 labelers of tretinoin cream are one "Tretinoin"
// with its strengths, vehicles and brands. Pure (no DB) for tests; the page
// loads the rows (lib/rx-catalog.ts listRxProducts).
//
// Browse is by medicine on purpose: nothing here is a product to pick or
// buy. No prices, photos, scores or "best" ordering, and it never mixes with
// the OTC listings.
import { rxDisplayName } from "@/lib/rx-catalog-pure";
import { formWord } from "@/lib/vehicle-finder";

export type BrowseRow = {
  id: string;
  brandName: string;
  genericName: string | null;
  strengthText: string | null;
  dosageForm: string | null;
  rxGroup: string | null;
  marketingCategory: string | null;
  manufacturer: string | null;
  steroidPotencyClass: number | null;
  informationalOnly: boolean;
};

export type BrowseVariant = {
  /** "0.025% cream": strength + vehicle, without the medicine's name. */
  label: string;
  /** The listing the chip opens: the brand-name (NDA) one when there is one. */
  id: string;
  potency: number | null;
  labelers: number;
};

export type BrowseMedicine = {
  key: string;
  name: string;
  rxGroup: string;
  variants: BrowseVariant[];
  forms: string[];
  /** Brand names of NDA listings ("Retin-A"), when they differ from the generic. */
  brands: string[];
  labelers: number;
  /** Strongest and mildest steroid class among the variants (1 = strongest). */
  potency: [number, number] | null;
  informationalOnly: boolean;
};

export type BrowseFilters = { group?: string; form?: string; potency?: number; q?: string };

const FORM_WORDS = /\b(usp|topical|cream|gel|ointment|lotion|foam|solution|spray|shampoo|swab|pledgets?|pads?|emulsion|emollient|rinse|liquid|wash|cleanser|suspension|aerosol|tablets?|capsules?|kit|film|external|for)\b/g;

/** "Clobetasol propionate cream USP, 0.05%" -> "clobetasol propionate": the medicine, without vehicle or strength. */
export function medicineName(generic: string): string {
  return generic
    .toLowerCase()
    .replace(/,\s*\d.*$/, "")
    .replace(/\bhc[li]\b/g, "hydrochloride")
    .replace(/\bsulfer\b/g, "sulfur")
    .replace(/\s*(\/|\s-\s|,)\s*/g, " and ")
    .replace(/\d[\d.]*\s*(?:%|(?:mg|mcg|g)\b)/g, " ")
    .replace(FORM_WORDS, " ")
    .replace(/\s+/g, " ")
    .replace(/^(and )+|( and)+$/g, "")
    .replace(/\band( and)+\b/g, "and")
    .trim();
}

/** Same medicine whatever the word order: "pramoxine hydrochloride and hydrocortisone acetate" = "hydrocortisone acetate pramoxine hydrochloride". */
function medicineKey(name: string): string {
  return [...new Set(name.split(" ").filter((w) => w && w !== "and" && w !== "with"))].sort().join(" ");
}

const firstNumber = (s: string) => Number(s.match(/\d*\.?\d+/)?.[0] ?? Infinity);
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One card per generic (case-folded) within a group, filtered, A to Z (steroids: strongest first). */
export function browseMedicines(rows: BrowseRow[], f: BrowseFilters = {}): BrowseMedicine[] {
  const q = f.q?.trim().toLowerCase();
  const meds = new Map<string, { m: BrowseMedicine; names: Map<string, number>; labelers: Set<string>; variants: Map<string, BrowseVariant & { nda: boolean; makers: Set<string> }> }>();
  for (const r of rows) {
    const group = r.rxGroup ?? "other";
    if (f.group && group !== f.group) continue;
    if (f.form && formWord(r.dosageForm) !== f.form) continue;
    if (f.potency && r.steroidPotencyClass !== f.potency) continue;
    const raw = (r.genericName?.trim() || r.brandName).toLowerCase();
    const generic = medicineName(raw) || raw;
    if (q && !generic.includes(q) && !r.brandName.toLowerCase().includes(q)) continue;
    const key = `${group}|${medicineKey(generic)}`;
    let e = meds.get(key);
    if (!e) {
      e = {
        m: { key, name: title(generic), rxGroup: group, variants: [], forms: [], brands: [], labelers: 0, potency: null, informationalOnly: false },
        names: new Map(),
        labelers: new Set(),
        variants: new Map(),
      };
      meds.set(key, e);
    }
    e.names.set(generic, (e.names.get(generic) ?? 0) + 1);
    const maker = (r.manufacturer ?? r.id).toLowerCase();
    e.labelers.add(maker);
    if (r.informationalOnly) e.m.informationalOnly = true;
    const form = formWord(r.dosageForm);
    if (!e.m.forms.includes(form)) e.m.forms.push(form);
    const nda = r.marketingCategory === "NDA";
    const brand = r.brandName.trim();
    if (nda && brand.toLowerCase() !== generic && !e.m.brands.some((b) => b.toLowerCase() === brand.toLowerCase())) e.m.brands.push(brand);
    const full = rxDisplayName(r);
    const label = full.toLowerCase().startsWith(raw) ? full.slice(raw.length).trim() || full : full;
    const v = e.variants.get(label.toLowerCase());
    if (!v) {
      e.variants.set(label.toLowerCase(), { label, id: r.id, potency: r.steroidPotencyClass, labelers: 0, nda, makers: new Set([maker]) });
    } else {
      v.makers.add(maker);
      if (nda && !v.nda) Object.assign(v, { id: r.id, nda: true });
      if (v.potency == null) v.potency = r.steroidPotencyClass;
    }
  }
  const out: BrowseMedicine[] = [];
  for (const { m, names, labelers, variants } of meds.values()) {
    // The name most listings use (prefer one with "and" for a combination).
    const best = [...names.entries()].sort((a, b) => Number(b[0].includes(" and ")) - Number(a[0].includes(" and ")) || b[1] - a[1] || a[0].length - b[0].length)[0][0];
    m.name = title(best);
    m.labelers = labelers.size;
    m.variants = [...variants.values()]
      .map(({ label, id, potency, makers }) => ({ label, id, potency, labelers: makers.size }))
      .sort((a, b) => (a.potency ?? 9) - (b.potency ?? 9) || firstNumber(a.label) - firstNumber(b.label) || a.label.localeCompare(b.label));
    const classes = m.variants.flatMap((v) => (v.potency ? [v.potency] : []));
    m.potency = classes.length ? [Math.min(...classes), Math.max(...classes)] : null;
    m.forms.sort();
    m.brands.sort();
    out.push(m);
  }
  return out.sort((a, b) =>
    a.rxGroup === "corticosteroid" && b.rxGroup === "corticosteroid"
      ? (a.potency?.[0] ?? 9) - (b.potency?.[0] ?? 9) || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name),
  );
}
