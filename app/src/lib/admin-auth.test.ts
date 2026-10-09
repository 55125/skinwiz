// Admin sign-in: password source, constant-time check, signed cookie, and
// the failed-login throttle. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_SESSION_MS,
  DEV_ADMIN_PASSWORD,
  LoginThrottle,
  THROTTLE,
  adminPassword,
  isValidAdminToken,
  issueAdminToken,
  passwordMatches,
  passwordWarning,
} from "./admin-auth";

const SECRET = "x".repeat(40);
const NOW = new Date("2026-10-08T12:00:00Z");

test("password comes from ADMIN_PASSWORD; production without one disables admin", () => {
  assert.equal(adminPassword({ ADMIN_PASSWORD: "correct-horse", NODE_ENV: "production" }), "correct-horse");
  assert.equal(adminPassword({ NODE_ENV: "production" }), null);
  assert.equal(adminPassword({ ADMIN_PASSWORD: "short", NODE_ENV: "production" }), null);
  assert.equal(adminPassword({ NODE_ENV: "development" }), DEV_ADMIN_PASSWORD);
});

test("password comparison", () => {
  assert.equal(passwordMatches("open-sesame", "open-sesame"), true);
  assert.equal(passwordMatches("open-sesam", "open-sesame"), false);
  assert.equal(passwordMatches("", "open-sesame"), false);
});

test("session token: valid until expiry, bound to the password and secret", () => {
  const token = issueAdminToken("pw-one-123", SECRET, NOW);
  assert.equal(isValidAdminToken(token, "pw-one-123", SECRET, NOW), true);
  assert.equal(isValidAdminToken(token, "pw-one-123", SECRET, new Date(NOW.getTime() + ADMIN_SESSION_MS - 1000)), true);
  assert.equal(isValidAdminToken(token, "pw-one-123", SECRET, new Date(NOW.getTime() + ADMIN_SESSION_MS + 1000)), false);
  // Changing the password or the app secret signs everyone out.
  assert.equal(isValidAdminToken(token, "pw-two-456", SECRET, NOW), false);
  assert.equal(isValidAdminToken(token, "pw-one-123", "y".repeat(40), NOW), false);
  assert.equal(isValidAdminToken(undefined, "pw-one-123", SECRET, NOW), false);
  assert.equal(isValidAdminToken(token + "x", "pw-one-123", SECRET, NOW), false);
});

test("weak passwords get a warning", () => {
  assert.ok(passwordWarning("abcdefgh"));
  assert.ok(passwordWarning(DEV_ADMIN_PASSWORD));
  assert.equal(passwordWarning("Tall-Lantern-Orbit-42"), null);
});

test("throttle locks an IP after repeated failures, then releases it", () => {
  const t = new LoginThrottle();
  const start = NOW.getTime();
  for (let i = 0; i < THROTTLE.perIp - 1; i++) t.fail("1.1.1.1", start);
  assert.equal(t.retryAfter("1.1.1.1", start), 0);
  t.fail("1.1.1.1", start);
  assert.ok(t.retryAfter("1.1.1.1", start) > 0);
  assert.equal(t.retryAfter("2.2.2.2", start), 0, "other IPs are unaffected below the global limit");
  assert.equal(t.retryAfter("1.1.1.1", start + THROTTLE.lockMs + 1), 0);
});

test("throttle locks everyone after many failures from many IPs", () => {
  const t = new LoginThrottle();
  const start = NOW.getTime();
  for (let i = 0; i < THROTTLE.global; i++) t.fail(`10.0.0.${i}`, start);
  assert.ok(t.retryAfter("9.9.9.9", start) > 0);
});

test("a success clears that IP's failures", () => {
  const t = new LoginThrottle();
  const start = NOW.getTime();
  for (let i = 0; i < THROTTLE.perIp - 1; i++) t.fail("1.1.1.1", start);
  t.succeed("1.1.1.1");
  t.fail("1.1.1.1", start);
  assert.equal(t.retryAfter("1.1.1.1", start), 0);
});
