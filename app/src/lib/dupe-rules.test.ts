// `npm test`: the dupe finder's rules (lib/dupe-rules.ts) on plain rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeKey,
  brandKey,
  compareStrengths,
  dupeForm,
  inactiveSimilarity,
  rankDupes,
  type DupeCandidate,
} from "./dupe-rules";

test("form: product types in the name beat the FDA form", () => {
  assert.equal(dupeForm("CREAM", "Oxy Maximum Strength Acne Cream Cleanser"), "cleanser");
  assert.equal(dupeForm("LIQUID", "Acne Foaming Wash 10% Benzoyl Peroxide"), "cleanser");
  assert.equal(dupeForm("STICK", "Cremo All-Season Lip Balm SPF 25"), "lip");
  assert.equal(dupeForm(null, "flormar REBORN FOUNDATION SUNSCREEN BROAD SPECTRUM SPF 20"), "tinted");
  assert.equal(dupeForm(null, "Head & Shoulders Shampoo Itchy Scalp 400mL"), "shampoo");
  assert.equal(dupeForm(null, "Hydrocolloid Acne Patches"), "patch");
  // "Lipid" isn't a lip product.
  assert.equal(dupeForm("CREAM", "Lipid Repair Cream"), "cream");
});

test("form: FDA forms are grouped so near-synonyms match", () => {
  assert.equal(dupeForm("LOTION", "Sheer Sunscreen SPF 30"), "lotion");
  assert.equal(dupeForm("EMULSION", "Sheer Sunscreen SPF 30"), "lotion");
  assert.equal(dupeForm("AEROSOL, SPRAY", "Sport Sunscreen SPF 50"), "spray");
  assert.equal(dupeForm("SPRAY", "Sport Sunscreen SPF 50"), "spray");
  assert.equal(dupeForm("SOLUTION", "Acne Treatment"), "liquid");
  assert.equal(dupeForm("LIQUID", "Acne Treatment"), "liquid");
  assert.equal(dupeForm("JELLY", "Petroleum Jelly"), "ointment");
  assert.equal(dupeForm("CREAM", "Hydrocortisone 1%"), "cream");
  // A kit has no dupe, and the FDA form wins over a texture word in the name.
  assert.equal(dupeForm("KIT", "Post Procedure Kit"), null);
  assert.equal(dupeForm("GEL", "Gel Cream"), "gel");
});

test("form: with no FDA form, a texture word in the name, else unknown", () => {
  assert.equal(dupeForm(null, "Water Gel Cream"), "cream");
  assert.equal(dupeForm(null, "Hyaluronic Acid Serum"), "serum");
  assert.equal(dupeForm(null, "Healing Balm Stick"), "stick");
  assert.equal(dupeForm(null, "Oil-Free Moisturizer"), "cream");
  assert.equal(dupeForm(null, "Squalane Face Oil"), "oil");
  assert.equal(dupeForm(null, "Broad Spectrum SPF 30"), null);
});

test("active key ignores order and repeats", () => {
  assert.equal(activeKey(["zinc-oxide", "titanium-dioxide"]), activeKey(["titanium-dioxide", "zinc-oxide", "zinc-oxide"]));
  assert.notEqual(activeKey(["zinc-oxide"]), activeKey(["zinc-oxide", "titanium-dioxide"]));
  assert.equal(activeKey([]), "");
});

test("strengths: same, different, or not listed on one side", () => {
  const ids = ["octinoxate", "titanium-dioxide"];
  assert.equal(compareStrengths(ids, { octinoxate: 7.5, "titanium-dioxide": 3 }, { octinoxate: 7.49, "titanium-dioxide": 3 }), "same");
  assert.equal(compareStrengths(ids, { octinoxate: 7.5, "titanium-dioxide": 3 }, { octinoxate: 5, "titanium-dioxide": 3 }), "different");
  assert.equal(compareStrengths(ids, { octinoxate: 7.5, "titanium-dioxide": 3 }, null), "unknown");
  assert.equal(compareStrengths(ids, { octinoxate: 7.5 }, { octinoxate: 7.5, "titanium-dioxide": 3 }), "unknown");
  // A stated difference rules it out even when another strength is missing.
  assert.equal(compareStrengths(ids, { octinoxate: 7.5 }, { octinoxate: 2, "titanium-dioxide": 3 }), "different");
});

test("inactive similarity: identical lists match fully, rare ingredients count more", () => {
  const rarity = (id: string) => ({ water: 0.01, glycerin: 0.05, ceramide: 3, peptide: 4, fragrance: 1 })[id] ?? 1;
  const list = (ids: string[], ordered = false) => ({ ids, ordered });
  assert.equal(inactiveSimilarity(list(["water", "glycerin", "ceramide"]), list(["water", "glycerin", "ceramide"]), rarity)!.score, 1);
  const commonOnly = inactiveSimilarity(list(["water", "glycerin", "ceramide"]), list(["water", "glycerin", "peptide"]), rarity)!;
  const rareShared = inactiveSimilarity(list(["water", "glycerin", "ceramide"]), list(["water", "fragrance", "ceramide"]), rarity)!;
  assert.equal(commonOnly.shared, 2);
  assert.equal(rareShared.shared, 2);
  assert.ok(rareShared.score > commonOnly.score, "sharing a ceramide outweighs sharing glycerin");
  assert.equal(inactiveSimilarity(list([]), list(["water"]), rarity), null);
});

test("inactive similarity: list order counts only when both lists are ordered", () => {
  const rarity = () => 1;
  const a = ["a", "b", "c", "d", "e", "f"];
  const reversed = [...a].reverse();
  assert.equal(inactiveSimilarity({ ids: a, ordered: false }, { ids: reversed, ordered: false }, rarity)!.score, 1);
  assert.equal(inactiveSimilarity({ ids: a, ordered: true }, { ids: reversed, ordered: false }, rarity)!.score, 1);
  const ordered = inactiveSimilarity({ ids: a, ordered: true }, { ids: reversed, ordered: true }, rarity)!;
  assert.ok(ordered.score < 1);
  assert.equal(ordered.shared, 6);
});

test("ranking: discontinued last, then closest match, then in stock and US before imports", () => {
  const row = (id: string, over: Partial<DupeCandidate>): DupeCandidate => ({
    id,
    brandName: id,
    strength: "same",
    match: { score: 0.5, shared: 5, union: 10 },
    discontinued: false,
    inStock: false,
    imported: false,
    ...over,
  });
  const order = rankDupes([
    row("gone-but-identical", { discontinued: true, match: { score: 1, shared: 10, union: 10 } }),
    row("no-list", { match: null }),
    row("import", { imported: true }),
    row("weak", { match: { score: 0.2, shared: 2, union: 10 } }),
    row("close", { match: { score: 0.9, shared: 9, union: 10 } }),
    row("plain", {}),
    row("stocked", { inStock: true }),
    row("strength-unknown", { strength: "unknown" }),
  ]).map((r) => r.id);
  assert.deepEqual(order, ["close", "stocked", "plain", "strength-unknown", "import", "weak", "no-list", "gone-but-identical"]);
});

test("brand key: case, accents and legal suffixes don't make a different brand", () => {
  assert.equal(brandKey("CeraVe"), brandKey("CERAVE"));
  assert.equal(brandKey("L'Oréal"), brandKey("L Oreal"));
  assert.equal(brandKey("Kenvue Brands LLC"), brandKey("Kenvue"));
  assert.equal(brandKey(null), "");
});
