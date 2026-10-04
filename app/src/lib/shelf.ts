import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products, shelfItems } from "@/db/schema";
import { inProductGroup, resolvedProductId } from "@/lib/canonical";

export type ShelfStatus = "own" | "want" | "empty";
export const SHELF_STATUSES: ShelfStatus[] = ["own", "want", "empty"];

export function isShelfStatus(v: unknown): v is ShelfStatus {
  return typeof v === "string" && (SHELF_STATUSES as string[]).includes(v);
}

// Shelf rows keep the product id they were saved with. A merged duplicate
// (lib/canonical.ts) is the same product as its canonical, so every read and
// write below matches the whole group and shows the canonical row.

function groupRow(sessionId: string, productId: string) {
  return db
    .select({ id: shelfItems.id, status: shelfItems.status, opened: shelfItems.opened })
    .from(shelfItems)
    .where(and(eq(shelfItems.sessionId, sessionId), inProductGroup(shelfItems.productId, productId)))
    .orderBy(shelfItems.updatedAt, shelfItems.id)
    .all()
    .at(-1);
}

export function getShelfEntry(sessionId: string, productId: string) {
  const row = groupRow(sessionId, productId);
  return row ? ({ status: row.status, opened: row.opened } as { status: ShelfStatus; opened: boolean }) : undefined;
}

export function getShelf(sessionId: string) {
  const rows = db
    .select({ status: shelfItems.status, opened: shelfItems.opened, updatedAt: shelfItems.updatedAt, product: products })
    .from(shelfItems)
    .innerJoin(products, eq(products.id, resolvedProductId(shelfItems.productId)))
    .where(eq(shelfItems.sessionId, sessionId))
    .orderBy(shelfItems.updatedAt, shelfItems.id)
    .all() as { status: ShelfStatus; opened: boolean; updatedAt: string; product: typeof products.$inferSelect }[];
  // A shelf holding both a duplicate and its canonical shows the product
  // once, with the latest entry's status, in that entry's place.
  const byProduct = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    byProduct.delete(r.product.id);
    byProduct.set(r.product.id, r);
  }
  return [...byProduct.values()];
}

const MAX_SHELF = 500;

export function countShelf(sessionId: string): number {
  return db.select({ id: shelfItems.id }).from(shelfItems).where(eq(shelfItems.sessionId, sessionId)).all().length;
}

/** status null removes the product from the shelf. */
export function setShelfEntry(sessionId: string, productId: string, status: ShelfStatus | null, opened: boolean): "ok" | "full" {
  if (status === null) {
    db.delete(shelfItems).where(and(eq(shelfItems.sessionId, sessionId), inProductGroup(shelfItems.productId, productId))).run();
    return "ok";
  }
  const existing = groupRow(sessionId, productId);
  if (!existing && countShelf(sessionId) >= MAX_SHELF) return "full";
  const isOpened = status === "own" ? opened : false;
  const updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19);
  if (existing) {
    // the row already saved for this product, whichever listing's id it carries
    db.update(shelfItems).set({ status, opened: isOpened, updatedAt }).where(eq(shelfItems.id, existing.id)).run();
    return "ok";
  }
  db.insert(shelfItems)
    .values({ sessionId, productId, status, opened: isOpened })
    .onConflictDoUpdate({
      target: [shelfItems.sessionId, shelfItems.productId],
      set: { status, opened: isOpened, updatedAt },
    })
    .run();
  return "ok";
}
