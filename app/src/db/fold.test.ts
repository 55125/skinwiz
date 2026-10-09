import { test } from "node:test";
import assert from "node:assert/strict";
import { foldAccents } from "./fold";

test("foldAccents strips accents and curly apostrophes, leaves ASCII alone", () => {
  assert.equal(foldAccents("Curél"), "Curel");
  assert.equal(foldAccents("L’Oréal Paris Crème"), "L'Oreal Paris Creme");
  assert.equal(foldAccents("Lancôme"), "Lancome");
  assert.equal(foldAccents("%curél%"), "%curel%");
  assert.equal(foldAccents("CeraVe"), "CeraVe");
  assert.equal(foldAccents(null), null);
});
