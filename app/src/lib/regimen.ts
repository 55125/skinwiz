import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { labelSections, products, regimenItems } from "@/db/schema";
import { ACTIVE_DEFINITIONS } from "@/db/actives";
import { CLASS_IDS, classesOf, findRoutineConflicts, type ClassId, type RoutineConflict } from "@/lib/routine-conflicts";
import { ACTIVE_GUIDANCE, FORMULATION_GUIDANCE, type ActiveGuidance, type FormulationGuidance } from "@/db/usage-guidance";

// A visitor's AM/PM regimen. Products are only ever ones they added; the
// site never fills a regimen for them. What's computed here is presentation:
// which step a product is (from its formulation), so each slot layers
// thinnest to thickest with sunscreen last in the morning, and a default
// slot when something is first added -- a starting point they can change.

export type Slot = "am" | "pm" | "both";
export const SLOTS: Slot[] = ["am", "pm", "both"];
export function isSlot(v: unknown): v is Slot {
  return typeof v === "string" && (SLOTS as string[]).includes(v);
}

// One step vocabulary, shared with the drafted guidance.
import type { StepType } from "@/db/usage-guidance";
export type { StepType };

// Application order within a slot (face steps), then body/scalp steps after.
export const STEP_ORDER: Record<StepType, number> = {
  cleanser: 10, toner: 20, serum: 30, gel: 40, spot: 45, lotion: 50, cream: 60, ointment: 80, sunscreen: 90,
  scalp: 100, "body-powder": 110, antiperspirant: 120,
};
export const STEP_LABEL: Record<StepType, string> = {
  cleanser: "Cleanse", toner: "Toner", serum: "Serum", gel: "Gel", spot: "Spot treatment", lotion: "Lotion",
  cream: "Cream", ointment: "Ointment", sunscreen: "Sunscreen", scalp: "Scalp", "body-powder": "Body", antiperspirant: "Underarms",
};

const SUNSCREEN_ACTIVES = new Set(ACTIVE_DEFINITIONS.filter((a) => a.categories.includes("sunscreen")).map((a) => a.id));
const ANTIPERSPIRANT_ACTIVES = new Set(ACTIVE_DEFINITIONS.filter((a) => a.categories.includes("antiperspirant")).map((a) => a.id));

type Product = typeof products.$inferSelect;

/** Which regimen step a product is, from its dosage form and name. */
export function stepTypeOf(p: Pick<Product, "brandName" | "dosageForm" | "activeIds" | "concernId">): StepType {
  const name = p.brandName.toLowerCase();
  const form = (p.dosageForm ?? "").toLowerCase();
  const has = (re: RegExp) => re.test(name) || re.test(form);
  const actives = p.activeIds ?? [];

  if (actives.some((a) => ANTIPERSPIRANT_ACTIVES.has(a)) || p.concernId === "excessive-sweating" || has(/antiperspirant|deodorant/)) return "antiperspirant";
  if (has(/shampoo|scalp|conditioner/)) return "scalp";
  if (has(/cleanser|cleansing|face wash|facial wash|body wash|\bwash\b|soap|scrub|\bbar\b|micellar/)) return "cleanser";
  if (actives.some((a) => SUNSCREEN_ACTIVES.has(a)) || p.concernId === "sun-protection" || has(/\bspf\b|sunscreen/)) return "sunscreen";
  if (has(/powder/) && p.concernId === "antifungal") return "body-powder";
  if (has(/\bspot\b|patch|pimple|blemish stick/)) return "spot";
  if (has(/serum|ampoule|booster|essence|\bdrops\b/)) return "serum";
  if (has(/toner|tonic|\bmist\b|astringent|\bpads?\b|swab/)) return "toner";
  if (has(/ointment|salve|\bbalm\b|jelly|petrolatum|paste/)) return "ointment";
  if (has(/\bcream\b|creme|crème/)) return "cream";
  if (has(/lotion|emulsion|\bmilk\b|moisturi[sz]er/)) return "lotion";
  if (has(/\bgel\b/)) return "gel";
  if (has(/solution|liquid|\boil\b|foam|spray/)) return "serum";
  return "lotion";
}

/** Where a product goes when first added, and why. The visitor can move it. */
export function suggestSlot(p: Pick<Product, "id" | "brandName" | "dosageForm" | "activeIds" | "concernId">): { slot: Slot; reason: string | null } {
  const step = stepTypeOf(p);
  if (step === "sunscreen") return { slot: "am", reason: "Set to morning: sunscreen protects during daylight hours." };
  if (step === "antiperspirant") return { slot: "pm", reason: "Set to night: antiperspirant labels commonly direct applying it at bedtime." };
  // Ingredient-list classes (a retinoid far down a cosmetic list doesn't
  // count) plus the product's named actives, so "Retinol Night Serum" is
  // still recognized when retinol sits low on its list.
  const cls = new Set<ClassId>(classesOf(p.id));
  for (const [c, ids] of Object.entries(CLASS_IDS) as [ClassId, string[]][]) {
    if ((p.activeIds ?? []).some((a) => ids.includes(a))) cls.add(c);
  }
  if ((cls.has("retinoid") || cls.has("exfoliant")) && step !== "cleanser") {
    return { slot: "pm", reason: "Set to night: retinoids and leave-on acids are usually used in the evening." };
  }
  if (cls.has("vitamin-c")) return { slot: "am", reason: "Set to morning: vitamin C is usually applied in the morning, under sunscreen." };
  return { slot: "both", reason: null };
}

export function getLabelSections(splSetId: string | null) {
  if (!splSetId) return null;
  return db.select().from(labelSections).where(eq(labelSections.splSetId, splSetId)).get() ?? null;
}

// Drafted usage guidance only appears once the dermatologist has marked an
// entry reviewed (db/usage-guidance.ts). SHOW_DRAFT_GUIDANCE=1 previews the
// drafts -- for local review only, never set in production.
const SHOW_DRAFTS = process.env.SHOW_DRAFT_GUIDANCE === "1";
export function guidanceForActives(activeIds: string[]): (ActiveGuidance & { draft: boolean })[] {
  return activeIds
    .map((id) => ACTIVE_GUIDANCE[id])
    .filter((g): g is ActiveGuidance => !!g && (g.reviewed || SHOW_DRAFTS))
    .map((g) => ({ ...g, draft: !g.reviewed }));
}
export function guidanceForStep(step: StepType): (FormulationGuidance & { draft: boolean }) | null {
  const g = FORMULATION_GUIDANCE[step];
  return g && (g.reviewed || SHOW_DRAFTS) ? { ...g, draft: !g.reviewed } : null;
}

// Item reads/writes act on one of the visitor's own regimens (lib/regimens.ts
// picks which: the one open on /regimen, or for "Add to my regimen" on a
// product page, their primary own regimen). Clinician plans have no items.

/** The product's slot in that regimen, or null. regimenId null = the visitor has no own regimen yet. */
export function getRegimenSlot(regimenId: number | null, productId: string): Slot | null {
  if (regimenId === null) return null;
  const row = db
    .select({ slot: regimenItems.slot })
    .from(regimenItems)
    .where(and(eq(regimenItems.regimenId, regimenId), eq(regimenItems.productId, productId)))
    .get();
  return row && isSlot(row.slot) ? row.slot : null;
}

export const MAX_REGIMEN = 40;

/** slot null removes the product from the regimen. */
export function setRegimenItem(
  sessionId: string,
  regimenId: number,
  productId: string,
  slot: Slot | null,
  directions: string | null = null,
): "ok" | "full" {
  if (slot === null) {
    db.delete(regimenItems).where(and(eq(regimenItems.regimenId, regimenId), eq(regimenItems.productId, productId))).run();
    return "ok";
  }
  const count = db.select({ id: regimenItems.id }).from(regimenItems).where(eq(regimenItems.regimenId, regimenId)).all().length;
  if (!getRegimenSlot(regimenId, productId) && count >= MAX_REGIMEN) return "full";
  db.insert(regimenItems)
    .values({ sessionId, regimenId, productId, slot, directions })
    .onConflictDoUpdate({ target: [regimenItems.regimenId, regimenItems.productId], set: { slot } })
    .run();
  return "ok";
}

export type RegimenStep = {
  product: Product;
  slot: Slot;
  step: StepType;
  label: typeof labelSections.$inferSelect | null;
  directions: string | null; // a personal copy's note of the clinician's wording
};

export type SlotConflict = RoutineConflict & { status: "same-time" | "split" };

export type Regimen = {
  am: RegimenStep[];
  pm: RegimenStep[];
  count: number;
  conflicts: SlotConflict[];
};

export const EMPTY_REGIMEN: Regimen = { am: [], pm: [], count: 0, conflicts: [] };

/** One own regimen's items. The caller has already checked it belongs to the session (lib/regimens.ts). */
export function getRegimen(regimenId: number | null): Regimen {
  if (regimenId === null) return EMPTY_REGIMEN;
  const rows = db
    .select({ slot: regimenItems.slot, createdAt: regimenItems.createdAt, directions: regimenItems.directions, product: products })
    .from(regimenItems)
    .innerJoin(products, eq(products.id, regimenItems.productId))
    .where(eq(regimenItems.regimenId, regimenId))
    .orderBy(regimenItems.createdAt)
    .all();

  const setIds = [...new Set(rows.map((r) => r.product.splSetId).filter((v): v is string => !!v))];
  const labels = new Map(
    (setIds.length ? db.select().from(labelSections).where(inArray(labelSections.splSetId, setIds)).all() : []).map((l) => [l.splSetId, l]),
  );

  const steps: RegimenStep[] = rows.map((r) => ({
    product: r.product,
    slot: isSlot(r.slot) ? r.slot : "both",
    step: stepTypeOf(r.product),
    label: r.product.splSetId ? labels.get(r.product.splSetId) ?? null : null,
    directions: r.directions,
  }));
  const bySlot = (s: "am" | "pm") =>
    steps.filter((x) => x.slot === s || x.slot === "both").sort((a, b) => STEP_ORDER[a.step] - STEP_ORDER[b.step]);

  // The same cautions the shelf and community routines use, told apart by
  // whether the two products are ever in the same slot.
  const slotOf = new Map(steps.map((s) => [s.product.id, s.slot]));
  const shareTime = (a: Slot, b: Slot) => a === "both" || b === "both" || a === b;
  // Cleansers are left out: a wash-off product is on the skin for a minute,
  // so pairing it with a leave-on isn't the stacking these cautions are about.
  const leaveOn = steps.filter((s) => s.step !== "cleanser");
  const conflicts = findRoutineConflicts(leaveOn.map((s) => ({ productId: s.product.id, productBrandName: s.product.brandName }))).map(
    (c): SlotConflict => ({ ...c, status: shareTime(slotOf.get(c.a.productId)!, slotOf.get(c.b.productId)!) ? "same-time" : "split" }),
  );

  return { am: bySlot("am"), pm: bySlot("pm"), count: steps.length, conflicts };
}
