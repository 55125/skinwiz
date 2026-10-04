// SPL (DailyMed) inactive-ingredient lists -> the same consumers as label
// text: ingredient rows, allergen hits, free-from flags, pregnancy matching.
// `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { drugInactiveList, groupSplInactive, type SplInactiveCsvRow } from "./spl-inactive";
import { computeAllergenHits } from "./contact-allergens";
import { computeFreeFromFlags } from "./ingredient-flags";
import { pregnancyFindings } from "./pregnancy-lactation";
import { parseIngredientNames } from "./ingredient-parse";

const row = (product_id: string, position: number, raw_name: string, source: SplInactiveCsvRow["source"] = "iact", unii = ""): SplInactiveCsvRow => ({
  product_id,
  setid: "11111111-2222-3333-4444-555555555555",
  position: String(position),
  raw_name,
  unii,
  source,
});

const CSV: SplInactiveCsvRow[] = [
  // out of order on purpose: position decides
  row("12345-678", 3, "METHYLISOTHIAZOLINONE"),
  row("12345-678", 1, "WATER"),
  row("12345-678", 2, "LACTIC ACID, UNSPECIFIED FORM"),
  row("12345-678", 4, "FRAGRANCE"),
  row("12345-678", 5, "RETINYL PALMITATE"),
  row("12345-678", 0, "water, lactic acid, methylisothiazolinone, fragrance, retinyl palmitate", "section_text"),
  row("55555-001", 0, "Inactive ingredients: glycerin, lanolin, water", "section_text"),
];

test("CSV rows group per product, IACT names in label order", () => {
  const map = groupSplInactive(CSV);
  assert.deepEqual(map.get("12345-678")!.names, ["WATER", "LACTIC ACID, UNSPECIFIED FORM", "METHYLISOTHIAZOLINONE", "FRAGRANCE", "RETINYL PALMITATE"]);
  assert.ok(map.get("12345-678")!.text);
  assert.deepEqual(map.get("55555-001")!.names, []);
});

test("an SPL inactive list feeds allergen hits, free-from flags and ingredient rows like label text", () => {
  const map = groupSplInactive(CSV);
  const inactive = drugInactiveList("", map.get("12345-678"));
  assert.equal(inactive.source, "spl_iact");
  // what seed.ts does with it
  const fullText = `SALICYLIC ACID 2% ${inactive.text}`;
  const hits = computeAllergenHits(fullText)!;
  assert.ok(hits.includes("methylisothiazolinone"), `hits: ${hits}`);
  assert.ok(hits.includes("fragrance"), `hits: ${hits}`);
  const flags = computeFreeFromFlags(fullText)!;
  assert.ok(flags !== null, "a known list is assessed, not unknown");
  assert.ok(!flags.includes("fragrance-free"), `flags: ${flags}`);

  const slugs = inactive.parsed.map((p) => p.slug);
  // comma inside a registry name stays one ingredient, qualifier dropped
  assert.deepEqual(slugs, ["water", "lactic-acid", "methylisothiazolinone", "fragrance", "retinyl-palmitate"]);
  const findings = pregnancyFindings(slugs.map((id, i) => ({ id, position: i + 1 })), ["salicylic-acid"]);
  assert.ok(findings.some((f) => f.entry.id === "retinyl-esters"), "pregnancy matcher sees the SPL list");
});

test("section text alone is split like label text", () => {
  const inactive = drugInactiveList(null, groupSplInactive(CSV).get("55555-001"));
  assert.equal(inactive.source, "spl_text");
  assert.deepEqual(inactive.parsed.map((p) => p.slug), ["glycerin", "lanolin", "water"]);
  assert.ok(computeAllergenHits(`ZINC OXIDE 20% ${inactive.text}`)!.includes("lanolin"));
});

test("the catalog's own label text wins; nothing known stays unknown", () => {
  const map = groupSplInactive(CSV);
  const label = drugInactiveList("Inactive ingredients: aloe vera, glycerin", map.get("12345-678"));
  assert.equal(label.source, "label");
  assert.deepEqual(label.parsed.map((p) => p.slug), ["aloe-vera", "glycerin"]);
  const none = drugInactiveList(undefined, undefined);
  assert.equal(none.text, null);
  assert.equal(computeAllergenHits(none.text), null);
});

test("an unsplittable label line gives way to the SPL list but still feeds matching", () => {
  const map = groupSplInactive(CSV);
  const blob = "Inactive ingredients Water Lactic Acid Methylisothiazolinone Lanolin";
  const r = drugInactiveList(blob, map.get("12345-678"));
  assert.equal(r.source, "spl_iact");
  assert.equal(r.parsed[0].slug, "water");
  assert.ok(r.text!.includes("Lanolin"), "the label's own words are kept for allergen matching");
  // without an SPL list the label line is all there is
  assert.equal(drugInactiveList(blob, undefined).source, "label");
});

test("registry names are swapped for label spellings by UNII", () => {
  // VITAMIN A PALMITATE (UNII 1D1K0N0VVC) is how the registry names retinyl palmitate
  const parsed = parseIngredientNames(["VITAMIN A PALMITATE", "GLYCERIN"], ["1D1K0N0VVC", "PDC6A3C0OX"]);
  assert.equal(parsed[0].slug, "retinyl-palmitate");
  assert.equal(parsed[1].slug, "glycerin");
});
