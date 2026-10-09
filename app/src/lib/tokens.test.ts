// Token hashing, signing and expiry: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSignInCode, generateToken, hashSignInCode, hashToken, isExpired, maskEmail, normalizeEmail, signToken, verifyToken } from "./tokens";

const SECRET = "test-secret-test-secret-test-secret!";
const now = new Date("2026-10-01T12:00:00Z");
const later = (ms: number) => new Date(now.getTime() + ms);

test("generated tokens are long, url-safe and unique", () => {
  const a = generateToken();
  const b = generateToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
});

test("hashToken is a stable SHA-256 hex digest that doesn't contain the token", () => {
  const t = generateToken();
  assert.equal(hashToken(t), hashToken(t));
  assert.match(hashToken(t), /^[0-9a-f]{64}$/);
  assert.notEqual(hashToken(t), hashToken(t + "x"));
  assert.ok(!hashToken(t).includes(t));
});

test("isExpired is inclusive of the expiry instant", () => {
  assert.equal(isExpired(later(1).toISOString(), now), false);
  assert.equal(isExpired(now.toISOString(), now), true);
  assert.equal(isExpired(later(-1).toISOString(), now), true);
});

test("signed tokens verify, and carry their subject", () => {
  const tok = signToken(SECRET, "checkin", "42", later(60_000));
  const v = verifyToken(SECRET, "checkin", tok, now);
  assert.equal(v?.subject, "42");
});

test("signed tokens fail when expired, tampered, of another kind, or signed with another secret", () => {
  const tok = signToken(SECRET, "checkin", "42", later(60_000));
  assert.equal(verifyToken(SECRET, "checkin", tok, later(60_000)), null);
  assert.equal(verifyToken(SECRET, "checkin", tok, later(120_000)), null);
  assert.equal(verifyToken(SECRET, "unsub", tok, now), null);
  assert.equal(verifyToken("another-secret-another-secret-12345", "checkin", tok, now), null);
  const [payload, sig] = tok.split(".");
  const forged = Buffer.from(Buffer.from(payload, "base64url").toString().replace("42", "43")).toString("base64url");
  assert.equal(verifyToken(SECRET, "checkin", `${forged}.${sig}`, now), null);
  assert.equal(verifyToken(SECRET, "checkin", "garbage", now), null);
  assert.equal(verifyToken(SECRET, "checkin", "", now), null);
});

test("normalizeEmail lowercases, trims and rejects junk", () => {
  assert.equal(normalizeEmail("  Someone@Example.COM "), "someone@example.com");
  for (const bad of ["", "no-at", "a@b", "a b@c.com", "<a@b.com>", "a@b.c", 42, null]) assert.equal(normalizeEmail(bad), null, String(bad));
  assert.equal(normalizeEmail(`${"a".repeat(250)}@b.com`), null);
});

test("maskEmail hides all but the first letter of the local part", () => {
  assert.equal(maskEmail("michael@example.com"), "m•••@example.com");
});

test("sign-in codes are six digits and their hash is keyed and bound to the address", () => {
  for (let i = 0; i < 50; i++) assert.match(generateSignInCode(), /^\d{6}$/);
  const h = hashSignInCode("secret-a", "a@example.com", "012345");
  assert.equal(h, hashSignInCode("secret-a", "a@example.com", "012345"));
  assert.notEqual(h, hashSignInCode("secret-b", "a@example.com", "012345"));
  assert.notEqual(h, hashSignInCode("secret-a", "b@example.com", "012345"));
  assert.ok(!h.includes("012345"));
});
