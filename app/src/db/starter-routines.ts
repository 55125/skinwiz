import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { routines, routineSteps } from "@/db/schema";
import data from "./starter-routines.json";

// Starter routines: a few routines per concern written by Actively from
// published dermatology guidance (each names the page it follows), so the
// routines pages aren't empty before visitors post their own. They carry
// this fixed session id instead of a visitor's, which is how the pages tell
// them apart from user posts, and they're voted on like any other routine.
export const STARTER_SESSION_ID = "actively-starter";

export type StarterRoutine = {
  title: string;
  concernId: string;
  steps: string[];
  notes: string;
  sourceName: string;
  sourceTitle: string;
  sourceUrl: string;
};

export const STARTER_ROUTINES: StarterRoutine[] = data;

export function starterSource(title: string): StarterRoutine | undefined {
  return STARTER_ROUTINES.find((r) => r.title === title);
}

// Inserts any starter routine not already there (matched by title), and
// never touches visitor routines or votes. Safe to run on every deploy.
export function seedStarterRoutines(): number {
  let inserted = 0;
  db.transaction((tx) => {
    for (const r of STARTER_ROUTINES) {
      const exists = tx
        .select({ id: routines.id })
        .from(routines)
        .where(and(eq(routines.sessionId, STARTER_SESSION_ID), eq(routines.title, r.title)))
        .get();
      if (exists) continue;
      const result = tx
        .insert(routines)
        .values({ title: r.title, concernId: r.concernId, authorName: "Actively", notes: r.notes, sessionId: STARTER_SESSION_ID })
        .run();
      const routineId = Number(result.lastInsertRowid);
      tx.insert(routineSteps)
        .values(r.steps.map((description, stepOrder) => ({ routineId, stepOrder, description, productId: null })))
        .run();
      inserted++;
    }
  });
  return inserted;
}
