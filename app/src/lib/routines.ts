import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { routines, routineSteps, routineVotes, routineReports, concerns, products } from "@/db/schema";
import { resolvedProductId } from "@/lib/canonical";
import { STARTER_SESSION_ID } from "@/db/starter-routines";

// Vote score is computed on read (SUM of routine_votes.value), never
// stored as a column on routines — see schema.ts's comment on why: a
// stored score column could drift from the votes table, a computed one
// can't.
const scoreExpr = sql<number>`COALESCE(SUM(${routineVotes.value}), 0)`;
const isStarterExpr = sql<number>`${routines.sessionId} = ${STARTER_SESSION_ID}`;
const stepCountExpr = sql<number>`(SELECT COUNT(*) FROM routine_steps WHERE routine_steps.routine_id = ${routines.id})`;

export function getTopRoutines(limit = 6) {
  return db
    .select({
      id: routines.id,
      title: routines.title,
      concernId: routines.concernId,
      concernName: concerns.name,
      authorName: routines.authorName,
      createdAt: routines.createdAt,
      score: scoreExpr,
      stepCount: stepCountExpr,
    })
    .from(routines)
    .innerJoin(concerns, eq(concerns.id, routines.concernId))
    .leftJoin(routineVotes, eq(routineVotes.routineId, routines.id))
    .groupBy(routines.id)
    .orderBy(sql`${scoreExpr} DESC`, sql`${routines.createdAt} DESC`)
    .limit(limit)
    .all();
}

export function getRoutinesForConcern(concernId: string) {
  return db
    .select({
      id: routines.id,
      title: routines.title,
      authorName: routines.authorName,
      isStarter: isStarterExpr,
      notes: routines.notes,
      createdAt: routines.createdAt,
      score: scoreExpr,
      stepCount: stepCountExpr,
    })
    .from(routines)
    .leftJoin(routineVotes, eq(routineVotes.routineId, routines.id))
    .where(eq(routines.concernId, concernId))
    .groupBy(routines.id)
    .orderBy(sql`${scoreExpr} DESC`, sql`${routines.createdAt} DESC`)
    .all();
}

export function getRoutine(id: number) {
  const routine = db
    .select({
      id: routines.id,
      title: routines.title,
      concernId: routines.concernId,
      concernName: concerns.name,
      authorName: routines.authorName,
      isStarter: isStarterExpr,
      notes: routines.notes,
      createdAt: routines.createdAt,
      score: scoreExpr,
    })
    .from(routines)
    .innerJoin(concerns, eq(concerns.id, routines.concernId))
    .leftJoin(routineVotes, eq(routineVotes.routineId, routines.id))
    .where(eq(routines.id, id))
    .groupBy(routines.id)
    .get();
  if (!routine) return null;

  // leftJoin, not inner -- a step's productId can point at nothing (never
  // linked, or linked to a product that's since been removed from the
  // catalog); either way the step still renders, just without a product link.
  const steps = db
    .select({
      id: routineSteps.id,
      stepOrder: routineSteps.stepOrder,
      description: routineSteps.description,
      productId: sql<string | null>`coalesce(${products.id}, ${routineSteps.productId})`,
      productBrandName: products.brandName,
      productConcernId: products.concernId,
    })
    .from(routineSteps)
    .leftJoin(products, eq(products.id, resolvedProductId(routineSteps.productId))) // merged duplicates show as their canonical
    .where(eq(routineSteps.routineId, id))
    .orderBy(routineSteps.stepOrder)
    .all();

  return { ...routine, steps };
}

export function getSessionVote(routineId: number, sessionId: string): number | null {
  const row = db
    .select({ value: routineVotes.value })
    .from(routineVotes)
    .where(and(eq(routineVotes.routineId, routineId), eq(routineVotes.sessionId, sessionId)))
    .get();
  return row?.value ?? null;
}

export function createRoutine(input: {
  title: string;
  concernId: string;
  authorName: string | null;
  notes: string | null;
  steps: { description: string; productId: string | null }[];
  sessionId: string;
}): number {
  const result = db
    .insert(routines)
    .values({
      title: input.title,
      concernId: input.concernId,
      authorName: input.authorName,
      notes: input.notes,
      sessionId: input.sessionId,
    })
    .run();
  const routineId = Number(result.lastInsertRowid);

  // productId is assumed valid here -- routine_steps.productId is a real
  // foreign key (FK enforcement is on by default in this app), so a bogus
  // id would throw on insert, not silently no-op. The API route validates
  // it exists before calling this; this function trusts that's already done.
  const stepRows = input.steps
    .map((s) => ({ description: s.description.trim(), productId: s.productId }))
    .filter((s) => s.description)
    .map((s, i) => ({ routineId, stepOrder: i, description: s.description, productId: s.productId }));
  if (stepRows.length > 0) {
    db.insert(routineSteps).values(stepRows).run();
  }
  return routineId;
}

// onConflictDoUpdate lets someone change their vote (up -> down or vice
// versa) rather than being locked into their first click; the unique
// index on (routine_id, session_id) is what makes this an upsert instead
// of a second row.
export function voteOnRoutine(routineId: number, sessionId: string, value: 1 | -1) {
  db.insert(routineVotes)
    .values({ routineId, sessionId, value })
    .onConflictDoUpdate({
      target: [routineVotes.routineId, routineVotes.sessionId],
      set: { value },
    })
    .run();
}

export function getSessionReported(routineId: number, sessionId: string): boolean {
  const row = db
    .select({ id: routineReports.id })
    .from(routineReports)
    .where(and(eq(routineReports.routineId, routineId), eq(routineReports.sessionId, sessionId)))
    .get();
  return !!row;
}

// onConflictDoNothing rather than upsert -- a second report from the same
// session isn't a "changed" report the way a changed vote direction is, so
// there's nothing to update; the first one already counted.
export function reportRoutine(routineId: number, sessionId: string, reason: string | null) {
  db.insert(routineReports)
    .values({ routineId, sessionId, reason })
    .onConflictDoNothing({ target: [routineReports.routineId, routineReports.sessionId] })
    .run();
}
