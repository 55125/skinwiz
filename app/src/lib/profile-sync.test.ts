import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PROFILE, accountPart, hasProfile, matchProduct, mergeProfiles, parseProfile, sanitizeProfile, serializeProfile, withLocalFlags, type Profile } from "./profile-shared";

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
  const local = p({ skin: "dry", concerns: ["redness"], pregnant: true });
  assert.deepEqual(mergeProfiles(null, local), local);
});

test("mergeProfiles combines lists, keeps the account's skin type, and lets dislikes win", () => {
  const saved = p({ skin: "oily", concerns: ["acne"], likes: ["niacinamide"], dislikes: ["glycerin"] });
  const local = p({ skin: "dry", concerns: ["aging"], likes: ["glycerin", "squalane"], dislikes: ["squalane"] });
  const out = mergeProfiles(saved, local);
  assert.equal(out.skin, "oily");
  assert.deepEqual(out.concerns.sort(), ["acne", "aging"]);
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
