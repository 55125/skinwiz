import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, shelfItems } from "@/db/schema";

export type ShelfStatus = "own" | "want" | "empty";
export const SHELF_STATUSES: ShelfStatus[] = ["own", "want", "empty"];

export function isShelfStatus(v: unknown): v is ShelfStatus {
  return typeof v === "string" && (SHELF_STATUSES as string[]).includes(v);
}

export function getShelfEntry(sessionId: string, productId: string) {
  return db
    .select({ status: shelfItems.status, opened: shelfItems.opened })
    .from(shelfItems)
    .where(and(eq(shelfItems.sessionId, sessionId), eq(shelfItems.productId, productId)))
    .get() as { status: ShelfStatus; opened: boolean } | undefined;
}

export function getShelf(sessionId: string) {
  return db
    .select({ status: shelfItems.status, opened: shelfItems.opened, updatedAt: shelfItems.updatedAt, product: products })
    .from(shelfItems)
    .innerJoin(products, eq(products.id, shelfItems.productId))
    .where(eq(shelfItems.sessionId, sessionId))
    .orderBy(shelfItems.updatedAt)
    .all() as { status: ShelfStatus; opened: boolean; updatedAt: string; product: typeof products.$inferSelect }[];
}

const MAX_SHELF = 500;

export function countShelf(sessionId: string): number {
  return db.select({ id: shelfItems.id }).from(shelfItems).where(eq(shelfItems.sessionId, sessionId)).all().length;
}

/** status null removes the product from the shelf. */
export function setShelfEntry(sessionId: string, productId: string, status: ShelfStatus | null, opened: boolean): "ok" | "full" {
  if (status === null) {
    db.delete(shelfItems).where(and(eq(shelfItems.sessionId, sessionId), eq(shelfItems.productId, productId))).run();
    return "ok";
  }
  if (!getShelfEntry(sessionId, productId) && countShelf(sessionId) >= MAX_SHELF) return "full";
  const isOpened = status === "own" ? opened : false;
  db.insert(shelfItems)
    .values({ sessionId, productId, status, opened: isOpened })
    .onConflictDoUpdate({
      target: [shelfItems.sessionId, shelfItems.productId],
      set: { status, opened: isOpened, updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19) },
    })
    .run();
  return "ok";
}
