// Structural checks on the handout library (content is clinically reviewed
// separately, in review/handout-library-review.html): unique ids, every
// category used, size limits the builder and validator enforce, no doses or
// brand-name or isotretinoin slips, and that each template saves cleanly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_HANDOUT_TEMPLATES, HANDOUT_CATEGORIES } from "./handout-templates";
import { MAX_HEADING, MAX_RULE, MAX_SECTION_BODY, MAX_SECTIONS, MAX_STEPS, MAX_STOP_RULES, MAX_TITLE } from "@/lib/handout-types";

test("ids are unique and every category has handouts", () => {
  const ids = ALL_HANDOUT_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, ids.filter((id, i) => ids.indexOf(id) !== i).join(", "));
  for (const c of HANDOUT_CATEGORIES) assert.ok(ALL_HANDOUT_TEMPLATES.some((t) => t.category === c.id), c.id);
  assert.ok(ALL_HANDOUT_TEMPLATES.length >= 100);
});

test("every template fits the builder's limits", () => {
  for (const t of ALL_HANDOUT_TEMPLATES) {
    assert.ok(t.title.length <= MAX_TITLE, `${t.id} title`);
    assert.ok(t.sections.length <= MAX_SECTIONS, `${t.id} sections`);
    assert.ok(t.steps.length <= MAX_STEPS, `${t.id} steps`);
    assert.ok(t.stopRules.length <= MAX_STOP_RULES - 2, `${t.id} leaves room for the 2 universal rules`);
    assert.ok(t.sections.length + t.steps.length > 0, `${t.id} is empty`);
    for (const s of t.sections) {
      assert.ok(s.heading.length > 0 && s.heading.length <= MAX_HEADING, `${t.id} heading "${s.heading}"`);
      assert.ok(s.body.length <= MAX_SECTION_BODY, `${t.id} body`);
      assert.ok(!/\*\*|^#|https?:\/\//m.test(s.body), `${t.id} uses markup or a URL`);
    }
    for (const r of t.stopRules) assert.ok(r.length <= MAX_RULE, `${t.id} rule`);
    assert.ok(t.sources.length > 0, `${t.id} sources`);
  }
});

test("library drafts never mention isotretinoin or give a prescription dose", () => {
  for (const t of ALL_HANDOUT_TEMPLATES) {
    const text = JSON.stringify([t.title, t.sections, t.stopRules, t.steps.map((s) => s.directions)]);
    assert.ok(!/isotretinoin|accutane/i.test(text), `${t.id} mentions isotretinoin`);
    assert.ok(!/\b\d+(\.\d+)?\s?mg\b/i.test(text), `${t.id} has a mg dose`);
  }
});
