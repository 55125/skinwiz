import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PROFILE, PROFILE_CONCERNS, accountPart, hasProfile, matchProduct, mergeProfiles, parseProfile, sanitizeProfile, serializeProfile, withLocalFlags, type Profile } from "./profile-shared";

const p = (o: Partial<Profile>): Profile => sanitizeProfile({ ...EMPTY_PROFILE, ...o });

test("accountPart never carries pregnancy or breastfeeding answers", () => {
  const out = accountPart(p({ skin: "dry", concerns: ["acne"], pregnant: true, breastfeeding: true }));
  assert.equal(out.pregnant, false);
  assert.equal(out.breastfeeding, false);
  assert.equal(out.skin, "dry");
  assert.deepEqual(out.concerns, ["acne"]);
});

test("withLocalFlags takes the flags from this browser, the rest from the account", () => {
  const out = withLocalFlags(p({ skin: "oily", likes: ["niacinamide"] }), p({ skin: "dry", pregnant: true }));
  assert.equal(out.skin, "oily");
  assert.deepEqual(out.likes, ["niacinamide"]);
  assert.equal(out.pregnant, true);
  assert.equal(out.breastfeeding, false);
});

test("mergeProfiles with no saved profile adopts this browser's", () => {
  const local = p({ skin: "dry", concerns: ["dry-skin-eczema"], pregnant: true });
  assert.deepEqual(mergeProfiles(null, local), local);
});

test("mergeProfiles combines lists, keeps the account's skin type, and lets dislikes win", () => {
  const saved = p({ skin: "oily", concerns: ["acne"], likes: ["niacinamide"], dislikes: ["glycerin"] });
  const local = p({ skin: "dry", concerns: ["brightening-texture"], likes: ["glycerin", "squalane"], dislikes: ["squalane"] });
  const out = mergeProfiles(saved, local);
  assert.equal(out.skin, "oily");
  assert.deepEqual(out.concerns.sort(), ["acne", "brightening-texture"]);
  assert.deepEqual(out.dislikes.sort(), ["glycerin", "squalane"]);
  assert.deepEqual(out.likes, ["niacinamide"]);
});

test("mergeProfiles fills a missing skin type from this browser", () => {
  assert.equal(mergeProfiles(p({ concerns: ["acne"] }), p({ skin: "combination" })).skin, "combination");
});

test("mergeProfiles takes pregnancy and breastfeeding from this browser only", () => {
  const out = mergeProfiles(p({ skin: "dry" }), p({ pregnant: false, breastfeeding: true }));
  assert.equal(out.pregnant, false);
  assert.equal(out.breastfeeding, true);
});

test("sensitive is its own yes/no: old 'sensitive' skin type carries over", () => {
  const old = parseProfile("s=sensitive|c=acne|l=|d=");
  assert.equal(old.skin, null);
  assert.equal(old.sensitive, true);
  assert.equal(sanitizeProfile({ skin: "sensitive", concerns: [] }).sensitive, true);
  const both = sanitizeProfile({ skin: "combination", sensitive: true });
  assert.deepEqual([both.skin, both.sensitive], ["combination", true]);
  const back = parseProfile(serializeProfile(both));
  assert.deepEqual([back.skin, back.sensitive], ["combination", true]);
  assert.equal(parseProfile("s=oily|c=|l=|d=").sensitive, false);
  assert.equal(hasProfile(sanitizeProfile({ sensitive: true })), true);
  assert.equal(mergeProfiles(p({ skin: "oily" }), p({ sensitive: true })).sensitive, true);
  assert.equal(accountPart(p({ sensitive: true, pregnant: true })).sensitive, true);
});

test("oily + sensitive gets both sets of reasons", () => {
  const product = { freeFromFlags: [] as string[] };
  const ings = [{ id: "petrolatum", position: 1, isActive: false }];
  const m = matchProduct(product, ings, p({ skin: "oily", sensitive: true }), []);
  const texts = (m?.reasons ?? []).map((r) => r.text);
  assert.ok(texts.some((t) => t.startsWith("Oily skin")));
  assert.ok(texts.some((t) => t.startsWith("Sensitive skin")));
});

test("the profile offers the site's eight concerns by the same names", async () => {
  const { CONCERN_DEFINITIONS } = await import("../db/actives");
  assert.deepEqual(
    PROFILE_CONCERNS.map((c) => [c.id, c.label]),
    CONCERN_DEFINITIONS.map((c) => [c.id, c.name]),
  );
});

test("old saved concerns carry over to the site's concerns", () => {
  const old = parseProfile("s=|c=acne,dark-spots,aging,dryness,sun|l=|d=");
  assert.deepEqual(old.concerns, ["acne", "brightening-texture", "dry-skin-eczema", "sun-protection"]);
  assert.equal(old.sensitive, false);
  assert.equal(old.fungalAcne, false);
  const flags = sanitizeProfile({ concerns: ["fungal-acne", "redness", "made-up"] });
  assert.deepEqual([flags.concerns, flags.sensitive, flags.fungalAcne], [[], true, true]);
  const back = parseProfile(serializeProfile(flags));
  assert.deepEqual([back.sensitive, back.fungalAcne], [true, true]);
  assert.equal(hasProfile(sanitizeProfile({ fungalAcne: true })), true);
  assert.equal(mergeProfiles(p({ skin: "oily" }), p({ fungalAcne: true })).fungalAcne, true);
});

test("fungal acne is scored by the fungal-acne-safe check", () => {
  const ings = [{ id: "water", position: 1, isActive: false }];
  const safe = matchProduct({ freeFromFlags: ["fungal-acne-safe"] }, ings, p({ fungalAcne: true }), []);
  assert.ok(safe?.reasons.some((r) => r.text === "Fungal-acne-safe ingredient list"));
  const risky = matchProduct({ freeFromFlags: [] }, ings, p({ fungalAcne: true }), []);
  assert.ok(risky?.reasons.some((r) => r.text === "Contains fungal-acne triggers"));
  assert.ok((risky?.score ?? 100) <= 45);
});

test("each concern rewards its own actives", () => {
  const product = { freeFromFlags: [] as string[] };
  const ing = (id: string, position: number, isActive = false) => ({ id, position, isActive });
  const reasons = (concern: string, ings: ReturnType<typeof ing>[]) =>
    (matchProduct(product, ings, p({ concerns: [concern] }), []) ?? { reasons: [] }).reasons.filter((r) => r.tone === "good").map((r) => r.text);
  assert.deepEqual(reasons("acne", [ing("benzoyl-peroxide", 0, true)]), ["Acne: benzoyl peroxide"]);
  assert.deepEqual(reasons("dandruff-seb-derm", [ing("pyrithione-zinc", 0, true)]), ["Dandruff & Seborrheic Dermatitis: pyrithione zinc"]);
  assert.deepEqual(reasons("itch-relief", [ing("hydrocortisone", 0, true)]), ["Itch Relief: hydrocortisone"]);
  assert.deepEqual(reasons("antifungal", [ing("clotrimazole", 0, true)]), ["Antifungal: clotrimazole"]);
  assert.deepEqual(reasons("excessive-sweating", [ing("aluminum-chlorohydrate", 0, true)]), ["Excessive Sweating: aluminum chlorohydrate"]);
  assert.deepEqual(reasons("dry-skin-eczema", [ing("ceramide-np", 4), ing("sodium-hyaluronate", 6)]), ["Dry Skin & Eczema: sodium hyaluronate, ceramide np"]);
  assert.deepEqual(reasons("brightening-texture", [ing("tetrahexyldecyl-ascorbate", 3)]), ["Brightening & Texture: tetrahexyldecyl ascorbate"]);
  // Sunscreen filters count; a colorant titanium dioxide in makeup doesn't.
  assert.deepEqual(reasons("sun-protection", [ing("avobenzone", 0, true)]), ["Sun Protection: avobenzone"]);
  assert.deepEqual(reasons("sun-protection", [ing("titanium-dioxide", 5)]), []);
  assert.deepEqual(reasons("sun-protection", [ing("titanium-dioxide", 0, true)]), ["Sun Protection: titanium dioxide"]);
  // The eczema page leaves diphenhydramine out, so the profile does too.
  assert.deepEqual(reasons("dry-skin-eczema", [ing("diphenhydramine", 0, true)]), []);
});
