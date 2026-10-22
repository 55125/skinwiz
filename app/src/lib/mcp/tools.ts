// The tools behind the public MCP endpoint (app/mcp/route.ts): read-only
// lookups over the same catalog the site shows, so an AI assistant someone
// has connected can answer "does this contain my allergen?" from our data and
// link back to the page. Nothing here reads or writes anyone's account, and
// each answer is capped in size so the endpoint can't be used to copy the
// catalog faster than the pages could be.

import { ALLERGEN_GROUPS, CONTACT_ALLERGENS, allergenLabel, allergensInIngredient, allergensInList, getAllergen, labelNames, normalizeForAllergens, searchAllergens, type ContactAllergen } from "@/db/contact-allergens";
import { FREE_FROM_CHECKS, getFreeFromCheck, ingredientFailsCheck } from "@/db/ingredient-flags";
import { canonicalSlug, ingredientKey, slugFor, splitIngredientList } from "@/db/ingredient-parse";
import { avoidConflicts, avoidedIngredientName, normalizeAvoidId } from "@/lib/avoid-shared";
import { avoidedIngredientPageName, listsIngredient } from "@/lib/avoid-ingredients";
import { productBrand } from "@/lib/product-brand";
import { SITE_NAME } from "@/lib/brand";
import { siteUrl } from "@/lib/site-url";
import {
  MIN_PUBLIC_PRODUCTS,
  getConcern,
  getIngredient,
  getIngredientsForProduct,
  getProduct,
  lookupProductsByCode,
  searchProducts,
  suggestIngredients,
} from "@/lib/queries";
import { intArg, listArg, textArg, type Tool, type ToolResult } from "@/lib/mcp/protocol";

export const EDUCATION_NOTE =
  `${SITE_NAME} reads published ingredient lists; it is education, not medical advice. Labels change and can be incomplete, so anyone with a known allergy should check the package itself and follow their clinician's advice.`;

const MAX_LIST_CHARS = 6000;
const MAX_AVOID = 12;

type Product = NonNullable<ReturnType<typeof getProduct>>;

const productUrl = (id: string) => `${siteUrl()}/product/${encodeURIComponent(id)}`;
const ingredientUrl = (id: string) => `${siteUrl()}/ingredient/${encodeURIComponent(id)}`;

function avoidLabel(id: string): string {
  return avoidedIngredientPageName(id) ?? avoidedIngredientName(id);
}

// Whether an allergen goes by this exact name (normalized), label or trade.
const goesBy = (a: ContactAllergen, norm: string) => [a.name, ...labelNames(a), ...(a.aka ?? [])].some((n) => normalizeForAllergens(n) === norm);

// What a person types ("fragrance", "MI", "parabens", "iron oxides") to the
// avoid ids the site's own filters use (lib/avoid-shared.ts). Tried in the
// order a person most likely meant: an id, a named group, one allergen, a
// free-from check, then any ingredient page.
export function resolveAvoidTerm(term: string): { id: string; label: string } | null {
  const lower = term.toLowerCase().trim();
  const asId = normalizeAvoidId(lower) ?? normalizeAvoidId(lower.replace(/\s+/g, "-"));
  if (asId) return { id: asId, label: avoidLabel(asId) };
  const norm = normalizeForAllergens(term);
  const group = ALLERGEN_GROUPS.find((g) => normalizeForAllergens(g.name) === norm);
  if (group) return { id: group.id, label: group.name };
  // Any of an allergen's names typed in full ("MI", "Kathon CG"); a partial
  // name only when it's long enough not to hit inside others ("mi" is in
  // "amyl cinnamal").
  const allergens = searchAllergens(term);
  const allergen = allergens.find((a) => goesBy(a, norm)) ?? (norm.length >= 4 && allergens.length === 1 ? allergens[0] : undefined);
  if (allergen) return { id: allergen.id, label: allergen.name };
  const check = FREE_FROM_CHECKS.find((c) => [c.label.toLowerCase(), c.label.toLowerCase().replace(/-free$/, "")].includes(lower));
  if (check) return { id: check.id, label: avoidLabel(check.id) };
  const key = ingredientKey(term);
  const slug = key ? canonicalSlug(slugFor(key)) : "";
  const ingredient = slug ? getIngredient(slug) : undefined;
  if (ingredient) return { id: `ing:${ingredient.id}`, label: ingredient.name };
  return norm.length >= 4 && allergens[0] ? { id: allergens[0].id, label: allergens[0].name } : null;
}

function resolveAvoidList(terms: string[]) {
  const resolved: { term: string; id: string; label: string }[] = [];
  const unknown: string[] = [];
  for (const term of terms) {
    const r = resolveAvoidTerm(term);
    if (r) resolved.push({ term, ...r });
    else unknown.push(term);
  }
  return { resolved, unknown };
}

function avoidLines(product: { freeFromFlags: string[] | null; allergenHits?: string[] | null; id?: string; ingredientIds?: string[] }, avoid: ReturnType<typeof resolveAvoidList>): string[] {
  if (!avoid.resolved.length && !avoid.unknown.length) return [];
  const lines = [`Avoid-list check (${avoid.resolved.map((r) => `"${r.term}" read as ${r.label}`).join("; ") || "nothing recognized"}):`];
  if (avoid.unknown.length) lines.push(`- Not recognized, so not checked: ${avoid.unknown.join(", ")}`);
  if (!avoid.resolved.length) return lines;
  const found = avoidConflicts(product, avoid.resolved.map((r) => r.id), listsIngredient);
  if (!found) {
    lines.push("- Can't check: no full ingredient list on file. This is unknown, not clear.");
    return lines;
  }
  for (const id of found.conflicts) lines.push(`- CONTAINS ${avoidLabel(id)}`);
  for (const id of found.possible) lines.push(`- MAY CONTAIN ${avoidLabel(id)} (the label lists an undisclosed fragrance, which can hide it)`);
  if (!found.conflicts.length && !found.possible.length) lines.push("- None of these appear on the listed ingredients.");
  return lines;
}

function productHeading(p: Product): string {
  const { brand } = productBrand(p);
  const concern = getConcern(p.concernId)?.name;
  const parts = [p.brandName, brand && !p.brandName.toLowerCase().includes(brand.toLowerCase()) ? `by ${brand}` : null, p.dosageForm ? `(${p.dosageForm.toLowerCase()})` : null];
  return `${parts.filter(Boolean).join(" ")}${concern ? ` | ${concern}` : ""}`;
}

function flagSummary(p: Pick<Product, "freeFromFlags" | "allergenHits">): string {
  if (!p.freeFromFlags) return "Ingredient checks: no full ingredient list on file (unknown, not clear).";
  const free = p.freeFromFlags.map((id) => getFreeFromCheck(id)?.label).filter(Boolean);
  const allergens = (p.allergenHits ?? []).map((id) => (id === "fragrance" ? "undisclosed fragrance" : allergenLabel(id) ?? id));
  return [
    `Free of: ${free.join(", ") || "none of our checks pass"}`,
    `Contact allergens listed: ${allergens.length ? allergens.join(", ") : "none of the ~100 we screen for"}`,
  ].join("\n");
}

const searchTool: Tool = {
  name: "search_products",
  title: "Search skincare products",
  description:
    `Search ${SITE_NAME}'s catalog of US over-the-counter skincare, hair and oral care products by name, brand, ingredient or barcode/NDC. ` +
    "Optionally screen out products whose published ingredient list contains things the person avoids (allergens like fragrance or methylisothiazolinone, groups like parabens or formaldehyde releasers, or any ingredient name). " +
    "Products without a full ingredient list are left out when screening, since they can't be checked. Returns up to 10 results with links.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Product name, brand, ingredient or barcode, e.g. \"cerave moisturizing cream\" or \"azelaic acid\"." },
      avoid: { type: "array", items: { type: "string" }, description: "Ingredients or allergens to screen out, e.g. [\"fragrance\", \"lanolin\"]." },
      limit: { type: "integer", minimum: 1, maximum: 10, description: "How many results (default 5)." },
    },
    required: ["query"],
    additionalProperties: false,
  },
  run(args) {
    const q = textArg(args, "query", 100);
    const limit = intArg(args, "limit", 1, 10, 5);
    const avoid = resolveAvoidList(listArg(args, "avoid", MAX_AVOID, 80));
    const coded = lookupProductsByCode(q, limit);
    const rows = coded ?? searchProducts(q, { freeFromIds: avoid.resolved.map((r) => r.id), shelf: "main" }, limit);
    const head = [`Search: "${q}"${avoid.resolved.length ? `, screened for ${avoid.resolved.map((r) => r.label).join(", ")}` : ""}`];
    if (avoid.unknown.length) head.push(`Not recognized, so not screened: ${avoid.unknown.join(", ")}`);
    if (!rows.length) return { text: [...head, "No matching products.", `Search on the site: ${siteUrl()}/search?q=${encodeURIComponent(q)}`, "", EDUCATION_NOTE].join("\n") };
    const body = rows.map((p, i) => [`${i + 1}. ${productHeading(p)}`, `   id: ${p.canonicalId ?? p.id}  ${productUrl(p.canonicalId ?? p.id)}`, ...flagSummary(p).split("\n").map((l) => `   ${l}`)].join("\n"));
    return { text: [...head, "", ...body, "", `More results: ${siteUrl()}/search?q=${encodeURIComponent(q)}`, EDUCATION_NOTE].join("\n") };
  },
};

const productTool: Tool = {
  name: "get_product",
  title: "Get a product's ingredients",
  description:
    "Full detail for one product id from search_products: its listed ingredients in label order, which free-from checks it passes, which contact allergens it lists, and optionally whether it contains anything on the person's avoid list.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Product id from search_products." },
      avoid: { type: "array", items: { type: "string" }, description: "Ingredients or allergens to check for." },
    },
    required: ["id"],
    additionalProperties: false,
  },
  run(args) {
    const found = getProduct(textArg(args, "id", 80));
    const p = found?.canonicalId ? getProduct(found.canonicalId) ?? found : found;
    if (!p) return { text: "No product with that id. Use search_products to find one.", isError: true };
    const ings = getIngredientsForProduct(p.id);
    const actives = ings.filter((i) => i.isActive || i.position <= 0).map((i) => i.rawName);
    const inactive = ings.filter((i) => !(i.isActive || i.position <= 0)).map((i) => i.rawName);
    const avoid = resolveAvoidList(listArg(args, "avoid", MAX_AVOID, 80));
    const lines = [
      productHeading(p),
      productUrl(p.id),
      p.activeIngredientText && actives.length === 0 ? `Label: ${p.activeIngredientText.slice(0, 400)}` : null,
      actives.length ? `Active ingredients: ${actives.join(", ")}` : null,
      inactive.length ? `Ingredients: ${inactive.join(", ")}` : "Full ingredient list: not on file.",
      flagSummary(p),
      ...avoidLines(p, avoid),
      "",
      EDUCATION_NOTE,
    ];
    return { text: lines.filter((l) => l !== null).join("\n") };
  },
};

const ingredientTool: Tool = {
  name: "lookup_ingredient",
  title: "Look up an ingredient",
  description:
    "Look up a skincare ingredient by name (INCI or common name): how many catalog products list it, whether it is a known contact allergen and what group it belongs to, the free-from checks it trips, and a link to its page with the products that contain it.",
  inputSchema: {
    type: "object",
    properties: { name: { type: "string", description: "Ingredient name, e.g. \"niacinamide\", \"MI\" or \"parfum\"." } },
    required: ["name"],
    additionalProperties: false,
  },
  run(args) {
    const name = textArg(args, "name", 100);
    // A name an allergen goes by ("MI", "Kathon CG") is looked up under its
    // label name; otherwise the closest ingredient pages.
    const norm = normalizeForAllergens(name);
    const named = CONTACT_ALLERGENS.filter((a) => goesBy(a, norm));
    const asListed = named[0]?.terms[0]?.replace(/\*/g, "") ?? name;
    const key = ingredientKey(asListed);
    const exact = key ? getIngredient(canonicalSlug(slugFor(key))) : undefined;
    const matches = exact || name.length < 3 ? [] : suggestIngredients(asListed, 5);
    const ing = exact ?? (matches[0] ? getIngredient(matches[0].id) : undefined);
    const allergens = [...new Set([...named.map((a) => a.id), ...allergensInIngredient(ing?.name ?? name)])];
    if (!ing && !allergens.length) return { text: `No ingredient called "${name}" in the catalog.\n\n${EDUCATION_NOTE}` };
    const lines: string[] = [];
    if (ing) {
      const listed = ing.productCount >= MIN_PUBLIC_PRODUCTS;
      lines.push(`${ing.name}: listed on ${ing.productCount.toLocaleString("en-US")} catalog product${ing.productCount === 1 ? "" : "s"}.`);
      if (ing.aliases.length) lines.push(`Also listed as: ${ing.aliases.slice(0, 8).join(", ")}`);
      if (listed) lines.push(`Page with products that contain it: ${ingredientUrl(ing.id)}`);
      const fails = FREE_FROM_CHECKS.filter((c) => ingredientFailsCheck(c, ing.name)).map((c) => c.label);
      if (fails.length) lines.push(`A product listing it is not: ${fails.join(", ")}`);
      if (matches.length > 1) lines.push(`Other close matches: ${matches.slice(1).map((m) => m.name).join(", ")}`);
    }
    for (const id of allergens) {
      const a = getAllergen(id);
      if (!a) continue;
      const groups = ALLERGEN_GROUPS.filter((g) => g.members.includes(id)).map((g) => g.name);
      lines.push(`Contact allergen: ${a.name}${groups.length ? ` (in: ${groups.join("; ")})` : ""}. ${siteUrl()}/allergens/${a.id}`);
      if (a.note) lines.push(`  ${a.note}`);
    }
    return { text: [...lines, "", EDUCATION_NOTE].join("\n") };
  },
};

const checkTool: Tool = {
  name: "check_ingredient_list",
  title: "Check an ingredient list",
  description:
    "Check any pasted ingredient list (from a box, brand site or retailer page) for the ~100 contact allergens and the free-from checks the site screens for (fragrance, parabens, drying alcohol, fungal-acne triggers and more), and optionally against the person's own avoid list. " +
    "Only reads the text given; it does not identify the product.",
  inputSchema: {
    type: "object",
    properties: {
      ingredient_list: { type: "string", description: "The full ingredient list, comma-separated as printed." },
      avoid: { type: "array", items: { type: "string" }, description: "Ingredients or allergens to check for, e.g. [\"fragrance\", \"cocamidopropyl betaine\"]." },
    },
    required: ["ingredient_list"],
    additionalProperties: false,
  },
  run(args): ToolResult {
    const text = textArg(args, "ingredient_list", MAX_LIST_CHARS);
    const names = splitIngredientList(text);
    if (names.length < 4) return { text: "That looks too short to be a full ingredient list. Paste the whole list as printed.", isError: true };
    const hits = allergensInList(text);
    const lines = [`Read ${names.length} ingredients.`];
    lines.push(
      hits.length
        ? `Contact allergens listed: ${hits.map((id) => (id === "fragrance" ? "undisclosed fragrance (can hide fragrance allergens)" : getAllergen(id)?.name ?? id)).join(", ")}`
        : "Contact allergens listed: none of the ~100 we screen for.",
    );
    const failed = FREE_FROM_CHECKS.map((c) => ({ check: c, by: names.filter((n) => ingredientFailsCheck(c, n)) })).filter((f) => f.by.length);
    if (failed.length) lines.push("Checks that fail:", ...failed.map((f) => `- ${f.check.label}: no (${f.by.slice(0, 4).join(", ")})`));
    const freeFromFlags = FREE_FROM_CHECKS.filter((c) => !failed.some((f) => f.check === c)).map((c) => c.id);
    const ingredientIds = names.flatMap((n) => {
      const key = ingredientKey(n);
      return key ? [canonicalSlug(slugFor(key))] : [];
    });
    const avoid = resolveAvoidList(listArg(args, "avoid", MAX_AVOID, 80));
    lines.push(...avoidLines({ freeFromFlags, allergenHits: hits, ingredientIds }, avoid));
    lines.push("", `See it on the site: ${siteUrl()}/check`, EDUCATION_NOTE);
    return { text: lines.join("\n") };
  },
};

export const TOOLS: Tool[] = [searchTool, productTool, ingredientTool, checkTool];
