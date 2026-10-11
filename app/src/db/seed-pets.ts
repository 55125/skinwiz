// Pet mode catalog rows for the seed (db/seed.ts): the three pet CSVs from
// tools/catalog_pipeline -> pet_products rows. Each file is optional; a
// missing one just seeds without it. Rows with no pet concern (styptic
// powders, eye washes, anesthetics filed as topical) are skipped: every
// listed pet product sits under at least one PET_CONCERNS page.
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { petProducts } from "./schema";
import { PET_CONCERNS } from "./pet";

type PetRow = typeof petProducts.$inferInsert;
type Actives = PetRow["activesJson"];

const CONCERN_IDS = new Set(PET_CONCERNS.map((c) => c.id));

function readCsv<T>(file: string): T[] | null {
  if (!fs.existsSync(file)) {
    console.log(`  skipping ${path.basename(file)} (not found)`);
    return null;
  }
  return parse(fs.readFileSync(file), { columns: true, skip_empty_lines: true, relax_column_count: true }) as T[];
}

const list = (s: string | undefined) => (s ?? "").split(";").map((x) => x.trim()).filter(Boolean);
const orNull = (s: string | undefined) => (s && s.trim() ? s.trim() : null);

// Label and EPA product names are often all caps ("FIPAIRA FOR CATS");
// mixed-case names are left as written.
export function petDisplayName(raw: string): string {
  const s = raw.replace(/\s+/g, " ").trim();
  if (/[a-z]/.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, pre: string, c: string) => pre + c.toUpperCase());
}

function concernsOf(s: string | undefined): string[] {
  return list(s).filter((c) => CONCERN_IDS.has(c));
}

type DailymedRow = {
  product_ndc: string;
  brand_name: string;
  labeler: string;
  species: string;
  not_for_cats: string;
  concern_ids: string;
  active_ingredients_structured: string;
  ingredients_json: string;
  inactive_ingredient_text: string;
  dosage_form: string;
  route: string;
  marketing_category: string;
  application_number: string;
  regulatory_status: string;
  is_rx: string;
  spl_set_id: string;
  indications: string;
  directions: string;
  warnings: string;
};

function dailymedRows(file: string): PetRow[] {
  const out: PetRow[] = [];
  for (const r of readCsv<DailymedRow>(file) ?? []) {
    const concernIds = concernsOf(r.concern_ids);
    if (!r.product_ndc || concernIds.length === 0) continue;
    let actives: Actives = [];
    try {
      actives = (JSON.parse(r.ingredients_json || "[]") as { name: string; pct: number | null; display: string }[]).map((a) => ({
        name: a.name,
        pct: a.pct ?? null,
        display: a.display || "",
      }));
    } catch {
      actives = [];
    }
    out.push({
      id: r.product_ndc,
      dataSource: "dailymed_animal",
      brandName: petDisplayName(r.brand_name || "(unnamed product)"),
      manufacturer: orNull(r.labeler),
      species: list(r.species),
      notForCats: r.not_for_cats === "1",
      concernId: concernIds[0],
      concernIds,
      regulatoryStatus: r.regulatory_status || "unapproved",
      isRx: r.is_rx === "1",
      dosageForm: orNull(r.dosage_form),
      route: orNull(r.route),
      activeIngredientText: orNull(r.active_ingredients_structured),
      activesJson: actives,
      inactiveIngredientText: orNull(r.inactive_ingredient_text),
      marketingCategory: orNull(r.marketing_category),
      applicationNumber: orNull(r.application_number),
      splSetId: orNull(r.spl_set_id),
      indications: orNull(r.indications),
      directions: orNull(r.directions),
      warnings: orNull(r.warnings),
    });
  }
  return out;
}

// Registrants often register a product under an internal code ("HARTZ
// REFERENCE # 143", "C708.0 (Vectra Cat Plus Tick)") and sell it under
// alternate brand names; the first alternate reads better then.
const CODE_NAME = /#|\bREFERENCE\b|^\s*[A-Z]{1,5}[- ]?\d[\d.]*\b|\b[A-Z]{2,}\d{3,}\b/i;

export function epaDisplayName(productName: string, alternates: string[]): string {
  const alt = alternates.map((a) => a.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim()).find(Boolean);
  return petDisplayName(alt && CODE_NAME.test(productName) ? alt : productName);
}

type EpaRow = {
  epa_reg_no: string;
  product_name: string;
  alternate_brand_names: string;
  company: string;
  species: string;
  pests: string;
  formulation: string;
  signal_word: string;
  active_ingredients_structured: string;
  ingredients_json: string;
  source_url: string;
};

function epaRows(file: string): PetRow[] {
  const out: PetRow[] = [];
  for (const r of readCsv<EpaRow>(file) ?? []) {
    if (!r.epa_reg_no) continue;
    let actives: Actives = [];
    try {
      actives = (JSON.parse(r.ingredients_json || "[]") as { name: string; pct: number | null }[]).map((a) => ({
        name: a.name,
        pct: a.pct ?? null,
        display: a.pct != null ? `${a.pct}%` : "",
      }));
    } catch {
      actives = [];
    }
    out.push({
      id: `epa-${r.epa_reg_no}`,
      dataSource: "epa_pesticide",
      brandName: epaDisplayName(r.product_name || `EPA Reg. No. ${r.epa_reg_no}`, list(r.alternate_brand_names)),
      manufacturer: orNull(r.company) && petDisplayName(r.company),
      species: list(r.species),
      notForCats: false,
      concernId: "pet-fleas-ticks",
      concernIds: ["pet-fleas-ticks"],
      regulatoryStatus: "epa_registered",
      isRx: false,
      dosageForm: orNull(r.formulation),
      activeIngredientText: orNull(r.active_ingredients_structured),
      activesJson: actives,
      // Pesticide labels don't have to list inactives: unknown, not none.
      inactiveIngredientText: null,
      epaRegNo: r.epa_reg_no,
      // Shown only when the registration has other names besides its own.
      alternateNames: list(r.alternate_brand_names).length ? [r.product_name, ...list(r.alternate_brand_names)].map(petDisplayName).join("; ") : null,
      sourceUrl: orNull(r.source_url),
      pests: orNull(r.pests),
      signalWord: orNull(r.signal_word),
    });
  }
  return out;
}

type BrandRow = {
  id: string;
  brand: string;
  product_name: string;
  species: string;
  concern_ids: string;
  epa_reg_no: string;
  active_ingredient_text: string;
  ingredient_text: string;
  not_for_cats: string;
  source_url: string;
  image_url: string;
};

function brandRows(file: string): PetRow[] {
  const out: PetRow[] = [];
  for (const r of readCsv<BrandRow>(file) ?? []) {
    const concernIds = concernsOf(r.concern_ids);
    if (!r.id || concernIds.length === 0) continue;
    out.push({
      id: r.id,
      dataSource: "brand_direct",
      brandName: r.product_name.trim(),
      manufacturer: orNull(r.brand),
      species: list(r.species),
      notForCats: r.not_for_cats === "1",
      concernId: concernIds[0],
      concernIds,
      regulatoryStatus: r.epa_reg_no ? "epa_registered" : "brand_listing",
      isRx: false,
      activeIngredientText: orNull(r.active_ingredient_text),
      activesJson: [],
      inactiveIngredientText: orNull(r.ingredient_text),
      epaRegNo: orNull(r.epa_reg_no),
      sourceUrl: orNull(r.source_url),
      imageUrl: orNull(r.image_url),
    });
  }
  return out;
}

/** Every pet row, first id wins (DailyMed, then EPA, then brand sites). */
export function petCatalogRows(outputDir: string): PetRow[] {
  const seen = new Set<string>();
  const rows: PetRow[] = [];
  const counts: Record<string, number> = {};
  for (const [source, batch] of [
    ["dailymed_animal", dailymedRows(path.join(outputDir, "pet_catalog.csv"))],
    ["epa_pesticide", epaRows(path.join(outputDir, "pet_epa_catalog.csv"))],
    ["brand_direct", brandRows(path.join(outputDir, "pet_brand_catalog.csv"))],
  ] as const) {
    for (const r of batch) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      rows.push(r);
      counts[source] = (counts[source] ?? 0) + 1;
    }
  }
  console.log(`  ${rows.length} pet products ${JSON.stringify(counts)}`);
  return rows;
}
