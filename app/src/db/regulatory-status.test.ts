import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTHORITIES, REGULATED_SUBSTANCES, bannedIngredientIds, regulatoryStatusFor, regulatorySummary, substancesForIngredient } from "./regulatory-status";
import { computeFreeFromFlags } from "./ingredient-flags";

const leaveOn = { rinseOff: false, today: "2026-11-11" };
const rinseOff = { rinseOff: true, today: "2026-11-11" };

test("every action names a known authority, a source and a valid date", () => {
  const ids = new Set<string>();
  for (const s of REGULATED_SUBSTANCES) {
    assert.ok(!ids.has(s.id), `duplicate ${s.id}`);
    ids.add(s.id);
    assert.ok(s.actions.length > 0, s.id);
    for (const a of s.actions) {
      assert.ok(AUTHORITIES[a.authority], `${s.id}: ${a.authority}`);
      assert.match(a.url, /^https:\/\//, s.id);
      assert.ok(a.summary.length > 20, s.id);
      for (const d of [a.from, a.sellThrough]) if (d) assert.match(d, /^\d{4}-\d{2}-\d{2}$/, s.id);
      if (a.from && a.sellThrough) assert.ok(a.sellThrough >= a.from, s.id);
    }
  }
});

test("copolymer fragments and look-alikes are not matched", () => {
  for (const id of ["styrene", "vinyl-acetate", "polyethylene-terephthalate", "diethylhexyl-2-6-naphthalate", "laurus-nobilis-leaf-oil", "sodium-fluoride", "chlorphenesin", "silver-citrate"]) {
    assert.deepEqual(substancesForIngredient(id), [], id);
  }
});

test("in-force bans, future bans and reviews are kept apart", () => {
  const st = regulatoryStatusFor(["butylphenyl-methylpropional", "dmdm-hydantoin", "kojic-acid", "water"], leaveOn);
  const lilial = st.find((s) => s.substance.id === "lilial")!;
  assert.deepEqual(lilial.banned.map((a) => a.authority), ["eu"]);
  assert.deepEqual(lilial.bannedLater.map((a) => a.authority), ["ca"]);
  const dmdm = st.find((s) => s.substance.id === "wa-formaldehyde-releasers")!;
  assert.equal(dmdm.banned.length, 0);
  assert.equal(dmdm.bannedLater[0].from, "2027-01-01");
  assert.deepEqual(regulatorySummary(st), { banned: 1, bannedLater: 1, underReview: 1, local: 0 });
  // Once Washington's date passes, the releaser counts as banned.
  const later = regulatorySummary(regulatoryStatusFor(["dmdm-hydantoin"], { rinseOff: false, today: "2027-01-01" }));
  assert.equal(later.banned, 1);
});

test("leave-on bans skip rinse-off products and the reverse", () => {
  const mi = (ctx: typeof leaveOn) => regulatorySummary(regulatoryStatusFor(["methylisothiazolinone"], ctx));
  assert.equal(mi(leaveOn).banned, 1);
  assert.equal(mi(rinseOff).banned, 0);
  const d5 = (ctx: typeof leaveOn) => regulatoryStatusFor(["cyclopentasiloxane"], ctx)[0];
  assert.equal(d5(rinseOff).banned.length, 1);
  assert.equal(d5(leaveOn).banned.length, 0);
  assert.equal(d5(leaveOn).bannedLater[0].from, "2027-06-06");
});

test("a drug active is exempt only where the rule says so", () => {
  const tar = regulatoryStatusFor(["coal-tar"], { ...rinseOff, activeIngredientIds: ["coal-tar"] });
  assert.equal(tar.length, 0);
  const tarInactive = regulatoryStatusFor(["coal-tar"], rinseOff);
  assert.equal(tarInactive[0].banned.length, 2);
  // Zinc pyrithione shampoo is a cosmetic in the EU, so the ban still counts.
  const zpt = regulatoryStatusFor(["pyrithione-zinc"], { ...rinseOff, activeIngredientIds: ["pyrithione-zinc"] });
  assert.equal(zpt[0].banned.length, 1);
});

test("Hawaii's reef rule is local, and sunscreen filters stay out of the review count", () => {
  const st = regulatoryStatusFor(["oxybenzone", "avobenzone"], leaveOn);
  assert.deepEqual(regulatorySummary(st), { banned: 0, bannedLater: 0, underReview: 0, local: 1 });
});

test("filter ids include plain bans in force only", () => {
  const ids = bannedIngredientIds(["isobutylparaben", "methylisothiazolinone", "dmdm-hydantoin", "coal-tar", "water"], "2026-11-11");
  assert.deepEqual(ids, ["isobutylparaben"]);
});

test("public-concern checks", () => {
  const base = "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Tocopherol, Xanthan Gum";
  const flags = computeFreeFromFlags(`${base}, Polyethylene Glycol, Sodium Polystyrene Sulfonate`)!;
  assert.ok(flags.includes("microplastic-free"));
  assert.ok(!computeFreeFromFlags(`${base}, Polyethylene`)!.includes("microplastic-free"));
  assert.ok(!computeFreeFromFlags(`${base}, Nylon-12`)!.includes("microplastic-free"));
  assert.ok(!computeFreeFromFlags(`${base}, PTFE`)!.includes("pfas-free"));
  assert.ok(!computeFreeFromFlags(`${base}, Cyclopentasiloxane`)!.includes("cyclic-silicone-free"));
  assert.ok(computeFreeFromFlags(`${base}, Dimethicone`)!.includes("cyclic-silicone-free"));
  assert.ok(!computeFreeFromFlags(`${base}, DMDM Hydantoin`)!.includes("formaldehyde-releaser-free"));
  assert.ok(!computeFreeFromFlags(`${base}, BHT`)!.includes("bha-bht-free"));
  assert.ok(!computeFreeFromFlags(`${base}, Polysorbate 20`)!.includes("ethoxylate-free"));
});

test("other states: Oregon from 2027, Minnesota and Colorado PFAS already, New York mercury", () => {
  const [ptfe] = regulatoryStatusFor(["ptfe"], leaveOn);
  for (const a of ["mn", "co", "me"]) assert.ok(ptfe.banned.some((x) => x.authority === a), a);
  assert.ok(ptfe.bannedLater.some((x) => x.authority === "or" && x.from === "2027-01-01"));
  const [dmdm] = regulatoryStatusFor(["dmdm-hydantoin"], leaveOn);
  assert.deepEqual(dmdm.bannedLater.map((a) => a.authority).sort(), ["or", "wa"]);
  const [hg] = regulatoryStatusFor(["thimerosal"], leaveOn);
  assert.ok(hg.banned.some((a) => a.authority === "ny") && hg.banned.some((a) => a.authority === "md"));
  // Oregon's ban reaches products whose drug active is triclosan.
  const [tcs] = regulatoryStatusFor(["triclosan"], { ...rinseOff, activeIngredientIds: ["triclosan"] });
  assert.ok(tcs.bannedLater.some((a) => a.authority === "or"));
});

test("recheck fetches EUR-Lex and leginfo pages through routes the cloud can reach", async () => {
  const { fetchableUrl, fingerprint } = await import("./regulatory-recheck");
  assert.equal(fetchableUrl("https://eur-lex.europa.eu/eli/reg/2016/1198/oj").url, "http://publications.europa.eu/resource/celex/32016R1198");
  assert.equal(fetchableUrl("https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02009R1223-20260518").url, "http://publications.europa.eu/resource/celex/02009R1223-20260518");
  assert.match(fetchableUrl("https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=108981.5").url, /california\.public\.law\/codes\/health_and_safety_code_section_108981\.5$/);
  assert.equal(fingerprint("<p>Ban</p> 10:42 am").hash, fingerprint("<b>Ban</b>").hash);
});
