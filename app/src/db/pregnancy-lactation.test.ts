// Pregnancy/lactation matching: `npm test`. Mostly the near-misses -- salicylate
// esters that aren't salicylic acid, retinoid variants that are.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pregnancyAvoidIds, pregnancyEntryFor, pregnancyFindings } from "./pregnancy-lactation";
import { parseProfile, sanitizeProfile, serializeProfile } from "@/lib/profile-shared";

const ENTRY: [string, string | undefined][] = [
  ["adapalene", "adapalene"],
  ["retinol-cosmetic", "retinol"],
  ["retinal", "retinol"],
  ["hydroxypinacolone-retinoate", "retinol"],
  ["retinyl-retinoate", "retinol"],
  ["sodium-retinoyl-hyaluronate", "retinol"],
  ["retinyl-palmitate", "retinyl-esters"],
  ["retinol-palmitate", "retinyl-esters"],
  ["tretinoin", "rx-retinoids"],
  ["hydroquinone", "hydroquinone"],
  ["salicylic-acid", "salicylic-acid"],
  ["capryloyl-salicylic-acid", "salicylic-acid"],
  ["betaine-salicylate", "salicylic-acid"],
  // Salicylate esters: emollients, fragrance and sunscreen filters, not BHA.
  ["butyloctyl-salicylate", undefined],
  ["benzyl-salicylate", undefined],
  ["tridecyl-salicylate", undefined],
  ["methyl-salicylate", undefined],
  ["octisalate", "chemical-sunscreen"],
  ["homosalate", "chemical-sunscreen"],
  ["oxybenzone", "oxybenzone"],
  ["benzophenone-4", undefined],
  ["zinc-oxide", "mineral-sunscreen"],
  ["alpha-arbutin", "arbutin"],
  ["kojic-acid-dipalmitate", "kojic-acid"],
  ["coal-tar", "coal-tar"],
  ["miconazole-nitrate", "topical-azoles"],
  ["glycerin", undefined],
  ["phloretin", undefined],
];

for (const [slug, want] of ENTRY) {
  test(`${slug} -> ${want ?? "unclassified"}`, () => {
    assert.equal(pregnancyEntryFor(slug)?.id, want);
  });
}

test("salicylic acid is caution leave-on, ok in a wash-off", () => {
  const ing = [{ id: "salicylic-acid", position: 0 }];
  assert.equal(pregnancyFindings(ing)[0].pregnancy.level, "caution");
  assert.equal(pregnancyFindings(ing, [], { washOff: true })[0].pregnancy.level, "ok");
  assert.equal(pregnancyFindings(ing, [], { washOff: true })[0].lactation.level, "ok");
});

test("label actives are checked when there's no ingredient list", () => {
  const f = pregnancyFindings([], ["adapalene"]);
  assert.equal(f.length, 1);
  assert.equal(f[0].pregnancy.level, "avoid");
  assert.equal(f[0].lactation.level, "caution");
});

test("one finding per entry, best position kept", () => {
  const f = pregnancyFindings(
    [
      { id: "retinal", position: 9 },
      { id: "retinol-cosmetic", position: 4 },
    ],
    ["retinol-cosmetic"],
  );
  assert.equal(f.length, 1);
  assert.deepEqual(f[0].matched.sort(), ["retinal", "retinol-cosmetic"]);
  assert.equal(f[0].position, 0);
});

test("listing filter only drops avoid-level ingredients", () => {
  assert.deepEqual(pregnancyAvoidIds(["adapalene", "salicylic-acid", "retinyl-palmitate", "retinol-cosmetic", "niacinamide"]), [
    "adapalene",
    "retinol-cosmetic",
  ]);
});

test("profile flags round-trip through the cookie and old cookies still parse", () => {
  const p = sanitizeProfile({ skin: "dry", pregnant: true, breastfeeding: false });
  const back = parseProfile(serializeProfile(p));
  assert.equal(back.pregnant, true);
  assert.equal(back.breastfeeding, false);
  assert.equal(back.skin, "dry");
  const old = parseProfile("s=oily|c=acne|l=|d=");
  assert.equal(old.pregnant, false);
  assert.equal(old.skin, "oily");
  assert.equal(sanitizeProfile({ pregnant: "yes" }).pregnant, false);
});
