// The daily price-run clock: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { priceRunDay } from "./config";

test("a price-run day starts at 08:00 UTC", () => {
  assert.equal(priceRunDay(new Date("2026-10-09T07:59:00Z")), "2026-10-08");
  assert.equal(priceRunDay(new Date("2026-10-09T08:00:00Z")), "2026-10-09");
  assert.equal(priceRunDay(new Date("2026-10-09T23:59:00Z")), "2026-10-09");
  assert.equal(priceRunDay(new Date("2026-10-10T03:00:00Z")), "2026-10-09");
});
