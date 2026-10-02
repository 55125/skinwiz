import { randomBytes } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { clinicianLists } from "@/db/schema";
import { IMPORT_CODES } from "@/lib/avoid-import";

// A practice's saved avoid lists (see schema.ts clinicianLists). Ids are
// limited to what the import link can carry, so any list can become a QR.
export type ClinicianList = typeof clinicianLists.$inferSelect;

import { MAX_LIST_NAME, MAX_LISTS } from "@/lib/clinician-list-limits";

export { MAX_LIST_NAME, MAX_LISTS };
const CODES = new Set(IMPORT_CODES);

export function listsForClinician(clinicianId: string): ClinicianList[] {
  return db.select().from(clinicianLists).where(eq(clinicianLists.clinicianId, clinicianId)).orderBy(asc(clinicianLists.name)).all();
}

export function getOwnedList(id: string, clinicianId: string): ClinicianList | undefined {
  return db.select().from(clinicianLists).where(and(eq(clinicianLists.id, id), eq(clinicianLists.clinicianId, clinicianId))).get();
}

export type SaveListResult = { ok: true; list: ClinicianList } | { ok: false; error: string };

/** Creates a list, or updates one the clinician owns. Unknown ids are dropped; an empty list is refused. */
export function saveList(clinicianId: string, input: { id?: string | null; name: unknown; ids: unknown }, now = new Date()): SaveListResult {
  const name = typeof input.name === "string" ? input.name.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_LIST_NAME) : "";
  if (!name) return { ok: false, error: "Give the list a name." };
  const ids = Array.isArray(input.ids) ? [...new Set(input.ids.filter((x): x is string => typeof x === "string" && CODES.has(x)))] : [];
  if (ids.length === 0) return { ok: false, error: "Tick at least one allergen." };
  const at = now.toISOString();
  if (input.id) {
    if (!getOwnedList(input.id, clinicianId)) return { ok: false, error: "List not found." };
    const list = db.update(clinicianLists).set({ name, ids, updatedAt: at }).where(eq(clinicianLists.id, input.id)).returning().get();
    return { ok: true, list };
  }
  const count = db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM clinician_lists WHERE clinician_id = ${clinicianId}`)!.n;
  if (count >= MAX_LISTS) return { ok: false, error: `You can keep up to ${MAX_LISTS} lists.` };
  const list = db
    .insert(clinicianLists)
    .values({ id: randomBytes(9).toString("base64url"), clinicianId, name, ids, createdAt: at, updatedAt: at })
    .returning()
    .get();
  return { ok: true, list };
}

export function deleteList(id: string, clinicianId: string): boolean {
  return db.delete(clinicianLists).where(and(eq(clinicianLists.id, id), eq(clinicianLists.clinicianId, clinicianId))).run().changes > 0;
}
