// Clinician handouts: versions (immutable), printouts ("instances") with
// one-time claim tokens, and the claim that turns a printout into one
// patient's private regimen. See the schema comments for the privacy model:
// nothing stored here identifies a patient.
import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { CLAIM_TOKEN_RE, generateClaimToken, generateRef } from "@/lib/handout-codes";
import { db } from "@/db/client";
import { handoutInstances, handouts, handoutVersions, labelSections, products } from "@/db/schema";
import { iso } from "@/lib/identity";
import { hashToken } from "@/lib/tokens";
import { decodeImportCode, MAX_CODE_LENGTH } from "@/lib/avoid-import";
import { clinicianDisplayName, type Clinician } from "@/lib/clinicians";
import { getRxLabel, rxDisplayName } from "@/lib/rx-catalog";
import {
  HANDOUT_SLOTS,
  MAX_DIRECTIONS,
  MAX_HEADING,
  MAX_LABEL,
  MAX_NOTES,
  MAX_RULE,
  MAX_SECTION_BODY,
  MAX_SECTIONS,
  MAX_STEPS,
  MAX_STOP_RULES,
  MAX_TITLE,
  type HandoutContent,
  type HandoutSection,
  type HandoutSlot,
  type HandoutStep,
} from "@/lib/handout-types";

export type HandoutVersion = typeof handoutVersions.$inferSelect;
export type HandoutInstance = typeof handoutInstances.$inferSelect;
type Product = typeof products.$inferSelect;

const DAY_MS = 24 * 60 * 60_000;
// An unclaimed printout stops working after this; a claimed one never expires
// (it's the patient's plan now).
export const INSTANCE_TTL_MS = 90 * DAY_MS;

export { CLAIM_TOKEN_RE, generateClaimToken, generateRef, REF_RE } from "@/lib/handout-codes";

// --- content validation ---------------------------------------------------

const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max) : "";

/** Display name snapshotted into a version: "Tretinoin 0.025% cream (Retin-A)" / the OTC product name. */
export function productSnapshotName(p: Product): string {
  if (!p.isRx) return p.brandName;
  const name = rxDisplayName(p);
  const brand = p.brandName.trim();
  return brand && !name.toLowerCase().startsWith(brand.toLowerCase()) && brand.toLowerCase() !== (p.genericName ?? "").toLowerCase()
    ? `${name} (${brand})`
    : name;
}

/** The label's own directions, shortened to a sig-sized starting point the clinician then edits. */
export function defaultDirectionsFor(p: Product): string {
  const raw = p.isRx
    ? getRxLabel(p.splSetId)?.dosageAndAdministration
    : p.splSetId
      ? db.select({ d: labelSections.directions }).from(labelSections).where(eq(labelSections.splSetId, p.splSetId)).get()?.d
      : null;
  return shortenDirections(raw ?? "");
}

export function shortenDirections(text: string, max = 280): string {
  const t = text.replace(/\s+/g, " ").replace(/^\d+(\.\d+)?\s+/, "").trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(". ", max);
  return cut > 60 ? t.slice(0, cut + 1) : `${t.slice(0, max - 1).trimEnd()}…`;
}

export type ContentResult = { ok: true; content: HandoutContent; title: string } | { ok: false; error: string };

/**
 * Server-side validation of a builder submission. Product names are
 * re-read from the catalog (never trusted from the client); prescription
 * steps need a verified clinician; informational-only rows (isotretinoin)
 * are refused outright. Any field not listed here is dropped -- there is no
 * way to store a patient detail through this path except inside free text,
 * which the builder warns about.
 */
export function validateHandoutInput(raw: unknown, opts: { allowRx: boolean }): ContentResult {
  const body = (raw ?? {}) as Record<string, unknown>;
  const title = clean(body.title, MAX_TITLE) || "Your skincare plan";
  const stepsIn = Array.isArray(body.steps) ? body.steps.slice(0, MAX_STEPS + 1) : [];
  const sectionsIn = Array.isArray(body.sections) ? body.sections.slice(0, MAX_SECTIONS + 1) : [];
  if (sectionsIn.length > MAX_SECTIONS) return { ok: false, error: `A handout can have up to ${MAX_SECTIONS} sections.` };
  const sections: HandoutSection[] = [];
  for (const raw of sectionsIn) {
    const sec = (raw ?? {}) as Record<string, unknown>;
    const heading = clean(sec.heading, MAX_HEADING);
    const text = clean(typeof sec.body === "string" ? sec.body.replace(/\r\n?/g, "\n") : "", MAX_SECTION_BODY);
    if (heading || text) sections.push({ heading, body: text });
  }
  if (stepsIn.length === 0 && sections.length === 0) return { ok: false, error: "Add a section or a step." };
  if (stepsIn.length > MAX_STEPS) return { ok: false, error: `A handout can have up to ${MAX_STEPS} steps.` };
  const ids = stepsIn.map((s) => (s as Record<string, unknown>)?.productId).filter((v): v is string => typeof v === "string" && v.length > 0);
  const byId = new Map(
    (ids.length ? db.select().from(products).where(inArray(products.id, ids)).all() : []).map((p) => [p.id, p]),
  );

  const steps: HandoutStep[] = [];
  for (const [i, s] of stepsIn.entries()) {
    const step = (s ?? {}) as Record<string, unknown>;
    const slot = HANDOUT_SLOTS.includes(step.slot as HandoutSlot) ? (step.slot as HandoutSlot) : "as-directed";
    const productId = typeof step.productId === "string" && step.productId ? step.productId : null;
    const label = clean(step.label, MAX_LABEL);
    const directions = clean(step.directions, MAX_DIRECTIONS);
    let kind: HandoutStep["kind"] = "generic";
    let productName: string | null = null;
    if (productId) {
      const p = byId.get(productId);
      if (!p) return { ok: false, error: `Step ${i + 1}: that product isn't in the catalog any more.` };
      if (p.informationalOnly) return { ok: false, error: `Step ${i + 1}: isotretinoin can't be part of a handout (iPLEDGE).` };
      if (p.isRx && !opts.allowRx) return { ok: false, error: `Step ${i + 1}: prescription products need a verified NPI.` };
      kind = p.isRx ? "rx" : "otc";
      productName = productSnapshotName(p);
    }
    if (!label && !productName) return { ok: false, error: `Step ${i + 1} needs a name or a product.` };
    steps.push({ key: `s${i + 1}`, slot, label: label || (kind === "rx" ? "Prescription" : "Step"), productId, kind, productName, directions });
  }
  const stopRules = (Array.isArray(body.stopRules) ? body.stopRules : [])
    .map((r) => clean(r, MAX_RULE))
    .filter(Boolean)
    .slice(0, MAX_STOP_RULES);
  const notes = clean(body.notes, MAX_NOTES);
  let avoidCode: string | null = null;
  if (typeof body.avoidCode === "string" && body.avoidCode.trim()) {
    const code = body.avoidCode.trim().slice(0, MAX_CODE_LENGTH);
    if (decodeImportCode(code).ok) avoidCode = code;
    else return { ok: false, error: "That patch-test code doesn't decode. Copy it from the patch-test sheet link (the a= part)." };
  }
  return { ok: true, title, content: { sections, steps, stopRules, notes, avoidCode } };
}

// --- handouts and versions -----------------------------------------------------

function newHandoutId(): string {
  return randomBytes(9).toString("base64url");
}

function insertVersion(handoutId: string, version: number, clinician: Clinician, title: string, templateId: string | null, content: HandoutContent, now: Date): HandoutVersion {
  for (let attempt = 0; ; attempt++) {
    try {
      return db
        .insert(handoutVersions)
        .values({
          handoutId,
          version,
          ref: generateRef(),
          title,
          templateId,
          content,
          clinicName: clinician.clinicName,
          clinicianName: clinicianDisplayName(clinician),
          clinicianCredential: clinician.credential,
          clinicPhone: clinician.clinicPhone,
          clinicWebsite: clinician.clinicWebsite,
          createdAt: iso(now),
        })
        .returning()
        .get();
    } catch (err) {
      // A ref collision (1 in ~850 billion per pair) just retries.
      if (attempt < 3 && /UNIQUE constraint failed: handout_versions\.ref/.test(String(err))) continue;
      throw err;
    }
  }
}

export function createHandout(clinician: Clinician, input: { title: string; templateId: string | null; content: HandoutContent }, now: Date) {
  return db.transaction(() => {
    const id = newHandoutId();
    db.insert(handouts).values({ id, clinicianId: clinician.id, title: input.title, latestVersion: 1, createdAt: iso(now), updatedAt: iso(now) }).run();
    const version = insertVersion(id, 1, clinician, input.title, input.templateId, input.content, now);
    return { handoutId: id, version };
  });
}

/** An edit: a NEW version. Earlier versions (and their printed QRs) are untouched. */
export function addVersion(clinician: Clinician, handoutId: string, input: { title: string; templateId: string | null; content: HandoutContent }, now: Date) {
  return db.transaction(() => {
    const h = db.select().from(handouts).where(and(eq(handouts.id, handoutId), eq(handouts.clinicianId, clinician.id))).get();
    if (!h) return null;
    const next = h.latestVersion + 1;
    const version = insertVersion(handoutId, next, clinician, input.title, input.templateId, input.content, now);
    db.update(handouts).set({ latestVersion: next, title: input.title, updatedAt: iso(now) }).where(eq(handouts.id, handoutId)).run();
    return { handoutId, version };
  });
}

export function getOwnedHandout(handoutId: string, clinicianId: string) {
  return db.select().from(handouts).where(and(eq(handouts.id, handoutId), eq(handouts.clinicianId, clinicianId))).get() ?? null;
}

export function getVersion(handoutId: string, version: number): HandoutVersion | null {
  return (
    db
      .select()
      .from(handoutVersions)
      .where(and(eq(handoutVersions.handoutId, handoutId), eq(handoutVersions.version, version)))
      .get() ?? null
  );
}

export function getVersionById(id: number): HandoutVersion | null {
  return db.select().from(handoutVersions).where(eq(handoutVersions.id, id)).get() ?? null;
}

export type VersionCounts = { printed: number; opened: number; saved: number };

/** Aggregate counts per version -- never which patient, never per-visit rows. */
export function countsForVersions(versionIds: number[]): Map<number, VersionCounts> {
  if (versionIds.length === 0) return new Map();
  const rows = db
    .select({
      versionId: handoutInstances.versionId,
      printed: sql<number>`count(*)`,
      opened: sql<number>`sum(${handoutInstances.openCount} > 0)`,
      saved: sql<number>`sum(${handoutInstances.claimedAt} IS NOT NULL)`,
    })
    .from(handoutInstances)
    .where(inArray(handoutInstances.versionId, versionIds))
    .groupBy(handoutInstances.versionId)
    .all();
  return new Map(rows.map((r) => [r.versionId, { printed: r.printed, opened: r.opened ?? 0, saved: r.saved ?? 0 }]));
}

export function listHandoutsForClinician(clinicianId: string) {
  const hs = db.select().from(handouts).where(eq(handouts.clinicianId, clinicianId)).orderBy(desc(handouts.updatedAt)).all();
  if (hs.length === 0) return [];
  const versions = db
    .select()
    .from(handoutVersions)
    .where(inArray(handoutVersions.handoutId, hs.map((h) => h.id)))
    .orderBy(desc(handoutVersions.version))
    .all();
  const counts = countsForVersions(versions.map((v) => v.id));
  return hs.map((h) => ({
    handout: h,
    versions: versions.filter((v) => v.handoutId === h.id).map((v) => ({ version: v, counts: counts.get(v.id) ?? { printed: 0, opened: 0, saved: 0 } })),
  }));
}

/** Looks a version up by its chart reference, for the clinician who wrote it. */
export function findVersionByRef(clinicianId: string, ref: string): HandoutVersion | null {
  const v = db.select().from(handoutVersions).where(eq(handoutVersions.ref, ref.trim().toUpperCase())).get();
  if (!v) return null;
  return getOwnedHandout(v.handoutId, clinicianId) ? v : null;
}

// --- instances (one per printout) -------------------------------------------

/** A new printout of a version: returns the claim token, shown once (QR + short URL). */
export function createInstance(versionId: number, now: Date): { token: string; instance: HandoutInstance } {
  const token = generateClaimToken();
  const instance = db
    .insert(handoutInstances)
    .values({ versionId, tokenHash: hashToken(token), createdAt: iso(now), expiresAt: iso(new Date(now.getTime() + INSTANCE_TTL_MS)) })
    .returning()
    .get();
  return { token, instance };
}

export function findInstance(token: string): { instance: HandoutInstance; version: HandoutVersion } | null {
  if (!CLAIM_TOKEN_RE.test(token)) return null;
  const row = db
    .select({ instance: handoutInstances, version: handoutVersions })
    .from(handoutInstances)
    .innerJoin(handoutVersions, eq(handoutVersions.id, handoutInstances.versionId))
    .where(eq(handoutInstances.tokenHash, hashToken(token)))
    .get();
  return row ?? null;
}

export function isExpiredUnclaimed(instance: HandoutInstance, now: Date): boolean {
  return !instance.claimedAt && Date.parse(instance.expiresAt) <= now.getTime();
}

export function recordOpen(instanceId: number) {
  db.update(handoutInstances).set({ openCount: sql`${handoutInstances.openCount} + 1` }).where(eq(handoutInstances.id, instanceId)).run();
}

export type ClaimResult =
  | { status: "claimed"; instance: HandoutInstance; version: HandoutVersion }
  | { status: "owner"; instance: HandoutInstance; version: HandoutVersion }
  | { status: "taken" | "expired" | "invalid" };

/**
 * First confirmed scan wins. The UPDATE only matches an unclaimed, unexpired
 * row, so two devices racing can't both claim it. `sessionId` is the
 * resolved session (the person's home session when signed in).
 */
export function claimInstance(token: string, sessionId: string, now: Date): ClaimResult {
  const found = findInstance(token);
  if (!found) return { status: "invalid" };
  const { instance, version } = found;
  if (instance.claimedAt) return instance.claimedSessionId === sessionId ? { status: "owner", instance, version } : { status: "taken" };
  if (isExpiredUnclaimed(instance, now)) return { status: "expired" };
  const updated = db
    .update(handoutInstances)
    .set({ claimedAt: iso(now), claimedSessionId: sessionId })
    .where(and(eq(handoutInstances.id, instance.id), isNull(handoutInstances.claimedAt), sql`${handoutInstances.expiresAt} > ${iso(now)}`))
    .returning()
    .get();
  if (!updated) {
    const again = findInstance(token)!;
    return again.instance.claimedSessionId === sessionId ? { status: "owner", ...again } : { status: "taken" };
  }
  return { status: "claimed", instance: updated, version };
}

/** Is this resolved session the instance's owner? (Linked devices share the home session.) */
export function ownsInstance(instance: HandoutInstance, sessionId: string | null): boolean {
  return !!sessionId && !!instance.claimedAt && instance.claimedSessionId === sessionId;
}
