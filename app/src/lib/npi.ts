// NPI checks for clinician sign-up: the check digit (pure), parsing the
// public NPPES registry response (pure, fixture-tested in npi.test.ts) and a
// cached lookup against https://npiregistry.cms.hhs.gov/api/ (v2.1).
//
// What verification proves: the number belongs to an active individual
// provider (NPI-1) whose last name matches what was typed. It does NOT prove
// board certification, current licensure in a given state, or that the
// person typing is that provider beyond the email they signed in with --
// the UI says so.
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { npiLookups } from "@/db/schema";

/** 10 digits whose last is the Luhn check digit over "80840" + the first 9 (CMS NPI standard). */
export function isValidNpi(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) return false;
  const digits = `80840${npi}`;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function normalizeNpi(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{10}$/.test(digits) ? digits : null;
}

export type NpiRecord = {
  npi: string;
  enumerationType: string; // "NPI-1" individual | "NPI-2" organization
  active: boolean;
  firstName: string | null;
  lastName: string | null;
  credential: string | null;
  taxonomyCode: string | null; // primary taxonomy
  taxonomyDesc: string | null;
  state: string | null; // primary taxonomy's license state, else practice location
  isDermatology: boolean;
};

// Dermatology taxonomy codes all start 207N (207N00000X Dermatology,
// 207ND0101X MOHS-micrographic surgery, 207ND0900X dermatopathology,
// 207NI0002X clinical & laboratory dermatological immunology, 207NP0225X
// pediatric dermatology, 207NS0135X procedural dermatology).
export function isDermatologyTaxonomy(code: string | null | undefined): boolean {
  return /^207N/i.test(code ?? "");
}

type NppesTaxonomy = { code?: string; desc?: string; primary?: boolean; state?: string };
type NppesResult = {
  number?: string | number;
  enumeration_type?: string;
  basic?: { first_name?: string; last_name?: string; credential?: string; status?: string };
  taxonomies?: NppesTaxonomy[];
  addresses?: { address_purpose?: string; state?: string }[];
};

const titleCase = (s: string | undefined | null) =>
  s ? s.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase()) : null;

/** One NPPES API response body -> the record for `npi`, or null if it isn't there. */
export function parseNppesResponse(body: unknown, npi: string): NpiRecord | null {
  const results = (body as { results?: NppesResult[] } | null)?.results;
  if (!Array.isArray(results)) return null;
  const r = results.find((x) => String(x.number) === npi);
  if (!r) return null;
  const taxonomies = r.taxonomies ?? [];
  const primary = taxonomies.find((t) => t.primary) ?? taxonomies[0];
  const location = r.addresses?.find((a) => a.address_purpose === "LOCATION");
  return {
    npi,
    enumerationType: r.enumeration_type ?? "",
    active: r.basic?.status === "A",
    firstName: titleCase(r.basic?.first_name),
    lastName: titleCase(r.basic?.last_name),
    credential: r.basic?.credential?.trim() || null,
    taxonomyCode: primary?.code ?? null,
    taxonomyDesc: primary?.desc ?? null,
    state: primary?.state ?? location?.state ?? null,
    isDermatology: taxonomies.some((t) => isDermatologyTaxonomy(t.code)),
  };
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

/** Typed last name vs the registry's: case, accents, spaces, hyphens and apostrophes ignored. */
export function lastNameMatches(typed: string, record: Pick<NpiRecord, "lastName">): boolean {
  const a = fold(typed);
  return a.length > 1 && !!record.lastName && a === fold(record.lastName);
}

export type VerifyOutcome =
  | { ok: true; record: NpiRecord }
  | { ok: false; reason: "checksum" | "not-found" | "organization" | "inactive" | "name-mismatch" | "unavailable" };

/** The rules, given a lookup result (pure; the route supplies the record). */
export function judgeNpi(npi: string, typedLastName: string, record: NpiRecord | null | "unavailable"): VerifyOutcome {
  if (!isValidNpi(npi)) return { ok: false, reason: "checksum" };
  if (record === "unavailable") return { ok: false, reason: "unavailable" };
  if (!record) return { ok: false, reason: "not-found" };
  if (record.enumerationType !== "NPI-1") return { ok: false, reason: "organization" };
  if (!record.active) return { ok: false, reason: "inactive" };
  if (!lastNameMatches(typedLastName, record)) return { ok: false, reason: "name-mismatch" };
  return { ok: true, record };
}

const NPPES_URL = "https://npiregistry.cms.hhs.gov/api/";
const CACHE_TTL_MS = 30 * 24 * 60 * 60_000;
const NOT_FOUND_TTL_MS = 24 * 60 * 60_000;

/**
 * Registry lookup with a DB cache. Returns "unavailable" (never throws) when
 * NPPES is down or slow, so sign-up can save a pending profile and retry.
 * A stale cached record is used if the live call fails.
 */
export async function lookupNpi(npi: string, now = new Date()): Promise<NpiRecord | null | "unavailable"> {
  const cached = db.select().from(npiLookups).where(eq(npiLookups.npi, npi)).get();
  const age = cached ? now.getTime() - Date.parse(cached.fetchedAt) : Infinity;
  const fromCache = () => (cached?.status === "found" && cached.payload ? parseNppesResponse(JSON.parse(cached.payload), npi) : null);
  if (cached && age < (cached.status === "found" ? CACHE_TTL_MS : NOT_FOUND_TTL_MS)) return fromCache();

  let body: unknown;
  try {
    const res = await fetch(`${NPPES_URL}?version=2.1&number=${npi}`, {
      headers: { Accept: "application/json", "User-Agent": "activelyskin-npi-check/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`NPPES ${res.status}`);
    body = await res.json();
  } catch (err) {
    console.warn(`[npi] lookup failed for ${npi}: ${(err as Error).message}`);
    return cached?.status === "found" ? fromCache() : "unavailable";
  }
  if ((body as { Errors?: unknown }).Errors) return "unavailable";
  const record = parseNppesResponse(body, npi);
  const row = { npi, status: record ? "found" : "not_found", payload: record ? JSON.stringify(body) : null, fetchedAt: now.toISOString() };
  db.insert(npiLookups).values(row).onConflictDoUpdate({ target: npiLookups.npi, set: row }).run();
  return record;
}

export const NPI_REASON_TEXT: Record<Exclude<VerifyOutcome, { ok: true }>["reason"], string> = {
  checksum: "That isn't a valid NPI (the check digit doesn't match). Please check the 10 digits.",
  "not-found": "No NPI record with that number was found in the NPPES registry.",
  organization: "That NPI belongs to an organization. Please enter your individual (Type 1) NPI.",
  inactive: "The NPPES registry lists that NPI as deactivated.",
  "name-mismatch": "The last name doesn't match the NPPES record for that NPI.",
  unavailable:
    "The NPPES registry isn't responding right now. Your details are saved; verification will be retried when you come back, and prescription products unlock once it succeeds.",
};
