# Skin Concern → Active Ingredient → OTC Product Recommender
**Project brief — compiled for Claude Code handoff**
**Owner:** Michael (board-certified Mohs surgeon/dermatologist, TassDerm LLC / MDCS Dermatology, NYC)
**Status:** Pre-build, planning complete, competitive research in progress

---

## 1. Concept

A patient-facing tool that maps self-reported skin concerns to evidence-graded
active ingredients to specific OTC products, monetized via affiliate links
and (later) B2B licensing and premium content. Explicitly designed to stay
on the non-medical-practice side of the line: education and product
matching, not diagnosis or individualized treatment.

**Core differentiator vs. the market:** every existing tool (SkinSort,
Skincarisma, CosDNA, brand AI scanners) runs on heuristic ingredient-list
scoring with no clinical authority behind it. This product's wedge is a
**board-certified-dermatologist-verified scoring layer** — a "critic score"
from a verified derm panel alongside the "audience score" from real user
outcomes — plus a monograph-grounded OTC drug data foundation that's exact
and free to source (see §5).

---

## 2. Legal / regulatory framework

*Not legal advice — have a healthcare regulatory attorney review before
launch.*

**Practice of medicine risk**
- Stay in "self-selected concern → education → products," never infer a
  diagnosis from symptoms or photos.
- No photo/lesion analysis, especially anything touching skin cancer.
- Physician branding raises implied-relationship risk — use clear ToS
  disclaiming any doctor-patient relationship, and avoid personalized
  "Dr. Michael recommends *for you*" language.

**FDA**
- Patient-facing software that diagnoses or recommends treatment can be a
  regulated device (SaMD). The Cures Act clinical-decision-support
  exemption covers clinician-facing tools only, not this.
- Stay within OTC monograph actives/uses (acne, sunscreen, skin protectant,
  antifungal, etc.) and cosmetic concerns.

**FTC**
- Clear, conspicuous affiliate disclosures next to links, not footer-buried.
- Efficacy claims need competent/reliable scientific evidence (2022 FTC
  Health Products Compliance Guidance).
- Disclose material connections (sponsor payments, speaker-circuit ties —
  e.g. LEO Pharma, Castle Biosciences — if those companies' products ever
  appear).
- 2024 fake-review rule applies if hosting user reviews.
- Paying derm raters is fine only if disclosed and never sentiment-contingent.

**Cosmetic vs. drug claims**
- Site copy can turn a cosmetic into an unapproved drug ("this moisturizer
  treats eczema"). Describe cosmetics cosmetically; describe OTC drugs per
  their monograph.

**Privacy**
- HIPAA likely doesn't apply, but does:
  - FTC Health Breach Notification Rule (health apps)
  - WA My Health My Data Act, plus NV/CT equivalents
  - IL BIPA (face scans) — another reason to skip selfie/photo features
- Minimize data collection; no selfies at launch.

**Business structure**
- Separate LLC from TassDerm; don't sell/push inside the clinic.
- Check malpractice carrier; add media + E&O liability coverage.
- Check media contributor contracts (CNN Underscored, Wirecutter) for
  competing-business or disclosure clauses before launch.

**Review-panel-specific legal notes**
- Verify board certification (ABD/AOBD) and NPI before any derm can rate.
- Pull CMS Open Payments per rater automatically; recuse from products made
  by companies that pay them (applies to Michael too, re: LEO Pharma).
- Score by concern, not a single global score.
- Don't scrape retailer reviews (Sephora/Ulta) for the "audience" side —
  ToS violation, copyright risk. Build audience data from first-party
  routine logging instead.
- Commissioned/paid ratings are the site's own content — weak Section 230
  protection. Tie every low score to rubric criteria with cited evidence,
  not raw opinion, to limit disparagement exposure.

---

## 3. Compliant product design

1. **Inputs:** concern, skin type, sensitivities, budget, preferences
   (fragrance-free, pregnancy-conscious as a caution filter, not advice).
2. **Red-flag gate before any recommendation:** changing/bleeding lesion,
   rapid spread, pain/fever, eye involvement, no response after 8–12 weeks
   → route to "see a board-certified dermatologist." Reduces liability,
   doubles as referral funnel.
3. **Rules engine:** concern → evidence-graded actives (concentration,
   vehicle) → contraindication/interaction flags → products.
4. **Derm score + audience score, per concern**, not a single blended
   number (see §4).
5. **Output:** educational routine template, "why this active" explainer,
   disclosed affiliate links.

---

## 4. Competitive analysis — SkinSort (primary competitor)

**Founded** 2020, bootstrapped, no outside funding. Founders: Genne Liu
(data/research) and Jacob Laboissonniere (engineering). No board-certified
dermatologist or medical advisory board found publicly on their team page.

**Revenue model**
- Affiliate commissions (primary, stated on product pages).
- Premium app subscription ($7.99–$59.99 IAP range on iOS; reported ~$6/wk
  on the low end).
- No brand sponsorships or ads found — positioning is "proudly independent,
  never takes brand money," which is core to their trust story.

**Moat**
- **Not** their ingredient logic (comedogenicity flags, dupe-finding via
  embeddings) — that's replicable.
- **Is** database breadth (200k+ products), programmatic SEO (product,
  dupe, and comparison pages ranking for high-intent long-tail queries),
  and a user-generated-content flywheel (submissions, reviews, routines)
  that keeps data fresh at near-zero marginal cost.

**Social presence**
- Instagram: small (~2.8k followers, 69 posts) — not a real channel.
- TikTok: no owned dominant account found — reach comes from organic user
  "glow-up" testimonials, a #skinsortpartner paid-creator tag, and some
  public criticism of their ingredient claims.
- Growth engine = SEO + word of mouth, not paid/owned social. No dominant
  channel to out-compete head-on.

**App store standing:** 4.74★ / 6,252 ratings on iOS (id `6478040418`,
verified via App Store search API 2026-09-27 — higher than the ~4.2k
originally estimated). Genuinely well-liked overall; don't underestimate
them.

### Complaint themes (manual pass — confirm with the mining script in §6)

| Complaint | Frequency | Severity | Still unsolved? |
|---|---|---|---|
| Personalized match score doesn't predict real-world results | Medium | **High** (breaks core promise) | Yes — structural, their own help docs admit it's "only so much we can infer from ingredient lists" |
| Aggressive paywall (3-day trial → ~$6/wk, hard-to-close upsell modal, scan limits) | **High** | Medium | Yes — it's their revenue model |
| Routine logic contradicts itself (flags a conflict, then still suggests combining) | Low–medium | Medium | Partly |
| Avoided ingredients still recommended (dev-acknowledged in App Store responses) | Low | Medium–high | Unclear |
| Bugs / blank pages / slow app | Medium | Low–medium | Ongoing |
| No seasonal/climate/location context in recommendations | Low | Low | Yes, but low-priority wedge |
| Ingredient-claim accuracy disputed publicly (TikTok critics) | Low volume, high visibility | **High** (trust) | Yes |

**Positioning line this supports:** *"Scores from board-certified
dermatologists, not guesses from an ingredient list. Core features free."*
— hits their highest-severity gap (score validity) and highest-frequency
gap (paywall) simultaneously, and neither is fixable for them without
abandoning their business model.

### Real complaint-mining run (2026-09-27, partial — see caveats)

Ran `tools/complaint_mining/mine_complaints.py` against SkinSort. Only
Google Play yielded data — see
[tools/complaint_mining/README.md](tools/complaint_mining/README.md#known-source-status-as-of-2026-09-27-live-run-against-skinsort)
for why App Store RSS (dead feed, Apple-side) and Reddit (server-IP login
wall) didn't. Of 172 scraped Play reviews (the practical ceiling of
`google-play-scraper`'s unauthenticated pagination, not a filter we chose):

| Theme | Count | % of 172 | Avg rating |
|---|---|---|---|
| Aggressive paywall / subscription | 12 | 7.0% | 1.58★ |
| Bugs / blank pages / slow app | 3 | 1.7% | 1.0★ |
| Other / uncategorized (mostly 5★ praise) | 157 | 91.3% | 4.39★ |

No Play reviews matched score-validity, contradictory-routine,
avoided-ingredient, no-context, or ingredient-claim-accuracy — those may be
more of an App-Store/Reddit/TikTok phenomenon (matches the original manual
read, which sourced the trust/accuracy complaints from TikTok, not app
stores), or may just not show up in written Play reviews. **Treat this as
directional, not a replacement for the manual table**: n=172 from one
source only. Paywall is the one theme with real, high-confidence backing
so far — 12/172 (7%) skewing to 1★, i.e. it's overwhelmingly the reason for
a bad rating when it comes up at all. Full raw data:
[tools/complaint_mining/output/](tools/complaint_mining/output/).

**Adjacent competitor spotted during research:** HadaBuddy — already
publishing "vs. SkinSort" comparison content, confirming the
"SkinSort alternative" SEO keyword space is contested.

---

## 5. Differentiator deep-dive: derm-verified critic/audience score

**Why it's defensible:** structural, not just editorial — hard for
SkinSort to copy without abandoning their "no medical staff" positioning,
and hard for a brand to fake without being caught on disclosure.

**Design**
- Verified panel only: confirm ABD/AOBD board certification + NPI before
  a dermatologist can submit a rating.
- Per-rater conflict disclosure pulled from CMS Open Payments automatically;
  recuse raters from products by companies paying them.
- Score per concern (e.g. "Derm Score for acne-prone skin: 82"), never one
  global number.
- Structured rubric, not stars: evidence for the claimed benefit,
  formulation quality (concentration/vehicle/stability/packaging),
  irritation risk, value.
- Minimum rater count (e.g. 5+) before a score displays publicly; show the
  rater count.
- Audience side = **outcome score** (% reporting improvement at 8 weeks via
  first-party routine logging), not scraped stars — more defensible, and
  it's the proprietary data-moat asset for later B2B licensing.

**Cold start**
- Seed panel: Michael + 5–10 dermatologist colleagues rate the top
  150–200 products in the launch niche (~10 min/product, ~30 hrs/derm).
- Incentives: honorarium, advisory equity pool, and/or a public rater
  profile linking to their practice (free marketing for them).
- Launch hook: "The first derm-verified scores for [niche], with N
  board-certified raters" — a ready-made pitch for the media outlets
  Michael already contributes to, once conflict-of-interest and contract
  review is clear.

---

## 6. Data sourcing plan

| Layer | Source | Cost | Notes |
|---|---|---|---|
| **OTC drug product catalog** (names, labeler, exact active %, full inactive-ingredient list, images, dosage form) | **openFDA** (NDC + drug-label endpoints) / **DailyMed** | Free | Covers sunscreens, acne washes/treatments, skin protectants, hydrocortisone, antifungals, dandruff/seb-derm shampoos, colloidal-oatmeal eczema creams. More of a typical skincare catalog is "drug" than assumed — **this alone can carry an MVP launch niche.** Expect dupes, discontinued SKUs, inconsistent naming; not FDA-verified for accuracy, just listing data. |
| **OTC monograph rules** | FDA OTC monographs (acne, sunscreen, skin protectant, antifungal) | Free | Defines allowed actives/concentrations/claims — also the claim-compliance guardrail |
| **Cosmetic product catalog** (serums, non-monograph moisturizers/cleansers) | Open Beauty Facts | Free (ODbL — share-alike; keep derived scores/data in a separate DB) | Weak US coverage — supplement with brand-submitted data + user label-photo OCR |
| **Retail price/image/buy-link** | Affiliate network feeds (Rakuten, Impact, CJ, Awin, Amazon PA API) | Free w/ approval | **Targeting decided 2026-09-27**, see [tools/affiliate_feeds/README.md](tools/affiliate_feeds/README.md#which-network-to-actually-target): apply to **Impact** (Target, Walmart, CVS, Ulta) and **CJ Affiliate** (Walgreens, Neutrogena brand-direct at 4–8%) first — both free, together cover most of where this catalog's products are actually sold. Amazon deprioritized (1% health/personal-care commission, needs ongoing qualifying sales to keep access). No account approved yet — the pipeline has adapters for all three (Awin/CJ/Impact) plus a matching pipeline validated against synthetic mock feeds, ready to point at a real feed once one exists. |
| **Barcode matching** | ~~Drug NDC↔UPC mapping~~ — **not reliable, corrected 2026-09-27** | Free | The NDC→UPC numeric conversion is a pharmacy point-of-sale convention for relabeled prescriptions, not how retail OTC products' manufacturer-assigned UPCs work — there's no mathematical link to join on. Real mechanism: fuzzy title/brand text matching with an active-ingredient cross-check + a manual-review tier for low-confidence matches, see [tools/affiliate_feeds/README.md](tools/affiliate_feeds/README.md). |
| **Ingredient function/restrictions** | EU CosIng | Free | |
| **Chemistry/identifiers** | PubChem API | Free | |
| **Safety assessments** | Cosmetic Ingredient Review (CIR) | Free | |
| **Contact allergens** | ACDS CAMP (members-only — Michael's credential likely qualifies; verify commercial-use terms), SkinSAFE (Mayo-derived, licensing target) | Varies | |
| **Comedogenicity** | Legacy rabbit-ear data | Free | Low-confidence — label it as such, don't repeat SkinSort's implied-precision mistake |
| **Cosmetic concentrations** | Brand-stated marketing %, INCI descending-order inference (reliable only above ~1% threshold), direct brand outreach | Free/manual | Label confidence: disclosed / estimated / unknown |
| **Evidence base** | PubMed E-utilities, Europe PMC, ClinicalTrials.gov API, Semantic Scholar (free); Cochrane reviews, AAD/JAAD guidelines (cite/link, don't reproduce) | Free | Claude drafts summaries per active × concern; Michael verifies |
| **Panel verification** | NPPES NPI API (free), ABD/AOBD lookup (manual at this scale; ABMS bulk API is paid), CMS Open Payments API (free) | Free/manual | |
| **SEO/demand research** | Google Search Console + Trends (free), Ahrefs/Semrush (paid) | ~$130–250/mo | Includes reverse-engineering which SkinSort pages already rank |

**MVP build order:**
1. openFDA/DailyMed → complete OTC drug catalog for the launch niche (exact
   data, day one, zero scraping). **Step 1 done 2026-09-27** for acne+sun —
   [tools/catalog_pipeline/README.md](tools/catalog_pipeline/README.md):
   6,674 products (841 acne, 5,833 sunscreen) with brand, exact
   active-ingredient strength, and dosage form. Caveat: openFDA's own
   label→NDC linkage only resolves ~33% of the full label universe
   (13,719 records logged unmatched but not lost — see the README for why
   and what's needed to close that gap).
2. Affiliate feeds → prices/links/images. **Pipeline built 2026-09-27**
   ([tools/affiliate_feeds/](tools/affiliate_feeds/)), validated against
   synthetic mock feeds (9/9 products matched correctly across 2 networks)
   — real feeds still need an approved affiliate account.
3. Top 200–500 cosmetic INCI lists for the niche (brand sites + OCR
   cleanup).
4. Join CosIng/PubChem/allergen data onto the catalog.
5. PubMed-driven evidence tables.
6. User submissions for long-tail coverage (later).

**Suggested launch niche (data-driven choice):** acne + sun protection, or
eczema/barrier + seb derm — both have near-complete openFDA/DailyMed
coverage, meaning launch is possible almost entirely on free, exact,
federally sourced data with a clean regulatory story (monograph claims
only, no scraping).

---

## 7. Competitive complaint-mining tooling

A script (`mine_complaints.py`, included in this handoff) pulls App Store
reviews (RSS feed), Google Play reviews (`google-play-scraper`), and
Reddit posts/comments (public search JSON) mentioning SkinSort, and
classifies each into 8 complaint themes with a severity flag, outputting
`complaints_raw.csv` and a ranked `complaints_summary.csv`.

**Must run locally** — Claude's sandboxed environment only has network
egress to package registries (pypi/npm/github/etc.), not to
reddit.com/apple.com/play.google.com. Setup is 3 `pip install`s; full
README with scaling notes (PRAW for Reddit volume, TikTok options) is
included alongside the script.

Once run, `complaints_summary.csv` should be fed back into the theme
table in §4 to replace manual estimates with real frequency counts.

---

## 8. Implementation plan (solo + Claude/Claude Code)

Assumes ~8–10 hrs/week from Michael; Claude Code writes code and drafts
content, Michael authors/verifies clinical logic.

| Phase | Weeks | Deliverables | Hours |
|---|---|---|---|
| 0. Foundation | 1–4 | Separate LLC, attorney review, media-contract/disclosure check, niche selection, brand/domain | 15–25 |
| 1. Evidence engine | 3–10 | Grading table (30–40 actives × 10–12 concerns): evidence grade, concentration, vehicle; contraindication/interaction rules; red-flag gate | 40–60 |
| 2. Data pipeline | 6–14 | openFDA/DailyMed + Open Beauty Facts + CosIng ingest, INCI normalization, active mapping, affiliate feed integration | 30–50 |
| 3. MVP web app | 10–18 | Concern quiz → routine builder, programmatic SEO templates, disclosures/ToS, analytics | 40–60 |
| 4. Content + launch | 16–24 | 200–500 physician-reviewed concern×active×skin-type pages (~5–10 min review each) | 30–80 |
| 5. Growth | Months 6–12 | Media distribution, outcome logging, email list, premium tier | ~5/wk |
| 6. Expansion | Year 2 | B2B licensing, mobile app, telederm referral partner | Variable |

**Year 1 total: ~300–450 hours.**

---

## 9. Costs

| Item | One-time | Monthly |
|---|---|---|
| Healthcare regulatory attorney | $5–15k | — |
| NY LLC formation (incl. NYC publication requirement) | $1–2k | — |
| Media/E&O liability insurance | — | ~$100–250 |
| Hosting + DB (Vercel/Cloudflare + Supabase/Neon) | — | $50–150 |
| Claude plan + API for content generation | — | $150–400 |
| SEO tooling (Ahrefs/Semrush) | — | $130–250 |
| Brand/design | $0–2k | — |
| **Total** | **$6–19k** | **~$450–1,050** |

**Year 1 cash outlay: ~$12–32k** (mostly legal). No hires until revenue
justifies it — first hire would be a part-time data/SEO contractor in
year 2.

---

## 10. Revenue model & profit scenarios

**Affiliate revenue per 1,000 sessions** (assumptions, adjust freely):
CTR to retailer 12%, purchase conversion 7%, AOV $45, blended commission
6% → **~$15–30 per 1,000 sessions.**

**Other streams:** premium tier (0.3–0.5% of MAU at ~$5/mo); B2B licensing
of the evidence engine, $25–100k/contract/year starting year 2.

| Scenario | Sessions/mo @ month 12 | Yr 1 revenue | Yr 2 | Yr 3 |
|---|---|---|---|---|
| Conservative | 10k | $2–5k | $15–30k | $40–80k |
| Base | 30k | $8–15k | $50–100k | $150–250k |
| Upside (media + B2B) | 100k+ | $25k+ | $200k+ | $500k–1M |

**Honest read:** ~400 hrs at Michael's clinical rate is ~$200–400k
opportunity cost; pure affiliate revenue doesn't clear that until year 3
even in the base case. The business case is the **asset**, not the
affiliate income: the B2B evidence engine, the outcomes data, an eventual
telederm referral funnel, and a possible exit.

**Top risks:** Google AI Overviews cutting health/product-query clicks;
retailers cutting affiliate rates (Amazon did this to beauty in 2020);
search engines' stricter treatment of health content (physician
authorship partly offsets this); media-contract conflicts.

**Kill criteria (month 9):** if organic traffic < 10k sessions/mo and no
B2B conversations have started, stop the consumer side and pivot to
directly licensing the evidence engine.

---

## 11. Open decisions before build starts

- [x] openFDA data-completeness half of the launch-niche decision — run
      2026-09-27, see [tools/niche_analysis/README.md](tools/niche_analysis/README.md).
      **Finding:** acne+sun is the lower-friction MVP niche on data grounds —
      both "Acne treatment" and "Sunscreen" are precisely-defined FDA
      monograph purpose categories (20 + 90 distinct substances, close to
      Phase 1's 30–40-active target), while eczema/seb-derm's biggest
      bucket ("Skin protectant") is shared with diaper-rash cream, lip
      balm, and combo sunscreens and needs real filtering work before
      Phase 2 can start cleanly.
- [ ] Confirm launch niche — still needs the SkinSort SEO gap analysis
      (Ahrefs/Semrush, not run) and your own market/interest judgment
      before the openFDA finding above becomes a final pick
- [ ] Attorney review of the whole structure (LLC, ToS, claims review)
- [ ] Media contract review (CNN Underscored, Wirecutter) for
      competing-business clauses
- [x] Ran `mine_complaints.py` against SkinSort 2026-09-27 — partial
      (Google Play only; App Store RSS dead, Reddit blocked from server
      IPs). See §4 "Real complaint-mining run" and
      [tools/complaint_mining/README.md](tools/complaint_mining/README.md).
- [ ] Recruit 5–10 dermatologist colleagues for the seed rating panel
- [ ] Decide on domain/brand name (Antigravity brand was floated
      elsewhere but not settled for this specific product)
- [ ] **Phase 1 evidence engine schema** — deferred 2026-09-27 in favor of
      Phase 2 affiliate feed integration (build order step 2, on the
      6,674-product acne+sun catalog from
      [tools/catalog_pipeline/](tools/catalog_pipeline/)). Pick this up
      once feeds are wired: the active×concern grading table (evidence
      grade, concentration, vehicle, contraindication/interaction rules,
      red-flag gate) — structure can be built ahead of the clinical
      content, which you author/verify.
- [ ] **Apply to Impact and CJ Affiliate** — the two networks worth
      targeting first per the research in
      [tools/affiliate_feeds/README.md](tools/affiliate_feeds/README.md#which-network-to-actually-target)
      (Target/Walmart/CVS/Ulta via Impact, Walgreens + Neutrogena
      brand-direct via CJ). This needs your own site/business info to
      apply — not something to do from here.
