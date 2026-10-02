# To do

## Clinical and science review

- [ ] **Confirm every clinical/science statement on the site with OpenEvidence.** Run each claim through OpenEvidence and record the result (confirmed / corrected / removed, with the citation it returned) before it's treated as final. Covers, at least:
  - Active summaries and typical concentrations: `app/src/db/actives.ts` (`summary`, `typicalConcentrationText`), shown on ingredient pages via `evidence_notes`
  - FDA monograph ranges and CFR citations: `app/src/db/monograph-ranges.ts`
  - Drafted usage guidance (per active and per formulation): `app/src/db/usage-guidance.ts` — also under dermatologist review (`review/usage-guidance-review.pdf`); nothing there is public until `reviewed: true`
  - Interaction cautions shown on the shelf, routines and regimen: `app/src/lib/routine-conflicts.ts` (e.g. the retinoid + benzoyl peroxide note mentions tretinoin breakdown but is shown for adapalene too)
  - Default morning/night slot reasons: `app/src/lib/regimen.ts` (`suggestSlot`)
  - Ingredient flags, allergen and "free-from" definitions: `app/src/db/ingredient-flags.ts`
  - Patch-test series and allergen content (T.R.U.E. / ACDS core): `app/src/lib/avoid-import.ts`
  - Red-flag "see a dermatologist first" criteria: `app/src/components/red-flag-banner.tsx`
  - Concern descriptions and the About & methodology page: `CONCERN_DEFINITIONS` in `app/src/db/actives.ts`, `app/src/app/about/page.tsx`
  - Product-page copy that states facts about strength ranges, EWG scores or label status

  Added 2026-10-02.
