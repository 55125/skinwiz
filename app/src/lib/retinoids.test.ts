// `npm test`: retinoid detection for the regimen cautions and the brightening match
// score (lib/retinoids.ts). Real lists: INKEY Retinol Serum has retinyl
// acetate 7th and hydroxypinacolone retinoate 19th; CeraVe Skin Renewing
// Retinol Serum has retinol 21st.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EMPTY_PROFILE, matchProduct } from "./profile-shared";

let classesFromIngredients: typeof import("./routine-conflicts").classesFromIngredients;

before(async () => {
  // routine-conflicts reaches the database module on import; point it at an
  // empty scratch file so the test never opens the real catalog.
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "actively-retinoid-")), "test.db");
  ({ classesFromIngredients } = await import("./routine-conflicts"));
});

const list = (...ids: [string, number][]) => ids.map(([ingredientId, position]) => ({ ingredientId, position }));

test("potent retinoids count wherever they sit on the list", () => {
  assert.ok(classesFromIngredients(list(["water", 1], ["hydroxypinacolone-retinoate", 19])).has("retinoid"));
  assert.ok(classesFromIngredients(list(["water", 1], ["retinol-cosmetic", 21])).has("retinoid"));
  assert.ok(classesFromIngredients(list(["retinal", 30])).has("retinoid"));
  assert.ok(classesFromIngredients(list(["tretinoin", 0])).has("retinoid"));
});

test("retinyl esters count only near the top of the list", () => {
  assert.ok(classesFromIngredients(list(["retinyl-acetate", 7])).has("retinoid"));
  assert.ok(classesFromIngredients(list(["retinyl-propionate", 4])).has("retinoid"));
  assert.ok(!classesFromIngredients(list(["retinyl-palmitate", 25])).has("retinoid"));
});

test("acids keep the position cutoff", () => {
  assert.ok(classesFromIngredients(list(["glycolic-acid", 2])).has("exfoliant"));
  assert.ok(!classesFromIngredients(list(["glycolic-acid", 30])).has("exfoliant"));
});

test("brightening & texture profiles credit retinoids low on the list", () => {
  const profile = { ...EMPTY_PROFILE, concerns: ["brightening-texture"] };
  const product = { freeFromFlags: [] };
  const ing = (id: string, position: number) => ({ id, position, isActive: false });
  const hpr = matchProduct(product, [ing("water", 1), ing("hydroxypinacolone-retinoate", 19)], profile, []);
  assert.ok(hpr?.reasons.some((r) => r.tone === "good" && /hydroxypinacolone retinoate/.test(r.text)), JSON.stringify(hpr));
  const retinol = matchProduct(product, [ing("water", 1), ing("retinol-cosmetic", 21)], profile, []);
  assert.ok(retinol?.reasons.some((r) => /Brightening & Texture: retinol/.test(r.text)), JSON.stringify(retinol));
  const trace = matchProduct(product, [ing("water", 1), ing("retinyl-palmitate", 25)], profile, []);
  assert.ok(!trace?.reasons.some((r) => /Brightening/.test(r.text)), JSON.stringify(trace));
});
