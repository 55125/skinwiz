// `npm test`: FDA label Directions broken into short steps, words unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { directionSteps } from "./label-directions";

test("a run-on label line splits before each step verb", () => {
  assert.deepEqual(
    directionSteps("use twice daily shake well, wet face, then work product into a lather massage onto face avoiding the eyes rinse well"),
    ["Use twice daily", "Shake well, wet face, then work product into a lather", "Massage onto face avoiding the eyes", "Rinse well"],
  );
});

test("splits on the label's own sentence ends and bullets", () => {
  assert.deepEqual(directionSteps("Use AM and PM. Wet face. Gently massage product all over face for 20-30 seconds avoiding eye area."), [
    "Use AM and PM.",
    "Wet face.",
    "Gently massage product all over face for 20-30 seconds avoiding eye area.",
  ]);
  assert.deepEqual(directionSteps("• apply liberally 15 minutes before sun exposure • children under 6 months of age: ask a doctor"), [
    "Apply liberally 15 minutes before sun exposure",
    "Children under 6 months of age: ask a doctor",
  ]);
  assert.deepEqual(directionSteps("apply to affected area\nrepeat as needed"), ["Apply to affected area", "Repeat as needed"]);
});

test("no split mid-clause or after short abbreviations", () => {
  assert.deepEqual(directionSteps("for best results use at least twice a week, e.g. morning and night"), [
    "For best results use at least twice a week, e.g. morning and night",
  ]);
  assert.deepEqual(directionSteps("cleanse the diaper area allow to dry apply paste liberally"), [
    "Cleanse the diaper area allow to dry",
    "Apply paste liberally",
  ]);
  assert.deepEqual(directionSteps("change wet diapers promptly"), ["Change wet diapers promptly"]);
  assert.deepEqual(directionSteps("apply to clean, dry skin and rinse after 10 minutes"), ["Apply to clean, dry skin and rinse after 10 minutes"]);
});

test("a capitalized step opener mid-line starts a new step", () => {
  assert.deepEqual(directionSteps("Apply liberally 15 minutes before sun exposure Use a water resistant sunscreen if swimming or sweating"), [
    "Apply liberally 15 minutes before sun exposure",
    "Use a water resistant sunscreen if swimming or sweating",
  ]);
  assert.deepEqual(directionSteps("for best results use daily"), ["For best results use daily"]);
});

test("words are kept exactly, empty bullets dropped", () => {
  const text = "• Apply liberally 15 minutes before sun exposure • Reapply: • At least every 2 hours • . Spending time in the sun increases your risk";
  const steps = directionSteps(text);
  assert.deepEqual(steps, ["Apply liberally 15 minutes before sun exposure", "Reapply:", "At least every 2 hours", "Spending time in the sun increases your risk"]);
  assert.equal(steps.join(" ").toLowerCase().replace(/\s+/g, " "), text.replace(/[•.]/g, "").replace(/\s+/g, " ").trim().toLowerCase());
});
