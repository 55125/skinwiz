// Which ingredient pages are indexed (lib/ingredient-index.ts). `npm test`.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let isIndexableIngredient: typeof import("./ingredient-index").isIndexableIngredient;

before(async () => {
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "actively-ingidx-")), "test.db");
  ({ isIndexableIngredient } = await import("./ingredient-index"));
});

const row = (name: string, productCount: number) => ({ id: name.toLowerCase(), name, aliases: [], productCount });

test("a plain inactive is indexed only once enough products list it", () => {
  assert.equal(isIndexableIngredient(row("Caprylyl Glycol", 9), false), false);
  assert.equal(isIndexableIngredient(row("Caprylyl Glycol", 10), false), true);
});

test("pages with content of their own are indexed from two products", () => {
  assert.equal(isIndexableIngredient(row("Niacinamide", 2), true), true, "tracked active");
  assert.equal(isIndexableIngredient(row("Methylisothiazolinone", 2), false), true, "contact allergen");
});

test("one-off entries are never indexed", () => {
  assert.equal(isIndexableIngredient(row("Niacinamide", 1), true), false);
});
