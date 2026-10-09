// The owner's purge for a handout version that a clinician filled with
// patient details. Versions are otherwise immutable (migration 0010's
// triggers), so this is the only delete path: it records the purge in
// handout_version_purges, which the delete trigger (migration 0022) checks,
// then removes the version, its printouts and the patient plans saved from
// them. Run from the server: `npm run handouts:purge -- <ref> "<reason>"`.
import { and, desc, eq, inArray, max } from "drizzle-orm";
import { db } from "@/db/client";
import { handoutInstances, handoutVersionPurges, handouts, handoutVersions, regimenItems, regimens, regimenStepStates } from "@/db/schema";

export type PurgeResult =
  | { ok: true; ref: string; handoutId: string; printouts: number; plans: number; handoutDeleted: boolean }
  | { ok: false; error: string };

export function purgeHandoutVersion(ref: string, reason: string, now: Date): PurgeResult {
  const cleanRef = ref.trim().toUpperCase();
  if (!reason.trim()) return { ok: false, error: "Give a reason; it is kept with the purge record." };
  return db.transaction((tx) => {
    const v = tx.select().from(handoutVersions).where(eq(handoutVersions.ref, cleanRef)).get();
    if (!v) return { ok: false as const, error: `No handout version with ref ${cleanRef}.` };
    const instanceIds = tx.select({ id: handoutInstances.id }).from(handoutInstances).where(eq(handoutInstances.versionId, v.id)).all().map((r) => r.id);
    const planIds = instanceIds.length
      ? tx.select({ id: regimens.id }).from(regimens).where(and(inArray(regimens.instanceId, instanceIds), eq(regimens.kind, "clinician"))).all().map((r) => r.id)
      : [];
    if (planIds.length) {
      tx.delete(regimenStepStates).where(inArray(regimenStepStates.regimenId, planIds)).run();
      tx.delete(regimenItems).where(inArray(regimenItems.regimenId, planIds)).run();
      tx.delete(regimens).where(inArray(regimens.id, planIds)).run();
    }
    if (instanceIds.length) tx.delete(handoutInstances).where(inArray(handoutInstances.id, instanceIds)).run();
    tx.insert(handoutVersionPurges).values({ versionId: v.id, ref: v.ref, handoutId: v.handoutId, reason: reason.trim(), purgedAt: now.toISOString() }).run();
    tx.delete(handoutVersions).where(eq(handoutVersions.id, v.id)).run();

    // Point the handout at its newest remaining version, or drop it if none is left.
    const newest = tx.select({ n: max(handoutVersions.version) }).from(handoutVersions).where(eq(handoutVersions.handoutId, v.handoutId)).get()?.n ?? null;
    if (newest === null) {
      tx.delete(handouts).where(eq(handouts.id, v.handoutId)).run();
    } else {
      const title = tx.select({ t: handoutVersions.title }).from(handoutVersions).where(eq(handoutVersions.handoutId, v.handoutId)).orderBy(desc(handoutVersions.version)).get()!.t;
      tx.update(handouts).set({ latestVersion: newest, title }).where(eq(handouts.id, v.handoutId)).run();
    }
    return { ok: true as const, ref: v.ref, handoutId: v.handoutId, printouts: instanceIds.length, plans: planIds.length, handoutDeleted: newest === null };
  });
}
