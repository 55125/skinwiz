// Concentration ranges the FDA OTC monographs permit for each active, so a
// product's parsed strength (db/strength.ts) can be shown against the
// published regulatory range -- a factual comparison to a public rule, not
// an efficacy judgment or a recommendation. Actives with no monograph
// (cosmetic ingredients like niacinamide, or azelaic acid, which is
// prescription-only at drug strengths in the US) have no entry here and
// get no badge.
//
// Sources. Every OTC monograph became a deemed final order under the 2020
// CARES Act (section 505G) and is posted on OTC Monographs@FDA by ID:
//  - Acne 21 CFR 333 subpart D (M006); antifungal 333 subpart C (M005);
//    dandruff/seb derm/psoriasis 358 subpart H (M032); skin protectant 347
//    (M016); antiperspirant 350 (M019). These CFR parts are still codified
//    and match the monographs, so they're cited by CFR section -- except
//    zinc oxide's 25-40% ointment range, which is only in M016.
//  - Sunscreen: OTC Monograph M020 (order OTC000006). 21 CFR 352 has been
//    stayed since 2004 and is not the rule in force. Final order OTC000039
//    (June 10, 2026) added bemotrizinol as § M020.10(c), moving the later
//    paragraph letters down one; the letters below are the post-2026 ones.
//    21 CFR 201.327 is the sunscreen labeling rule and sets no limits.
//  - External analgesic (hydrocortisone, pramoxine, diphenhydramine...):
//    OTC Monograph M017 (order OTC000033), from the old 348 tentative final
//    monograph. 21 CFR 348.10 now covers only male genital desensitizers.
//  - Adapalene, terbinafine, butenafine: approved Rx-to-OTC switch NDAs.
// Section letters are given only where they were checked against the
// primary source (review/regulatory-check/M-results.md, 2026-10-09).
//
// Some actives have more than one range depending on use: salicylic acid
// and sulfur (acne vs dandruff), pyrithione zinc (rinse-off vs leave-on),
// zinc oxide (sunscreen vs skin protectant vs ointment). A product is
// compared with the ranges that fit its concern, form and other actives
// when those are known, and with all of the active's ranges otherwise. A
// range here is "what the monograph permits," which is a wider statement
// than "what's typical."

export type MonographRange = {
  min: number;
  max: number;
  /** Where the range comes from: CFR section, OTC monograph section, or NDA. */
  cite: string;
  /** Short use label, when the active has more than one range ("dandruff, rinse-off"). */
  use?: string;
  /** Applies only to products under one of these concern ids. */
  concerns?: string[];
  /** Applies only to this kind of product (see productForm). */
  form?: "rinse-off" | "leave-on" | "ointment";
  /** Applies only when the product also has this active. */
  onlyWith?: string;
  /** Applies only when the product doesn't have this active. */
  notWith?: string;
};

const M020 = (letter: string) => `OTC Monograph M020 § M020.10${letter}`;
const SUNSCREEN = { cite: "OTC Monograph M020 § M020.10" };
const M017 = (para: string) => `OTC Monograph M017 § M017.10${para}`;
const DANDRUFF = ["dandruff-seb-derm"];

export const MONOGRAPH_RANGES: Record<string, MonographRange[]> = {
  // Acne -- 21 CFR 333.310; dandruff -- 21 CFR 358.710
  "benzoyl-peroxide": [{ min: 2.5, max: 10, cite: "21 CFR 333.310(a)" }],
  "salicylic-acid": [
    { min: 0.5, max: 2, cite: "21 CFR 333.310(d)", use: "acne", concerns: ["acne"] },
    { min: 1.8, max: 3, cite: "21 CFR 358.710(a)(4)", use: "dandruff, seb derm, psoriasis", concerns: DANDRUFF },
  ],
  sulfur: [
    { min: 3, max: 10, cite: "21 CFR 333.310(e)", use: "acne", concerns: ["acne"], notWith: "resorcinol" },
    { min: 3, max: 8, cite: "21 CFR 333.310(f)", use: "acne, with resorcinol", concerns: ["acne"], onlyWith: "resorcinol" },
    // Dandruff only; sulfur isn't a seborrheic dermatitis or psoriasis active.
    { min: 2, max: 5, cite: "21 CFR 358.710(a)(7)", use: "dandruff", concerns: DANDRUFF },
  ],
  // Adapalene 0.1% is an approved NDA switch (2016), not a monograph entry;
  // 0.1% is the only OTC strength. (NDA 021753 is the Rx 0.3% gel.)
  adapalene: [{ min: 0.1, max: 0.1, cite: "NDA 020380 (Rx-to-OTC switch)" }],
  // Only in combination with sulfur: resorcinol 2%, resorcinol monoacetate 3%.
  resorcinol: [{ min: 2, max: 3, cite: "21 CFR 333.310" }],

  // Sunscreen -- OTC Monograph M020. No minimums: each is "up to" a maximum.
  "aminobenzoic-acid": [{ min: 0, max: 15, ...SUNSCREEN }],
  avobenzone: [{ min: 0, max: 3, cite: M020("(b)") }],
  bemotrizinol: [{ min: 0, max: 6, cite: `${M020("(c)")} (final order OTC000039, 2026)` }],
  cinoxate: [{ min: 0, max: 3, ...SUNSCREEN }],
  dioxybenzone: [{ min: 0, max: 3, ...SUNSCREEN }],
  ensulizole: [{ min: 0, max: 4, cite: M020("(f)") }],
  homosalate: [{ min: 0, max: 15, cite: M020("(g)") }],
  meradimate: [{ min: 0, max: 5, cite: M020("(h)") }],
  octinoxate: [{ min: 0, max: 7.5, cite: M020("(i)") }],
  octisalate: [{ min: 0, max: 5, cite: M020("(j)") }],
  octocrylene: [{ min: 0, max: 10, cite: M020("(k)") }],
  oxybenzone: [{ min: 0, max: 6, cite: M020("(l)") }],
  "padimate-o": [{ min: 0, max: 8, ...SUNSCREEN }],
  sulisobenzone: [{ min: 0, max: 10, ...SUNSCREEN }],
  "titanium-dioxide": [{ min: 0, max: 25, cite: M020("(o)") }],
  "trolamine-salicylate": [{ min: 0, max: 12, ...SUNSCREEN }],
  "zinc-oxide": [
    { min: 0, max: 25, cite: M020("(q)"), use: "sunscreen", concerns: ["sun-protection"] },
    { min: 1, max: 25, cite: "OTC Monograph M016 § M016.10(u)", use: "skin protectant" },
    { min: 25, max: 40, cite: "OTC Monograph M016 § M016.10(v)", use: "skin protectant, ointment", form: "ointment" },
  ],

  // Antifungal -- 21 CFR 333.210
  clotrimazole: [{ min: 1, max: 1, cite: "21 CFR 333.210(g)" }],
  "miconazole-nitrate": [{ min: 2, max: 2, cite: "21 CFR 333.210(c)" }],
  tolnaftate: [{ min: 1, max: 1, cite: "21 CFR 333.210(e)" }],
  terbinafine: [{ min: 1, max: 1, cite: "NDA 020980 (Rx-to-OTC switch)" }],
  butenafine: [{ min: 1, max: 1, cite: "NDA 021307 (Rx-to-OTC switch)" }],
  "undecylenic-acid": [{ min: 10, max: 25, cite: "21 CFR 333.210(f)" }],

  // Dandruff / seborrheic dermatitis / psoriasis -- 21 CFR 358.710
  "pyrithione-zinc": [
    { min: 0.3, max: 2, cite: "21 CFR 358.710(a)(2)", use: "dandruff, rinse-off", form: "rinse-off" },
    { min: 0.95, max: 2, cite: "21 CFR 358.710(b)(2)", use: "seb derm, rinse-off", form: "rinse-off" },
    { min: 0.1, max: 0.25, cite: "21 CFR 358.710(a)(3), (b)(3)", use: "leave-on", form: "leave-on" },
  ],
  "selenium-sulfide": [
    { min: 1, max: 1, cite: "21 CFR 358.710(a)(5), (b)(5)" },
    // Can't be told apart from plain selenium sulfide by active id.
    { min: 0.6, max: 0.6, cite: "21 CFR 358.710(a)(6)", use: "micronized, dandruff" },
  ],
  "coal-tar": [{ min: 0.5, max: 5, cite: "21 CFR 358.710(a)(1)" }],

  // External analgesic -- OTC Monograph M017
  hydrocortisone: [{ min: 0.25, max: 1, cite: M017("(d)(1)") }],
  pramoxine: [{ min: 0.5, max: 1, cite: M017("(a)(9)") }],
  diphenhydramine: [{ min: 1, max: 2, cite: M017("(c)(1)") }],
  lidocaine: [{ min: 0.5, max: 4, cite: "OTC Monograph M017" }],
  benzocaine: [{ min: 5, max: 20, cite: "OTC Monograph M017" }],
  phenol: [{ min: 0.5, max: 1.5, cite: "OTC Monograph M017" }],
  capsaicin: [{ min: 0.025, max: 0.25, cite: "OTC Monograph M017" }],
  // Menthol and camphor have no entry: their higher counterirritant
  // (pain-relief) strengths are also monograph-permitted, and an itch-only
  // maximum would wrongly flag those products as above range.

  // Skin protectant -- 21 CFR 347.10
  petrolatum: [{ min: 30, max: 100, cite: "21 CFR 347.10(m)" }],
  "colloidal-oatmeal": [{ min: 0.007, max: 100, cite: "21 CFR 347.10(f)" }],
  dimethicone: [{ min: 1, max: 30, cite: "21 CFR 347.10(g)" }],
  allantoin: [{ min: 0.5, max: 2, cite: "21 CFR 347.10(a)" }],
  lanolin: [{ min: 12.5, max: 50, cite: "21 CFR 347.10(k)" }],
  "zinc-acetate": [{ min: 0.1, max: 2, cite: "21 CFR 347.10" }],
  calamine: [{ min: 1, max: 25, cite: "21 CFR 347.10" }],
  kaolin: [{ min: 4, max: 20, cite: "21 CFR 347.10" }],
  glycerin: [{ min: 20, max: 45, cite: "21 CFR 347.10" }],
  // 50-100% alone; 30-35% when combined with colloidal oatmeal.
  "mineral-oil": [{ min: 30, max: 100, cite: "21 CFR 347.10" }],
  "aluminum-hydroxide": [{ min: 0.15, max: 5, cite: "21 CFR 347.10" }],
  // Topical starch (10-98%) has no entry: pure cornstarch powders label
  // 99-100%, and an above-range badge or listing exclusion would be noise.

  // Antiperspirant -- 21 CFR 350.10
  "aluminum-chlorohydrate": [{ min: 0, max: 25, cite: "21 CFR 350.10(b)" }],
  "aluminum-zirconium-complex": [{ min: 0, max: 20, cite: "21 CFR 350.10(k)–(r)" }],
};

/** What's known about the product; any field may be missing. */
export type MonographContext = {
  concernId?: string | null;
  brandName?: string | null;
  dosageForm?: string | null;
  activeIds?: string[] | null;
};

const RINSE_OFF = /shampoo|conditioner|\bwash\b|cleanser|cleansing|soap|\bbar\b|scrub|shower/i;
const OINTMENT = /ointment|paste/i;
const LEAVE_ON = /leave[- ]?in|cream|lotion|\bgel\b|serum|tonic|spray|solution|stick|balm/i;

/** Rinse-off, ointment (a leave-on), other leave-on, or null when the name and form don't say. */
export function productForm(p: MonographContext): "rinse-off" | "ointment" | "leave-on" | null {
  const text = `${p.brandName ?? ""} ${p.dosageForm ?? ""}`;
  if (RINSE_OFF.test(text)) return "rinse-off";
  if (OINTMENT.test(text)) return "ointment";
  if (LEAVE_ON.test(text)) return "leave-on";
  return null;
}

function applies(r: MonographRange, p: MonographContext): boolean {
  if (r.concerns && p.concernId && !r.concerns.includes(p.concernId)) return false;
  const form = productForm(p);
  if (r.form && form) {
    if (r.form === "rinse-off" && form !== "rinse-off") return false;
    if (r.form === "leave-on" && form === "rinse-off") return false;
    if (r.form === "ointment" && form !== "ointment") return false;
  }
  if (p.activeIds) {
    if (r.onlyWith && !p.activeIds.includes(r.onlyWith)) return false;
    if (r.notWith && p.activeIds.includes(r.notWith)) return false;
  }
  return true;
}

/** The active's ranges that fit this product; all of them when none fit or nothing is known. */
export function applicableRanges(activeId: string, p: MonographContext = {}): MonographRange[] {
  const ranges = MONOGRAPH_RANGES[activeId] ?? [];
  const fit = ranges.filter((r) => applies(r, p));
  return fit.length > 0 ? fit : ranges;
}

export type MonographStatus = "within" | "below" | "above";

/**
 * Within if the strength fits any applicable range; above if it's over all
 * of them (the highest is returned for display); otherwise below the
 * nearest range above it.
 */
export function monographStatus(
  activeId: string,
  pct: number,
  p: MonographContext = {},
): { status: MonographStatus; range: MonographRange } | null {
  const ranges = applicableRanges(activeId, p);
  if (ranges.length === 0) return null;
  const eps = 1e-9;
  const inside = ranges.find((r) => pct >= r.min - eps && pct <= r.max + eps);
  if (inside) return { status: "within", range: inside };
  const higher = ranges.filter((r) => pct < r.min);
  if (higher.length === 0) return { status: "above", range: ranges.reduce((a, b) => (b.max > a.max ? b : a)) };
  return { status: "below", range: higher.reduce((a, b) => (b.min < a.min ? b : a)) };
}

export function formatRange(range: MonographRange): string {
  const fmt = (n: number) => `${n}%`;
  if (range.min === range.max) return fmt(range.max);
  if (range.min === 0) return `up to ${fmt(range.max)}`;
  return `${fmt(range.min)}–${fmt(range.max)}`;
}

/** "1%–25% (skin protectant)": the range with its use label when it has one. */
export function formatRangeWithUse(range: MonographRange): string {
  return range.use ? `${formatRange(range)} (${range.use})` : formatRange(range);
}
