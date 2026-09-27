# niche_completeness.py

Resolves half of `project.md` §11's open decision #1 (launch niche) with real
openFDA data: acne+sun protection vs. eczema/barrier+seb-derm. (The other
half — SkinSort SEO gap analysis — needs paid tooling, Ahrefs/Semrush, not
done here.)

No dependencies beyond the standard library — uses `urllib` directly, no
API key needed for a one-off pull like this.

```bash
python3 niche_completeness.py
```

Writes `output/niche_completeness.json`.

## Findings (run 2026-09-27)

| Purpose (FDA monograph category) | Labels | Distinct brands | Distinct substances |
|---|---|---|---|
| Acne treatment | 2,390 | 781 | 20 |
| Sunscreen | 18,091 | 1,000+ (capped) | 90 |
| Skin protectant | 5,489 | 1,000+ (capped) | 119 |
| Anti-itch | 889 | 276 | 28 |
| Antidandruff | 194 | 58 | 5 |

**Acne+sun totals:** 20,481 labels / 1,781+ brands / 110 substances.
**Eczema/seb-derm totals:** 6,572 labels / 1,334+ brands / 152 substances.

### The catch: "Skin protectant" is not an eczema-specific bucket

Sampling `openfda.substance_name` under the "Skin protectant" purpose shows
it's shared by colloidal-oatmeal eczema creams *and* diaper-rash cream,
petroleum jelly, lip balm, and combo sunscreen-moisturizers (avobenzone,
octisalate, and octinoxate all show up as "skin protectant" substances,
because they're doubling as sunscreen actives in a moisturizer). Eczema's
actual defining actives — oatmeal, ceramide-adjacent, ~colloidal oatmeal —
are one slice of a much broader monograph category, not most of it.

A supplementary full-text search on `indications_and_usage` for
"eczema"/"seborrheic dermatitis"/"dandruff" (deduped) gives a cleaner
same-methodology comparison:

| Niche | Indication-text labels | Distinct brands |
|---|---|---|
| Acne (text: "acne") | 5,257 | 1,000+ (capped) |
| Eczema+seb-derm+dandruff (deduped) | 4,663 | 1,000+ (capped) |

Both niches clear 1,000+ distinct brands on a broad text search — brand
count alone doesn't discriminate at that resolution. The purpose-field
numbers are the more decision-relevant signal because they map directly to
what Phase 1 needs to build (a graded table of *actives*, not a brand
count).

## Read for the niche decision

**Acne + sun protection** has the cleaner data story:
- Both "Acne treatment" and "Sunscreen" are precisely-defined FDA monograph
  purpose categories — no post-hoc filtering needed to separate signal
  from noise, unlike "Skin protectant."
- Combined substance count (110, though "Sunscreen"'s 90 is inflated by
  combo-product substance-name strings — there are only ~17 FDA-approved
  sunscreen active UV filters in reality) plus acne's 20 lands close to
  Phase 1's target of "30–40 actives" — almost exactly scoped for the
  evidence-grading table without needing to cut anything.
- Sunscreen alone is a massive, well-established catalog (18k labels) —
  low risk of thin coverage at launch.

**Eczema/barrier + seb-derm** has real substance diversity (152, and
genuinely richer once "Skin protectant" is properly filtered down) but
requires real data-cleaning work before Phase 2 can start: isolating
eczema-relevant "Skin protectant" entries from the diaper-rash/lip-balm/
sunscreen noise sharing that bucket. That's solvable (INCI/indication-text
filtering) but is scope Phase 2 doesn't currently budget for.

**Net:** on data-completeness grounds alone, acne+sun is the lower-friction
MVP niche — the FDA taxonomy already does the categorization work. This
doesn't account for market size, SkinSort's existing SEO footprint in each
niche, or personal clinical interest — those still need the SEO gap
analysis and your own judgment call.
