// Share links for patch-test results: /avoid/import?a=<code>&c=<clinic>&d=<date>&n=<note>.
// Nothing is stored server-side; the link is the whole record, printed as a
// QR code on the clinician's sheet. The patient's name is never part of it.
//
// `a` is a version digit plus a base64url bitset over IMPORT_CODES: bit i
// set means IMPORT_CODES[i] was marked. ~25 characters for any selection,
// so the QR stays small enough to scan off paper.

import { allergenMembers, getAllergenGroup, resolveAllergenId } from "@/db/contact-allergens";
import { getNotOnLabel } from "@/db/patch-test-series";

// APPEND-ONLY. Printed sheets live in drawers for years, so an index must
// never change meaning: add new ids at the end, never reorder or delete
// (a retired id stays in place and simply stops resolving).
export const IMPORT_CODES: readonly string[] = [
  "fragrance", "amyl-cinnamal", "cinnamal", "cinnamyl-alcohol", "eugenol", "isoeugenol", "geraniol", "hydroxycitronellal", "oakmoss",
  "citral", "citronellol", "coumarin", "farnesol", "hexyl-cinnamal", "hicc", "balsam-of-peru", "limonene", "linalool", "benzyl-alcohol",
  "benzyl-benzoate", "benzyl-salicylate", "benzaldehyde", "bisabolol", "carvone", "ylang-ylang", "narcissus", "sandalwood", "lemongrass",
  "formaldehyde", "quaternium-15", "diazolidinyl-urea", "imidazolidinyl-urea", "dmdm-hydantoin", "bronopol", "bronidox",
  "sodium-hydroxymethylglycinate", "benzylhemiformal", "hydroxyethyl-triazine", "melamine-formaldehyde", "tosylamide-formaldehyde-resin",
  "mci-mi", "methylisothiazolinone", "mdbgn", "iodopropynyl-butylcarbamate", "parabens", "phenoxyethanol", "sodium-benzoate", "thimerosal",
  "chloroxylenol", "chlorocresol", "chlorhexidine", "cocamidopropyl-betaine", "decyl-glucoside", "lauryl-glucoside", "coco-glucoside",
  "other-alkyl-glucosides", "sorbitan-sesquioleate", "oleamidopropyl-dimethylamine", "laureth-sulfates", "cetearyl-alcohol", "lanolin",
  "propylene-glycol", "octocrylene", "oxybenzone", "benzophenone-4", "octinoxate", "salicylate-filters", "avobenzone", "paba",
  "bemotrizinol", "bisoctrizole", "ecamsule", "drometrizole-trisiloxane", "oleoyl-tyrosine", "mineral-uv-filters", "compositae",
  "propolis", "tea-tree-oil", "lichen", "henna", "lavender-oil", "jasmine", "peppermint-oil", "bergamot", "colophonium", "tocopherol",
  "sulfites", "ppd", "ptd", "aminophenols", "persulfates", "thioglycolates", "neomycin", "bacitracin", "polymyxin-b", "mupirocin",
  "clioquinol", "corticosteroid-class-a", "corticosteroid-class-b", "corticosteroid-class-c", "corticosteroid-class-d", "benzocaine",
  "lidocaine", "pramoxine", "dyclonine", "dibucaine", "tetracaine", "ethylenediamine", "diphenhydramine", "nickel", "cobalt", "chromium",
  "gold", "acrylates", "formaldehyde-and-releasers", "formaldehyde-releasers", "isothiazolinones", "fragrance-mix-1", "fragrance-mix-2",
  "named-fragrance-allergens", "glucosides", "ppd-type-dyes", "chemical-uv-filters", "corticosteroids", "carba-mix", "thiuram-mix",
  "mercapto-mix", "mbt", "black-rubber-mix", "dialkyl-thioureas", "epoxy-resin", "ptbp-formaldehyde-resin", "disperse-blue-106",
  "disperse-dye-mix",
];

const CODE_INDEX = new Map(IMPORT_CODES.map((id, i) => [id, i]));
const VERSION = "1";
// Far beyond any real code (IMPORT_CODES would need ~1,400 entries to get
// here); anything longer has been tampered with or mangled.
export const MAX_CODE_LENGTH = 240;
export const MAX_CLINIC_LENGTH = 60;
export const MAX_NOTE_LENGTH = 140;

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function toBase64Url(bytes: number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = Math.ceil(((Math.min(3, bytes.length - i)) * 8) / 6);
    for (let k = 0; k < chars; k++) out += B64[(n >> (18 - 6 * k)) & 63];
  }
  return out;
}

function fromBase64Url(s: string): number[] | null {
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 255);
    }
  }
  return bytes;
}

/** Encodes ids (allergens, families, not-on-label items) as a compact code; ids without a code are dropped. */
export function encodeImportCode(ids: Iterable<string>): string {
  const bytes: number[] = [];
  for (const id of ids) {
    const i = CODE_INDEX.get(id);
    if (i === undefined) continue;
    while (bytes.length <= i >> 3) bytes.push(0);
    bytes[i >> 3] |= 1 << (i & 7);
  }
  return VERSION + toBase64Url(bytes);
}

export type DecodedCode =
  | { ok: true; avoidIds: string[]; notOnLabel: string[]; unknown: number }
  | { ok: false; reason: "missing" | "too-long" | "invalid" };

/**
 * Reads a code back. `avoidIds` are ids that can go on an avoid list (legacy
 * ids mapped forward), `notOnLabel` are information-only, `unknown` counts
 * set bits this version can't place (a newer link, or a retired id).
 */
export function decodeImportCode(code: string | undefined | null): DecodedCode {
  if (!code) return { ok: false, reason: "missing" };
  if (code.length > MAX_CODE_LENGTH) return { ok: false, reason: "too-long" };
  if (code[0] !== VERSION) return { ok: false, reason: "invalid" };
  const bytes = fromBase64Url(code.slice(1));
  if (!bytes) return { ok: false, reason: "invalid" };
  const avoidIds: string[] = [];
  const notOnLabel: string[] = [];
  let unknown = 0;
  bytes.forEach((byte, b) => {
    for (let bit = 0; bit < 8; bit++) {
      if (!(byte & (1 << bit))) continue;
      const id = IMPORT_CODES[b * 8 + bit];
      const avoid = id ? resolveAllergenId(id) : undefined;
      if (avoid) avoidIds.push(avoid);
      else if (id && getNotOnLabel(id)) notOnLabel.push(id);
      else unknown++;
    }
  });
  return { ok: true, avoidIds: [...new Set(avoidIds)], notOnLabel, unknown };
}

export type ImportDetails = { clinic?: string; date?: string; note?: string };

function clean(s: string | undefined | null, max: number): string | undefined {
  // Control characters out, whitespace collapsed; it's shown as plain text.
  const t = (s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : undefined;
}

/** A valid YYYY-MM-DD calendar date, or undefined. */
export function cleanDate(s: string | undefined | null): string | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : undefined;
}

export function cleanDetails(d: { clinic?: string | null; date?: string | null; note?: string | null }): ImportDetails {
  return { clinic: clean(d.clinic, MAX_CLINIC_LENGTH), date: cleanDate(d.date), note: clean(d.note, MAX_NOTE_LENGTH) };
}

/** The import path (origin-relative) for these ids and optional details. */
export function buildImportPath(ids: Iterable<string>, details: ImportDetails = {}): string {
  const { clinic, date, note } = cleanDetails(details);
  const params = new URLSearchParams({ a: encodeImportCode(ids) });
  if (clinic) params.set("c", clinic);
  if (date) params.set("d", date);
  if (note) params.set("n", note);
  return `/avoid/import?${params.toString()}`;
}

export type MergeResult = {
  merged: string[];
  added: string[];
  already: string[];
  // Imported ids not on the list by name but covered by a family on it.
  coveredBy: Record<string, string>;
};

/** Adds imported ids to an existing avoid list, keeping its order. */
export function mergeAvoidIds(existing: string[], incoming: string[]): MergeResult {
  const have = new Set(existing);
  const added: string[] = [];
  const already: string[] = [];
  const coveredBy: Record<string, string> = {};
  for (const id of new Set(incoming)) {
    if (have.has(id)) {
      already.push(id);
      continue;
    }
    added.push(id);
    const members = allergenMembers(id);
    const family = existing.find((e) => getAllergenGroup(e) && members.length > 0 && members.every((m) => allergenMembers(e).includes(m)));
    if (family) coveredBy[id] = family;
  }
  return { merged: [...existing, ...added], added, already, coveredBy };
}
