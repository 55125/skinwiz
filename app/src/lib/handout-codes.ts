// Codes for clinician handouts. Pure (node:crypto only), so tests and the
// chart note can use them without a database.
import { randomBytes, randomInt } from "node:crypto";

// Human-readable version reference for the chart note and dashboard: no
// 0/O, 1/I/L. Public (it's printed), not a credential.
const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateRef(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
export const REF_RE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

// The claim token: 20 chars from a 32-letter lower-case alphabet = 100 bits,
// short enough to type from paper. Only its SHA-256 is stored.
const TOKEN_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
export function generateClaimToken(): string {
  const bytes = randomBytes(20);
  let s = "";
  for (const b of bytes) s += TOKEN_ALPHABET[b & 31];
  return s;
}
export const CLAIM_TOKEN_RE = /^[a-km-np-z2-9]{20}$/;
