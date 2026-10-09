// Writes for the first-party site statistics: beacon events (POST /api/e)
// and server errors (instrumentation.ts). See the analytics_events comment
// in db/schema.ts for what is and isn't stored.
import { randomBytes } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { analyticsEvents, analyticsSalts, serverErrors } from "@/db/schema";
import { deviceFromUa, utcDay, visitorHash, type CleanEvent } from "./core";

export const ANALYTICS_RETENTION_DAYS = 395;
const ERROR_RETENTION_DAYS = 90;

/** Today's salt, created on first use. Earlier days' salts are deleted here. */
export function dailySalt(now: Date): string {
  const day = utcDay(now);
  const existing = db.select({ salt: analyticsSalts.salt }).from(analyticsSalts).where(eq(analyticsSalts.day, day)).get();
  if (existing) return existing.salt;
  db.insert(analyticsSalts).values({ day, salt: randomBytes(32).toString("hex") }).onConflictDoNothing().run();
  db.delete(analyticsSalts).where(lt(analyticsSalts.day, day)).run();
  return db.select({ salt: analyticsSalts.salt }).from(analyticsSalts).where(eq(analyticsSalts.day, day)).get()!.salt;
}

export function recordEvent(event: CleanEvent, client: { ip: string; ua: string }, now = new Date()): void {
  const visitor = visitorHash(dailySalt(now), client.ip, client.ua);
  // One pageview per visitor per path per minute: a reload loop or a stuck
  // tab shouldn't inflate the counts.
  if (event.kind === "pageview") {
    const since = new Date(now.getTime() - 60_000).toISOString();
    const dup = db
      .select({ id: analyticsEvents.id })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.kind, "pageview"),
          eq(analyticsEvents.day, utcDay(now)),
          eq(analyticsEvents.visitor, visitor),
          eq(analyticsEvents.path, event.path),
          sql`${analyticsEvents.at} > ${since}`,
        ),
      )
      .get();
    if (dup) return;
  }
  db.insert(analyticsEvents)
    .values({
      at: now.toISOString(),
      day: utcDay(now),
      kind: event.kind,
      path: event.path,
      visitor,
      referrer: event.referrer,
      utmSource: event.utmSource,
      utmMedium: event.utmMedium,
      utmCampaign: event.utmCampaign,
      device: deviceFromUa(client.ua),
      detail: event.detail,
      value: event.value,
      productId: event.productId,
    })
    .run();
}

export function recordServerError(
  e: { method: string; path: string; route?: string | null; message: string; digest?: string | null },
  now = new Date(),
): void {
  db.insert(serverErrors)
    .values({
      at: now.toISOString(),
      method: e.method.slice(0, 10),
      path: e.path.slice(0, 200),
      route: e.route?.slice(0, 200) ?? null,
      message: e.message.slice(0, 300),
      digest: e.digest?.slice(0, 40) ?? null,
    })
    .run();
}

/** Run by the hourly job's cleanup step. Returns rows deleted. */
export function purgeAnalytics(now: Date): number {
  const eventsBefore = utcDay(new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * 86_400_000));
  const errorsBefore = new Date(now.getTime() - ERROR_RETENTION_DAYS * 86_400_000).toISOString();
  const a = db.delete(analyticsEvents).where(lt(analyticsEvents.day, eventsBefore)).run().changes;
  const b = db.delete(serverErrors).where(lt(serverErrors.at, errorsBefore)).run().changes;
  const c = db.delete(analyticsSalts).where(lt(analyticsSalts.day, utcDay(now))).run().changes;
  return a + b + c;
}
