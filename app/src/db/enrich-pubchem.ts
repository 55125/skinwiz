// Populates active_chem_data with a PubChem CID + molecular formula per
// active, via PubChem's free, no-auth PUG REST API. Opt-in and manual --
// not run automatically, since this is enrichment metadata, not reference
// data that needs to exist before the app can function.
//
// Deliberately doesn't pull PubChem's "Record Description" text (PUG
// View) -- that's someone else's written prose, often toxicology-report
// register, and importing it wholesale into an evidence note would bypass
// the same clinician-review posture the rest of this file respects. What's
// stored here is purely structural (a compound id, a formula) -- factual,
// not editorial, so it needs no review gate.
//
// Real, accepted coverage gap: botanical extracts (centella asiatica) and
// polymers/macromolecules (sodium hyaluronate) aren't indexed as single
// PubChem compounds, so they resolve to nothing here -- not a bug, and not
// something a synonym retry fixes. Confirmed by testing before building
// this: 4/7 sampled actives resolved cleanly (Zinc Oxide, Adapalene,
// Benzoyl Peroxide, Pyrithione Zinc), 3/7 correctly found nothing
// (Sodium Hyaluronate, Centella Asiatica, Cocamidopropyl Betaine).
import { db } from "./client";
import { activeChemData } from "./schema";
import { ACTIVE_DEFINITIONS } from "./actives";

const SLEEP_MS = 300; // PubChem asks for <=5 req/s; this is well under that

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function lookupCid(name: string): Promise<{ cid: number; molecularFormula: string | null } | null> {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/MolecularFormula/JSON`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PubChem ${res.status} for "${name}"`);
  const data = await res.json();
  const prop = data?.PropertyTable?.Properties?.[0];
  if (!prop?.CID) return null;
  return { cid: prop.CID, molecularFormula: prop.MolecularFormula ?? null };
}

async function main() {
  const alreadyDone = new Set(db.select({ activeId: activeChemData.activeId }).from(activeChemData).all().map((r) => r.activeId));

  let resolved = 0;
  let notFound = 0;
  let skipped = 0;

  for (const active of ACTIVE_DEFINITIONS) {
    if (alreadyDone.has(active.id)) {
      skipped++;
      continue;
    }

    // Try the canonical name first, then each synonym -- some canonical
    // names are a family label ("Aluminum Zirconium Complexes") that isn't
    // itself a single compound, but a specific synonym might resolve.
    const candidates = [active.canonicalName, ...active.synonyms];
    let found: { cid: number; molecularFormula: string | null } | null = null;
    for (const candidate of candidates) {
      try {
        found = await lookupCid(candidate);
      } catch (err) {
        console.error(`  ${active.id}: ${err instanceof Error ? err.message : err}`);
      }
      await sleep(SLEEP_MS);
      if (found) break;
    }

    if (found) {
      db.insert(activeChemData)
        .values({ activeId: active.id, pubchemCid: found.cid, molecularFormula: found.molecularFormula })
        .onConflictDoUpdate({ target: activeChemData.activeId, set: { pubchemCid: found.cid, molecularFormula: found.molecularFormula } })
        .run();
      resolved++;
      console.log(`  ${active.id}: CID ${found.cid} (${found.molecularFormula ?? "no formula"})`);
    } else {
      notFound++;
      console.log(`  ${active.id}: no PubChem match (likely a botanical/polymer/blend, not a single compound)`);
    }
  }

  console.log(`\nDone. ${resolved} resolved, ${notFound} not found, ${skipped} already cached.`);
}

main();
