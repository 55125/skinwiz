// `npm test`: the builder's patient-detail heads-up (lib/note-privacy.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { findPrivacyHits, handoutFreeText, hasBlockingHit } from "./note-privacy";
import { ALL_HANDOUT_TEMPLATES } from "../db/handout-templates";

const kinds = (t: string) => findPrivacyHits(t).map((h) => h.kind).sort();

test("flags names, dates of birth, record numbers and emails", () => {
  assert.deepEqual(kinds("Patient: Maria Lopez, DOB 03/14/1987"), ["dob", "name"]);
  assert.deepEqual(kinds("MRN 00482913"), ["mrn"]);
  assert.deepEqual(kinds("Plan for Mrs. Chen"), ["name"]);
  assert.deepEqual(kinds("Plan for John Smith"), ["name"]);
  assert.deepEqual(kinds("email jane@example.com"), ["contact"]);
  assert.deepEqual(kinds("born 1990-02-03"), ["dob"]);
});

test("ordinary handout text passes", () => {
  assert.deepEqual(kinds("Expect dryness for 4 to 6 weeks. Use SPF 30 every morning. Call 555-123-4567 with questions."), []);
  assert.deepEqual(kinds("Apply tretinoin 0.025% cream every other night for 2 weeks."), []);
});

const blocks = (t: string) => hasBlockingHit(findPrivacyHits(t));

test("labelled identifiers block the save; loose matches only warn", () => {
  assert.equal(blocks("DOB 03/14/1987"), true);
  assert.equal(blocks("date of birth: 1987-03-14"), true);
  assert.equal(blocks("MRN 00482913"), true);
  assert.equal(blocks("Patient: Maria Lopez"), true);
  assert.equal(blocks("Plan for John Smith"), false);
  assert.equal(blocks("Recheck on 11/15/2026"), false);
  assert.equal(blocks("email jane@example.com"), false);
  assert.equal(blocks("Ask about your date of birth control options"), false);
});

test("no built-in template blocks a save", () => {
  for (const t of ALL_HANDOUT_TEMPLATES) {
    const text = JSON.stringify(t).replace(/\\n/g, "\n");
    assert.equal(blocks(text), false, t.id);
  }
});

test("handoutFreeText covers every typed field", () => {
  const text = handoutFreeText({ title: "T", notes: "N", stopRules: ["R"], sections: [{ heading: "H", body: "B" }], steps: [{ label: "L", directions: "D" }] });
  for (const part of ["T", "N", "R", "H\nB", "L D"]) assert.ok(text.includes(part), part);
});
