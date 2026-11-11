import { test } from "node:test";
import assert from "node:assert/strict";
import { getAllergen, getAllergenGroup, allergenMembers } from "./contact-allergens";
import { regulatoryNoteFor, regulatoryNoteForGroup, regulatoryNotesForHits } from "./regulatory-notes";

test("regulatory notes only name allergen ids that exist", () => {
  for (const id of ["dmdm-hydantoin", "diazolidinyl-urea", "quaternium-15", "formaldehyde", "tris-nitro", "melamine-formaldehyde"]) {
    assert.ok(getAllergen(id), id);
    assert.ok(regulatoryNoteFor(id), id);
  }
});

test("releasers Washington didn't list get no note", () => {
  assert.equal(regulatoryNoteFor("hydroxyethyl-triazine"), undefined);
  assert.equal(regulatoryNoteFor("methylisothiazolinone"), undefined);
});

test("group pages get the right note", () => {
  assert.ok(getAllergenGroup("formaldehyde-releasers"));
  assert.equal(regulatoryNoteForGroup(allergenMembers("formaldehyde-releasers"))?.id, "wa-formaldehyde-releaser");
  assert.equal(regulatoryNoteForGroup(allergenMembers("formaldehyde-and-releasers"))?.id, "wa-formaldehyde");
  assert.equal(regulatoryNoteForGroup(allergenMembers("isothiazolinones")), undefined);
});

test("a product's hits are grouped by note", () => {
  const out = regulatoryNotesForHits(["dmdm-hydantoin", "phenoxyethanol", "diazolidinyl-urea"]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].allergenIds, ["dmdm-hydantoin", "diazolidinyl-urea"]);
  assert.deepEqual(regulatoryNotesForHits(null), []);
});

test("featured products are unique", () => {
  const ids = regulatoryNoteFor("dmdm-hydantoin")?.featuredProductIds ?? [];
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length);
});
