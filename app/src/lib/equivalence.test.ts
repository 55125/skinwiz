// `npm test`: equivalence grouping edge cases (lib/equivalence.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildEquivalenceGroups,
  displayablePrice,
  exclusionReason,
  isApplicationCategory,
  labelerKey,
  parsePackageDescription,
  resolveDosageForm,
  storeBrandFor,
  unitPrice,
  type EquivalenceRow,
} from "./equivalence";

let n = 0;
function row(over: Partial<EquivalenceRow>): EquivalenceRow {
  n++;
  return {
    id: `id-${String(n).padStart(4, "0")}`,
    brandName: "Adapalene",
    manufacturer: `Maker ${n}`,
    dosageForm: "GEL",
    strengthKey: "adapalene:0.1",
    activeIds: ["adapalene"],
    concernId: "acne",
    dataSource: "openfda",
    ...over,
  };
}

test("adapalene 0.1% gel from different labelers forms one group with a readable slug", () => {
  const groups = buildEquivalenceGroups([
    row({ brandName: "Differin", manufacturer: "Galderma Laboratories, L.P.", marketingCategory: "NDA" }),
    row({ manufacturer: "Target Corporation", marketingCategory: "ANDA" }),
    row({ manufacturer: "Walgreens" }),
  ]);
  assert.equal(groups.length, 1);
  const g = groups[0];
  assert.equal(g.slug, "adapalene-0-1-percent-gel");
  assert.equal(g.title, "Adapalene 0.1% gel");
  assert.equal(g.application, true);
  assert.equal(g.labelerCount, 3);
  // Brand names first, then store brands.
  assert.equal(g.members[0].brandName, "Differin");
  assert.deepEqual(
    g.members.map((m) => m.storeBrand),
    [null, "Target (up&up)", "Walgreens"],
  );
});

test("different strength or form never share a group", () => {
  const groups = buildEquivalenceGroups([
    row({ strengthKey: "benzoyl-peroxide:5", activeIds: ["benzoyl-peroxide"], dosageForm: "GEL" }),
    row({ strengthKey: "benzoyl-peroxide:5", activeIds: ["benzoyl-peroxide"], dosageForm: "GEL" }),
    row({ strengthKey: "benzoyl-peroxide:10", activeIds: ["benzoyl-peroxide"], dosageForm: "GEL" }),
    row({ strengthKey: "benzoyl-peroxide:5", activeIds: ["benzoyl-peroxide"], dosageForm: "CREAM" }),
  ]);
  // BPO is acne-only, so no "-for-acne" suffix.
  assert.deepEqual(
    groups.map((g) => g.slug),
    ["benzoyl-peroxide-5-percent-gel"],
  );
  assert.equal(groups[0].members.length, 2);
  assert.equal(groups[0].application, false);
});

test("one labeler's pack sizes and spelling variants are not a comparison", () => {
  const groups = buildEquivalenceGroups([
    row({ id: "73581-214", manufacturer: "YYBA CORP" }),
    row({ id: "73581-019", manufacturer: "YYBA Corp" }),
    row({ id: "0363-4110", manufacturer: "Walgreen Company" }),
    row({ id: "0363-0888", manufacturer: "WALGREENS" }),
  ]);
  assert.equal(groups.length, 1);
  const g = groups[0];
  assert.equal(g.members.length, 2);
  const yyba = g.members.find((m) => m.ids.includes("73581-214"))!;
  assert.deepEqual(yyba.ids, ["73581-019", "73581-214"]);
  assert.equal(yyba.id, "73581-019"); // lowest id = canonical page

  assert.equal(buildEquivalenceGroups([row({ manufacturer: "Acme Inc" }), row({ manufacturer: "ACME, INC." })]).length, 0);
});

test("sunscreens, antiperspirants, kits, cosmetics and 3+ actives are excluded", () => {
  assert.equal(exclusionReason(row({ concernId: "sun-protection", strengthKey: "zinc-oxide:20", activeIds: ["zinc-oxide"] })), "sunscreen/antiperspirant");
  assert.equal(exclusionReason(row({ concernId: "dry-skin-eczema", brandName: "Lip Balm SPF 15", strengthKey: "petrolatum:30", activeIds: ["petrolatum"] })), "sunscreen/antiperspirant");
  assert.equal(exclusionReason(row({ concernId: "dry-skin-eczema", strengthKey: "avobenzone:3", activeIds: ["avobenzone"] })), "sunscreen/antiperspirant");
  assert.equal(exclusionReason(row({ concernId: "excessive-sweating", strengthKey: "aluminum-chlorohydrate:16", activeIds: ["aluminum-chlorohydrate"] })), "sunscreen/antiperspirant");
  assert.equal(exclusionReason(row({ dosageForm: "KIT" })), "kit");
  assert.equal(exclusionReason(row({ dataSource: "brand_direct" })), "not an FDA drug listing");
  assert.equal(exclusionReason(row({ strengthKey: null })), "strength not parsed");
  assert.equal(
    exclusionReason(row({ activeIds: ["benzoyl-peroxide", "salicylic-acid", "sulfur"], strengthKey: "benzoyl-peroxide:5|salicylic-acid:2|sulfur:3" })),
    "too many actives",
  );
  // Zinc oxide as a skin protectant (diaper cream) is fine.
  assert.equal(exclusionReason(row({ concernId: "dry-skin-eczema", strengthKey: "zinc-oxide:20", activeIds: ["zinc-oxide"], dosageForm: "OINTMENT" })), null);
});

test("missing dosage form: inferred from one unambiguous name word, else excluded", () => {
  assert.equal(resolveDosageForm(null, "Adapalene Gel 0.1%"), "GEL");
  assert.equal(resolveDosageForm(null, "Acne Face Wash"), null);
  assert.equal(resolveDosageForm(null, "Cream-to-Gel Spot Treatment"), null); // two form words
  assert.equal(resolveDosageForm("aerosol, spray", "x"), "AEROSOL, SPRAY");
  assert.equal(exclusionReason(row({ dosageForm: null, brandName: "Acne Treatment" })), "dosage form unknown");
});

test("salicylic acid for acne and for dandruff are separate groups; itch vs eczema buckets are not", () => {
  const sa = { strengthKey: "salicylic-acid:2", activeIds: ["salicylic-acid"], dosageForm: "LIQUID" };
  const groups = buildEquivalenceGroups([
    row({ ...sa, concernId: "acne" }),
    row({ ...sa, concernId: "acne" }),
    row({ ...sa, concernId: "dandruff-seb-derm" }),
    row({ ...sa, concernId: "dandruff-seb-derm" }),
  ]);
  assert.deepEqual(groups.map((g) => g.slug).sort(), ["salicylic-acid-2-percent-liquid-for-acne", "salicylic-acid-2-percent-liquid-for-dandruff"]);

  const hc = { strengthKey: "hydrocortisone:1", activeIds: ["hydrocortisone"], dosageForm: "CREAM" };
  const merged = buildEquivalenceGroups([row({ ...hc, concernId: "itch-relief" }), row({ ...hc, concernId: "dry-skin-eczema" })]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].slug, "hydrocortisone-1-percent-cream");
});

test("two-active slug joins with 'and', in sorted order", () => {
  const combo = { strengthKey: "pramoxine:1|zinc-oxide:8", activeIds: ["zinc-oxide", "pramoxine"], dosageForm: "LOTION", concernId: "itch-relief" };
  const [g] = buildEquivalenceGroups([row(combo), row(combo)]);
  assert.equal(g.slug, "pramoxine-1-percent-and-zinc-oxide-8-percent-lotion");
  assert.match(g.title, /^Zinc Oxide 8% \+ pramoxine/);
});

test("store brands are recognized from FDA labeler names", () => {
  assert.equal(storeBrandFor("Wal-Mart Stores Inc"), "Walmart (Equate)");
  assert.equal(storeBrandFor("Amazon.com Services LLC"), "Amazon (Basic Care)");
  assert.equal(storeBrandFor("TOP CARE (Topco Associates LLC)"), "TopCare");
  assert.equal(storeBrandFor("H E B"), "H-E-B");
  assert.equal(storeBrandFor("Dolgencorp, Inc. (DOLLAR GENERAL & REXALL)"), "Dollar General (DG Health)");
  assert.equal(storeBrandFor("Galderma Laboratories, L.P."), null);
  assert.equal(storeBrandFor(null), null);
  assert.equal(labelerKey("The Kroger Co."), labelerKey("THE KROGER CO."));
});

test("unit price needs a package size, and demo prices are never displayable", () => {
  assert.deepEqual(parsePackageDescription("45 g in 1 TUBE"), { amount: 45, unit: "g" });
  assert.deepEqual(parsePackageDescription("118 mL in 1 BOTTLE, PLASTIC"), { amount: 118, unit: "mL" });
  assert.deepEqual(parsePackageDescription("30 PAD in 1 JAR"), { amount: 30, unit: "count" });
  assert.equal(parsePackageDescription("1 TUBE in 1 CARTON"), null);
  assert.equal(parsePackageDescription(null), null);
  const oz = parsePackageDescription("1.6 OZ in 1 TUBE")!;
  assert.ok(Math.abs(unitPrice(16, oz)!.value - 10) < 1e-9);
  assert.equal(unitPrice(12.99, null), null);
  assert.equal(unitPrice(null, oz), null);
  assert.deepEqual(unitPrice(9, { amount: 30, unit: "count" }), { value: 0.3, per: "item" });
  assert.equal(displayablePrice({ price: 12.99, isDemo: true }), null);
  assert.equal(displayablePrice({ price: 12.99, isDemo: false }), 12.99);
  assert.equal(displayablePrice({ price: null, isDemo: false }), null);
});

test("NDA/ANDA groups are detected from the marketing category, not the active", () => {
  // Same active as the adapalene group above, but every listing is a
  // monograph product (or unlisted): not an application group.
  const mono = buildEquivalenceGroups([
    row({ manufacturer: "A", marketingCategory: "OTC MONOGRAPH DRUG" }),
    row({ manufacturer: "B", marketingCategory: null }),
  ]);
  assert.equal(mono[0].application, false);
  // Any member listed under an application marks the group.
  const bpo = (over: Partial<EquivalenceRow>) => row({ strengthKey: "benzoyl-peroxide:2.5", activeIds: ["benzoyl-peroxide"], ...over });
  const app = buildEquivalenceGroups([bpo({ manufacturer: "A", marketingCategory: "NDA AUTHORIZED GENERIC" }), bpo({ manufacturer: "B" })]);
  assert.equal(app[0].application, true);
  assert.equal(isApplicationCategory("ANDA"), true);
  assert.equal(isApplicationCategory("NDA"), true);
  assert.equal(isApplicationCategory("OTC MONOGRAPH NOT FINAL"), false);
  assert.equal(isApplicationCategory("UNAPPROVED HOMEOPATHIC"), false);
  assert.equal(isApplicationCategory(undefined), false);
});

test("prescription rows never join an equivalence group", () => {
  assert.equal(exclusionReason(row({ isRx: true })), "prescription");
  const groups = buildEquivalenceGroups([row({ isRx: true, manufacturer: "X" }), row({ isRx: true, manufacturer: "Y" })]);
  assert.equal(groups.length, 0);
});

test("nested NDC package descriptions use the innermost size", () => {
  assert.deepEqual(parsePackageDescription("1 TUBE in 1 CARTON (0187-5170-45) / 45 g in 1 TUBE"), { amount: 45, unit: "g" });
  assert.deepEqual(parsePackageDescription("1 BOTTLE in 1 CARTON (0000-0000-01) / 118 mL in 1 BOTTLE"), { amount: 118, unit: "mL" });
});
