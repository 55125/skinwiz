// A visitor's list of regimens (schema.ts `regimens`): their own, plus
// clinician-issued plans claimed from a handout QR. Session-keyed like the
// shelf, so a plan follows a signed-in person across their devices and is
// never readable by anyone else. Every function takes the resolved session
// id and refuses a regimen that isn't that session's.
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { handoutInstances, handoutVersions, products, regimenItems, regimens, regimenStepStates } from "@/db/schema";
import { iso } from "@/lib/identity";
import { badgeCredential } from "@/lib/clinicians";
import { setRegimenItem, type Slot } from "@/lib/regimen";
import type { HandoutStep } from "@/lib/handout-types";
import type { HandoutVersion } from "@/lib/handouts";

export type RegimenRow = typeof regimens.$inferSelect;
export type StepState = typeof regimenStepStates.$inferSelect;

export const DEFAULT_REGIMEN_NAME = "My regimen";
const MAX_REGIMENS = 20;

export type RegimenSummary = {
  id: number;
  name: string;
  kind: "own" | "clinician";
  active: boolean;
  // Only on clinician-issued plans: the MD badge. Derived from the immutable
  // version, never stored on the regimen, so a personal copy can't carry it.
  badge: { credential: string; clinicianName: string; clinicName: string } | null;
};

export function getOwnedRegimen(sessionId: string, regimenId: number): RegimenRow | null {
  return db.select().from(regimens).where(and(eq(regimens.id, regimenId), eq(regimens.sessionId, sessionId))).get() ?? null;
}

export function listRegimens(sessionId: string): RegimenSummary[] {
  const rows = db
    .select({ r: regimens, v: handoutVersions })
    .from(regimens)
    .leftJoin(handoutInstances, eq(handoutInstances.id, regimens.instanceId))
    .leftJoin(handoutVersions, eq(handoutVersions.id, handoutInstances.versionId))
    .where(eq(regimens.sessionId, sessionId))
    .orderBy(desc(regimens.active), regimens.createdAt)
    .all();
  return rows.map(({ r, v }) => ({
    id: r.id,
    name: r.name,
    kind: r.kind === "clinician" ? "clinician" : "own",
    active: r.active,
    badge:
      r.kind === "clinician" && v
        ? { credential: badgeCredential(v.clinicianCredential), clinicianName: v.clinicianName, clinicName: v.clinicName }
        : null,
  }));
}

export function getActiveRegimen(sessionId: string): RegimenRow | null {
  return db.select().from(regimens).where(and(eq(regimens.sessionId, sessionId), eq(regimens.active, true))).get() ?? null;
}

export function setActiveRegimen(sessionId: string, regimenId: number): boolean {
  if (!getOwnedRegimen(sessionId, regimenId)) return false;
  db.transaction((tx) => {
    tx.update(regimens).set({ active: false }).where(and(eq(regimens.sessionId, sessionId), ne(regimens.id, regimenId))).run();
    tx.update(regimens).set({ active: true }).where(eq(regimens.id, regimenId)).run();
  });
  return true;
}

function insertRegimen(sessionId: string, values: { name: string; kind: "own" | "clinician"; instanceId?: number | null; active: boolean }, now: Date): RegimenRow {
  return db.transaction((tx) => {
    if (values.active) tx.update(regimens).set({ active: false }).where(eq(regimens.sessionId, sessionId)).run();
    return tx
      .insert(regimens)
      .values({ sessionId, name: values.name, kind: values.kind, instanceId: values.instanceId ?? null, active: values.active, createdAt: iso(now) })
      .returning()
      .get();
  });
}

/**
 * The own regimen that "Add to my regimen" on a product page writes to: the
 * active one if it's an own regimen, else the newest own regimen. With
 * create, makes "My regimen" when there is none (active if nothing else is).
 */
export function primaryOwnRegimenId(sessionId: string, create: boolean, now = new Date()): number | null {
  const active = getActiveRegimen(sessionId);
  if (active?.kind === "own") return active.id;
  const own = db
    .select({ id: regimens.id })
    .from(regimens)
    .where(and(eq(regimens.sessionId, sessionId), eq(regimens.kind, "own")))
    .orderBy(desc(regimens.createdAt))
    .get();
  if (own) return own.id;
  if (!create) return null;
  return insertRegimen(sessionId, { name: DEFAULT_REGIMEN_NAME, kind: "own", active: !active }, now).id;
}

/** The claim: a clinician plan becomes this session's regimen, and the one /regimen opens on. */
export function createClinicianRegimen(sessionId: string, instanceId: number, name: string, now: Date): RegimenRow {
  const existing = db.select().from(regimens).where(eq(regimens.instanceId, instanceId)).get();
  if (existing && existing.sessionId === sessionId) {
    setActiveRegimen(sessionId, existing.id);
    return existing;
  }
  return insertRegimen(sessionId, { name, kind: "clinician", instanceId, active: true }, now);
}

export function regimenForInstance(sessionId: string, instanceId: number): RegimenRow | null {
  return db.select().from(regimens).where(and(eq(regimens.instanceId, instanceId), eq(regimens.sessionId, sessionId))).get() ?? null;
}

export function countRegimens(sessionId: string): number {
  return db.select({ id: regimens.id }).from(regimens).where(eq(regimens.sessionId, sessionId)).all().length;
}

export function canAddRegimen(sessionId: string): boolean {
  return countRegimens(sessionId) < MAX_REGIMENS;
}

/** Deletes one of the session's regimens (its items and step states too). Another becomes active. */
export function deleteRegimen(sessionId: string, regimenId: number): boolean {
  const r = getOwnedRegimen(sessionId, regimenId);
  if (!r) return false;
  db.transaction((tx) => {
    tx.delete(regimenItems).where(eq(regimenItems.regimenId, regimenId)).run();
    tx.delete(regimenStepStates).where(eq(regimenStepStates.regimenId, regimenId)).run();
    tx.delete(regimens).where(eq(regimens.id, regimenId)).run();
    if (r.active) {
      const next = tx.select({ id: regimens.id }).from(regimens).where(eq(regimens.sessionId, sessionId)).orderBy(desc(regimens.createdAt)).get();
      if (next) tx.update(regimens).set({ active: true }).where(eq(regimens.id, next.id)).run();
    }
  });
  return true;
}

export function renameRegimen(sessionId: string, regimenId: number, name: string): boolean {
  const r = getOwnedRegimen(sessionId, regimenId);
  // A clinician plan keeps the clinician's title (part of "exactly what they wrote").
  if (!r || r.kind !== "own") return false;
  db.update(regimens).set({ name }).where(eq(regimens.id, regimenId)).run();
  return true;
}

// --- clinician plans --------------------------------------------------------

export type ClinicianPlan = {
  regimen: RegimenRow;
  version: HandoutVersion;
  states: Map<string, StepState>;
  products: Map<string, typeof products.$inferSelect>;
};

export function getClinicianPlan(sessionId: string, regimenId: number): ClinicianPlan | null {
  const row = db
    .select({ r: regimens, v: handoutVersions })
    .from(regimens)
    .innerJoin(handoutInstances, eq(handoutInstances.id, regimens.instanceId))
    .innerJoin(handoutVersions, eq(handoutVersions.id, handoutInstances.versionId))
    .where(and(eq(regimens.id, regimenId), eq(regimens.sessionId, sessionId), eq(regimens.kind, "clinician")))
    .get();
  if (!row) return null;
  const states = new Map(
    db.select().from(regimenStepStates).where(eq(regimenStepStates.regimenId, regimenId)).all().map((s) => [s.stepKey, s]),
  );
  const ids = row.v.content.steps.map((s) => s.productId).filter((v): v is string => !!v);
  const prods = new Map((ids.length ? db.select().from(products).where(inArray(products.id, ids)).all() : []).map((p) => [p.id, p]));
  return { regimen: row.r, version: row.v, states, products: prods };
}

export type StepStatePatch = { hidden?: boolean; done?: boolean; have?: boolean };

export function setStepState(sessionId: string, regimenId: number, stepKey: string, patch: StepStatePatch, now: Date): StepState | null {
  const plan = getClinicianPlan(sessionId, regimenId);
  if (!plan || !plan.version.content.steps.some((s) => s.key === stepKey)) return null;
  const prev = plan.states.get(stepKey);
  const next = {
    hidden: patch.hidden ?? prev?.hidden ?? false,
    doneAt: patch.done === undefined ? prev?.doneAt ?? null : patch.done ? iso(now) : null,
    haveAt: patch.have === undefined ? prev?.haveAt ?? null : patch.have ? iso(now) : null,
  };
  return db
    .insert(regimenStepStates)
    .values({ regimenId, stepKey, ...next })
    .onConflictDoUpdate({ target: [regimenStepStates.regimenId, regimenStepStates.stepKey], set: next })
    .returning()
    .get();
}

const toItemSlot = (s: HandoutStep["slot"]): Slot => (s === "am" || s === "pm" ? s : "both");

/**
 * "Make a personal copy": a new OWN regimen with the plan's product steps
 * and the clinician's wording kept as each item's note. It has no instance,
 * so no badge -- it's the patient's to change. Steps without a specific
 * product can't become items and are left out (the caller says so).
 */
export function copyClinicianPlan(sessionId: string, regimenId: number, now: Date): { regimen: RegimenRow; skipped: number } | null {
  const plan = getClinicianPlan(sessionId, regimenId);
  if (!plan) return null;
  const copy = insertRegimen(sessionId, { name: `${plan.version.title} (my copy)`.slice(0, 80), kind: "own", active: true }, now);
  let skipped = 0;
  for (const step of plan.version.content.steps) {
    if (!step.productId || !plan.products.has(step.productId)) {
      skipped++;
      continue;
    }
    setRegimenItem(sessionId, copy.id, step.productId, toItemSlot(step.slot), step.directions || null);
  }
  return { regimen: copy, skipped };
}
