// Prescribe-safe finder: which topical prescription products have a vehicle
// (and active) free of a patient's contact allergens. Pure (no DB): the page
// (app/clinic-tools/vehicle-finder) loads the rows from rx_vehicles and
// passes them in. Label facts for a clinician's judgment, never a
// recommendation: a label can change, and an unlisted trace isn't excluded.
import { avoidConflicts } from "@/lib/avoid-shared";
import { allergenLabel } from "@/db/contact-allergens";
import { getFreeFromCheck } from "@/db/ingredient-flags";

export type VehicleRow = {
  id: string;
  brandName: string;
  labeler: string | null;
  genericName: string;
  strengthText: string | null;
  dosageForm: string | null;
  rxGroup: string | null;
  potency: number | null;
  /** Display name: generic, strength, form. */
  display: string;
  /** Inactive ingredients in label order. */
  names: string[];
  /** Allergen ids in the vehicle and the active ingredients. */
  hits: string[];
  freeFromFlags: string[];
};

export type VehicleFilters = { group?: string; potency?: number; form?: string };

export type FinderGroup = {
  key: string;
  display: string;
  rxGroup: string | null;
  potency: number | null;
  dosageForm: string | null;
  clean: VehicleRow[];
  blocked: { row: VehicleRow; conflicts: string[]; mayContain: string[] }[];
};

export type FinderResult = { groups: FinderGroup[]; cleanGroups: number; labels: number; cleanLabels: number };

function idName(id: string): string {
  const check = getFreeFromCheck(id);
  if (check) return check.avoidName ?? check.label.replace(/-free$/i, "").toLowerCase();
  return allergenLabel(id) ?? id;
}

/** The form word a finder filter matches ("CREAM" and "CREAM, AUGMENTED" are both cream). */
export function formWord(dosageForm: string | null): string {
  const f = (dosageForm ?? "").toLowerCase().replace(/^aerosol, /, "");
  return f.split(/[ ,]/)[0] || "other";
}

export function findVehicles(rows: VehicleRow[], avoidIds: string[], filters: VehicleFilters = {}): FinderResult {
  const byKey = new Map<string, FinderGroup>();
  let labels = 0;
  let cleanLabels = 0;
  for (const row of rows) {
    if (filters.group && row.rxGroup !== filters.group) continue;
    if (filters.potency && row.potency !== filters.potency) continue;
    if (filters.form && formWord(row.dosageForm) !== filters.form) continue;
    labels++;
    const key = row.display.toLowerCase();
    let g = byKey.get(key);
    if (!g) {
      g = { key, display: row.display, rxGroup: row.rxGroup, potency: row.potency, dosageForm: row.dosageForm, clean: [], blocked: [] };
      byKey.set(key, g);
    }
    const found = avoidConflicts({ freeFromFlags: row.freeFromFlags, allergenHits: row.hits }, avoidIds);
    const conflicts = found?.conflicts ?? [];
    const possible = found?.possible ?? [];
    if (conflicts.length === 0 && possible.length === 0) {
      g.clean.push(row);
      cleanLabels++;
    } else {
      g.blocked.push({ row, conflicts: conflicts.map(idName), mayContain: possible.map(idName) });
    }
  }
  const groups = [...byKey.values()].sort(
    (a, b) =>
      Number(b.clean.length > 0) - Number(a.clean.length > 0) ||
      (a.potency ?? 9) - (b.potency ?? 9) ||
      a.display.localeCompare(b.display),
  );
  for (const g of groups) {
    g.clean.sort((a, b) => a.brandName.localeCompare(b.brandName));
    g.blocked.sort((a, b) => a.conflicts.length - b.conflicts.length || a.row.brandName.localeCompare(b.row.brandName));
  }
  return { groups, cleanGroups: groups.filter((g) => g.clean.length > 0).length, labels, cleanLabels };
}

/** One plain-text chart line for a clean label. */
export function vehicleChartNote(row: VehicleRow, avoidNames: string[], asOf: string): string {
  const who = [row.brandName, row.labeler].filter(Boolean).join(", ");
  return `Vehicle check (label data, ${asOf}): ${row.display} (${who}; NDC ${row.id}) lists none of: ${avoidNames.join(", ")}.`;
}
