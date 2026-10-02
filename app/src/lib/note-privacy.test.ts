// `npm test`: the builder's patient-detail heads-up (lib/note-privacy.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { findPrivacyHits } from "./note-privacy";

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
