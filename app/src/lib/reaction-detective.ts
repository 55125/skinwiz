// Reaction Detective: from the products someone reacted to and the ones they
// use without trouble, which ingredients are worth suspecting. Pure (no DB),
// so it runs in tests and can be given products from any source; the page
// (app/reactions) loads the products and renders the result.
//
// It finds a pattern, never a diagnosis:
// - an ingredient in every product you reacted to and in none you tolerate is
//   a strong lead, not proof (amounts, leave-on vs rinse-off and irritation
//   all matter);
// - one reacted product can't single anything out, so with only one the
//   known contact allergens it lists are "possible" and nothing else is;
// - tolerating a product that lists an allergen argues against it but
//   doesn't clear it (a rinse-off wash or a lower amount often doesn't
//   trigger what a leave-on cream does), so it stays on the list, lower;
// - burning or peeling from a retinoid or an acid is usually irritation, so
//   when the reacted products share one the result says so up front.
import { ALLERGEN_GROUPS, allergenLabel, allergenMembers, allergensInIngredient } from "@/db/contact-allergens";
import { PATCH_TEST_SERIES, itemIds, seriesItems } from "@/db/patch-test-series";
import { CLASS_LABEL, classesFromIngredients, type ClassId } from "@/lib/routine-conflicts-pure";

export type DetectiveIngredient = { id: string; name: string; position: number; productCount: number };

export type DetectiveProduct = {
  id: string;
  name: string;
  ingredients: DetectiveIngredient[];
  /** null = no full ingredient list on file: can't be checked. */
  allergenHits: string[] | null;
};

export type SuspectStrength = "strong" | "possible" | "weaker";

export type Suspect = {
  kind: "allergen" | "group" | "ingredient";
  /** An allergen id, a cross-reacting group id, or an ingredient page id. */
  id: string;
  name: string;
  strength: SuspectStrength;
  /** Names of the reacted products that list it. */
  reactedIn: string[];
  /** Names of the tolerated products that list it. */
  fineIn: string[];
  /** For a group: the members the reacted products actually list. */
  members?: string[];
  /** Patch-test series (short names) that test for it. */
  series: string[];
  /** What to put on the avoid list for it. */
  avoidId: string;
};

export type IrritantNote = { cls: ClassId; label: string; reactedIn: string[]; fineIn: string[]; all: boolean };

export type DetectiveResult = {
  reactedChecked: number;
  fineChecked: number;
  /** Products with no full ingredient list on file. */
  unchecked: string[];
  suspects: Suspect[];
  irritants: IrritantNote[];
  /** Too little to go on: fewer than two reacted products with a list. */
  needMore: boolean;
};

// Ingredients in more than this share of the catalog (water, glycerin,
// phenoxyethanol...) are everywhere, so sharing them says nothing.
const COMMON_SHARE = 0.15;
const MAX_INGREDIENT_SUSPECTS = 8;
const SERIES_SHOWN = ["true-test", "acds-2020", "nac-80", "ebs-2023"];

const STRENGTH_ORDER: Record<SuspectStrength, number> = { strong: 0, possible: 1, weaker: 2 };
const KIND_ORDER: Record<Suspect["kind"], number> = { group: 0, allergen: 1, ingredient: 2 };

let seriesIndex: Map<string, string[]> | null = null;

/** Short names of the patch-test series with an item covering this allergen id. */
export function seriesFor(allergenId: string): string[] {
  if (!seriesIndex) {
    seriesIndex = new Map();
    for (const s of PATCH_TEST_SERIES.filter((x) => SERIES_SHOWN.includes(x.id))) {
      for (const it of seriesItems(s)) {
        for (const itemId of itemIds(it)) {
          for (const id of new Set([itemId, ...allergenMembers(itemId)])) {
            const list = seriesIndex.get(id) ?? [];
            if (!list.includes(s.short)) list.push(s.short);
            seriesIndex.set(id, list);
          }
        }
      }
    }
  }
  return seriesIndex.get(allergenId) ?? [];
}

function strengthOf(reacted: number, totalReacted: number, fine: number): SuspectStrength {
  if (fine > 0) return "weaker";
  if (reacted === totalReacted && totalReacted >= 2) return "strong";
  return "possible";
}

export function analyzeReactions(reacted: DetectiveProduct[], fine: DetectiveProduct[], catalogSize: number): DetectiveResult {
  const checkedR = reacted.filter((p) => p.allergenHits);
  const checkedF = fine.filter((p) => p.allergenHits);
  const unchecked = [...reacted, ...fine].filter((p) => !p.allergenHits).map((p) => p.name);
  const R = checkedR.length;
  const suspects: Suspect[] = [];

  // Allergens, one by one.
  const allergenIds = new Set(checkedR.flatMap((p) => p.allergenHits!));
  const byAllergen = new Map<string, { r: string[]; f: string[] }>();
  for (const id of allergenIds) {
    const r = checkedR.filter((p) => p.allergenHits!.includes(id)).map((p) => p.name);
    const f = checkedF.filter((p) => p.allergenHits!.includes(id)).map((p) => p.name);
    byAllergen.set(id, { r, f });
    suspects.push({
      kind: "allergen",
      id,
      name: id === "fragrance" ? "Fragrance (undisclosed)" : (allergenLabel(id) ?? id),
      strength: strengthOf(r.length, R, f.length),
      reactedIn: r,
      fineIn: f,
      series: seriesFor(id),
      avoidId: id,
    });
  }

  // Cross-reacting groups: different releasers (or isothiazolinones...) in
  // each reacted product point at the family even when no single member is
  // in all of them.
  for (const g of ALLERGEN_GROUPS.filter((x) => x.kind === "cross-reacting")) {
    const found = g.members.filter((m) => allergenIds.has(m));
    if (found.length < 2) continue;
    const r = checkedR.filter((p) => g.members.some((m) => p.allergenHits!.includes(m))).map((p) => p.name);
    const best = Math.max(...found.map((m) => byAllergen.get(m)!.r.length));
    if (r.length <= best) continue; // one member already explains as much
    const f = checkedF.filter((p) => g.members.some((m) => p.allergenHits!.includes(m))).map((p) => p.name);
    suspects.push({
      kind: "group",
      id: g.id,
      name: g.name,
      strength: strengthOf(r.length, R, f.length),
      reactedIn: r,
      fineIn: f,
      members: found.map((m) => allergenLabel(m) ?? m),
      series: [...new Set(found.flatMap(seriesFor))],
      avoidId: g.id,
    });
  }

  // Other ingredients: only with two or more reacted products to compare,
  // only uncommon ones, never ones a tolerated product lists.
  if (R >= 2) {
    const seen = new Map<string, { ing: DetectiveIngredient; r: string[] }>();
    for (const p of checkedR) {
      for (const ing of new Map(p.ingredients.map((i) => [i.id, i])).values()) {
        const e = seen.get(ing.id) ?? { ing, r: [] };
        e.r.push(p.name);
        seen.set(ing.id, e);
      }
    }
    const fineIds = new Set(checkedF.flatMap((p) => p.ingredients.map((i) => i.id)));
    const candidates = [...seen.values()]
      .filter((e) => e.r.length >= 2 && !fineIds.has(e.ing.id))
      .filter((e) => catalogSize <= 0 || e.ing.productCount / catalogSize < COMMON_SHARE)
      .filter((e) => allergensInIngredient(e.ing.name).length === 0) // already counted above
      .sort((a, b) => b.r.length - a.r.length || a.ing.productCount - b.ing.productCount)
      .slice(0, MAX_INGREDIENT_SUSPECTS);
    for (const e of candidates) {
      suspects.push({
        kind: "ingredient",
        id: e.ing.id,
        name: e.ing.name,
        // Not a known allergen, so a shared one is a lead to look at, never a
        // "strong" one beside a real allergen.
        strength: "possible",
        reactedIn: e.r,
        fineIn: [],
        series: [],
        avoidId: `ing:${e.ing.id}`,
      });
    }
  }

  suspects.sort(
    (a, b) =>
      STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength] ||
      Number(a.kind === "ingredient") - Number(b.kind === "ingredient") ||
      b.reactedIn.length - a.reactedIn.length ||
      a.fineIn.length - b.fineIn.length ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.name.localeCompare(b.name),
  );

  // Shared irritants.
  const irritants: IrritantNote[] = [];
  const classes = (p: DetectiveProduct) => classesFromIngredients(p.ingredients.map((i) => ({ ingredientId: i.id, position: i.position })));
  const classesR = checkedR.map((p) => ({ p, c: classes(p) }));
  const classesF = checkedF.map((p) => ({ p, c: classes(p) }));
  for (const cls of Object.keys(CLASS_LABEL) as ClassId[]) {
    if (cls === "vitamin-c") continue; // rarely the cause of a reaction on its own
    const r = classesR.filter((x) => x.c.has(cls)).map((x) => x.p.name);
    if (r.length === 0) continue;
    const f = classesF.filter((x) => x.c.has(cls)).map((x) => x.p.name);
    irritants.push({ cls, label: CLASS_LABEL[cls], reactedIn: r, fineIn: f, all: r.length === R });
  }
  irritants.sort((a, b) => b.reactedIn.length - a.reactedIn.length);

  return { reactedChecked: R, fineChecked: checkedF.length, unchecked, suspects, irritants, needMore: R < 2 };
}
