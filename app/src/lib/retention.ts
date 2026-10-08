// Retention limits the privacy policy promises, enforced by the hourly
// cleanup job (lib/jobs.ts). Sign-in link records have their own purge in
// lib/identity.ts.
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/** Privacy policy §6: clinician applications are kept for up to two years. */
export const RATER_APPLICATION_RETENTION_DAYS = 730;

export function purgeOldRaterApplications(now: Date): number {
  const cutoff = new Date(now.getTime() - RATER_APPLICATION_RETENTION_DAYS * 24 * 60 * 60_000).toISOString();
  // created_at is SQLite's "YYYY-MM-DD HH:MM:SS"; datetime() puts the cutoff in the same form.
  return db.run(sql`DELETE FROM rater_applications WHERE created_at < datetime(${cutoff})`).changes;
}
