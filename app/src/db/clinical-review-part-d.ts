// Part D of review/clinical-content-review.html: the clinical calls made
// during the October 2026 persona testing (PRs #5-#8). Unlike Parts A and B
// these are live on the site now, not behind a flag; Michael asked to review
// them in place. Rule text comes from the same constants the site uses
// wherever they are data; the rest is hand-kept and says where it lives.
import Database from "better-sqlite3";
import { POTENT_RETINOIDS, RETINYL_ESTERS } from "../lib/retinoids";
import { CLASS_IDS, CLASS_LABEL, RULES as CAUTIONS } from "../lib/routine-conflicts";
import {
  DIAPER_RE,
  ECZEMA_EXCLUDED_ACTIVES,
  ECZEMA_EXCLUDED_TEXT,
  MAKEUP_RE,
  SUNSCREEN_ACTIVES,
  aboveMonograph,
  concernTier,
  excludedFromConcern,
} from "../lib/listing-rules";
import { SENSITIVE_SKIN_FREE } from "../lib/profile-shared";
import { mainlyOffLabel } from "./patch-test-series";
import { RX_RETINOID_GUIDE as G } from "./rx-retinoid-guide";
import { SEARCH_HINTS } from "../lib/search-hint-copy";
import { ALL_HANDOUT_TEMPLATES } from "./handout-templates";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BOX = `<td class="box">☐ Approve<br>☐ Edit<br>☐ Cut</td>`;
const list = (ids: string[]) => ids.map((i) => `<code>${esc(i)}</code>`).join(" ");
// A word-list regex (/\b(a|b ?c)\b/) as the plain words it matches.
const words = (r: RegExp) =>
  (r.source.match(/\((.*)\)/)?.[1] ?? r.source)
    .split("|")
    .map((w) => w.replace(/\[bc\]c/, "BB/CC").replace(/colou\?r/, "colour").replace(/-\?/g, "").replace(/ \?/g, " ").replace(/[\\?()]/g, ""))
    .join(", ");
const re = (r: RegExp) => `<i>${esc(words(r))}</i>`;

type Counts = { eczemaExcluded: number; aboveMonograph: number; aboveExamples: string[]; eczemaLower: number; sunTiers: [number, number, number] } | null;

// How many listed products each rule touches today (local catalog copy).
function counts(dbPath: string): Counts {
  let db: Database.Database;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  } catch {
    return null;
  }
  const rows = db
    .prepare(
      `SELECT p.concern_id AS concernId, p.brand_name AS brandName, p.active_ids AS activeIds, p.active_ingredient_text AS activeIngredientText,
        p.dosage_form AS dosageForm, p.strengths, l.spl_set_id IS NOT NULL AS hasLabel,
        (l.directions LIKE '%sun protection measures%' OR l.warnings LIKE '%sun protection measures%' OR l.directions LIKE '%broad spectrum spf value of 15 or higher%') AS bs15,
        (l.warnings LIKE '%skin aging alert%' OR l.warnings LIKE '%shown only to help prevent sunburn%') AS sunburnOnly
       FROM products p LEFT JOIN label_sections l ON l.spl_set_id = p.spl_set_id
       WHERE p.is_rx = 0 AND p.canonical_id IS NULL`,
    )
    .all() as { concernId: string; brandName: string; activeIds: string; activeIngredientText: string | null; dosageForm: string | null; strengths: string | null; hasLabel: number; bs15: number | null; sunburnOnly: number | null }[];
  db.close();
  const c: NonNullable<Counts> = { eczemaExcluded: 0, aboveMonograph: 0, aboveExamples: [], eczemaLower: 0, sunTiers: [0, 0, 0] };
  for (const r of rows) {
    const p = {
      concernId: r.concernId,
      brandName: r.brandName,
      activeIds: JSON.parse(r.activeIds ?? "[]") as string[],
      activeIngredientText: r.activeIngredientText,
      dosageForm: r.dosageForm,
      strengths: r.strengths ? (JSON.parse(r.strengths) as Record<string, number>) : null,
      label: r.hasLabel ? { broadSpectrum15: !!r.bs15, sunburnOnly: !!r.sunburnOnly } : null,
    };
    if (aboveMonograph(p.strengths)) {
      c.aboveMonograph++;
      if (c.aboveExamples.length < 6) c.aboveExamples.push(`${r.brandName} (${Object.entries(p.strengths!).map(([k, v]) => `${k} ${v}%`).join(", ")})`);
      continue;
    }
    if (excludedFromConcern(p)) {
      if (p.concernId === "dry-skin-eczema") c.eczemaExcluded++;
      continue;
    }
    const tier = concernTier(p);
    if (p.concernId === "dry-skin-eczema" && tier > 0) c.eczemaLower++;
    if (p.concernId === "sun-protection") c.sunTiers[tier]++;
  }
  return c;
}

export function partD(dbPath: string): { html: string; questions: string[]; ruleCount: number } {
  const n = counts(dbPath);
  const cnt = (s: string) => (n ? ` <i>(${s})</i>` : "");
  const pediatric = ALL_HANDOUT_TEMPLATES.filter((t) => t.category === "pediatric");

  const rules: [string, string, string][] = [
    [
      "D1",
      "What counts as a retinoid",
      `Potent retinoids count wherever they sit on an ingredient list, because they work at a fraction of a percent: ${list(POTENT_RETINOIDS)}. Retinyl esters count only in the first 12 ingredients, since they are weak and often a trace antioxidant: ${list(RETINYL_ESTERS)}. Used for the regimen and shelf cautions below and the “Fine lines &amp; aging” match score. Source: <code>lib/retinoids.ts</code>.`,
    ],
    [
      "D2",
      "Prescription retinoid on the regimen",
      "A card on <code>/regimen</code>: “Also using a prescription retinoid?” with Morning / Night / Both. It stores only the time of day (no product, no dose) and adds a retinoid to the cautions below. Card text: “Tretinoin, tazarotene or another retinoid from your doctor. Mark when you use it and the cautions on this page take it into account. Keep using it exactly as your prescriber told you; we don't give directions for prescription medicines.” Source: <code>components/rx-retinoid-card.tsx</code>.",
    ],
    [
      "D3",
      "Dry skin &amp; eczema: left off the list",
      `Products with a topical antihistamine or antifungal active: ${list(ECZEMA_EXCLUDED_ACTIVES)}, also matched in the label's active text by ${re(ECZEMA_EXCLUDED_TEXT)}. They keep their own pages, stay in search and on Itch relief / Antifungal, and lose their filter chips here.${cnt(`${n?.eczemaExcluded} products today`)} Source: <code>lib/listing-rules.ts</code>.`,
    ],
    [
      "D4",
      "Dry skin &amp; eczema: ranked lower",
      `Diaper-area products (${re(DIAPER_RE)}, labeled “For the diaper area” on the card), lip balms, and anything with a sunscreen filter (${list([...SUNSCREEN_ACTIVES])}) rank after general eczema care.${cnt(`${n?.eczemaLower} products today`)}`,
    ],
    [
      "D5",
      "Sun protection order",
      `First: dedicated sunscreens with SPF 30 or higher in the name and broad spectrum (from the FDA label's “Sun Protection Measures” directions or the name). Last: makeup with SPF (${re(MAKEUP_RE)}), anything stating SPF under 30, or a label carrying the sunburn-only alert. Everything else in between. Tinted sunscreens count as sunscreens, not makeup; powders count as makeup.${cnt(`first ${n?.sunTiers[0]}, middle ${n?.sunTiers[1]}, last ${n?.sunTiers[2]}`)}`,
    ],
    [
      "D6",
      "Within each group",
      "FDA-listed OTC drugs before cosmetics that were matched to a concern on an ingredient, then listings with a photo, then catalog order. Applies to every concern page's default order (visitors can still sort A–Z or by their match).",
    ],
    [
      "D7",
      "Strength above the OTC limit",
      `A product whose stated strength is above its monograph maximum is left off every concern list.${cnt(`${n?.aboveMonograph} products today, e.g. ${(n?.aboveExamples ?? []).map(esc).join("; ")}`)} Its page says: “[Active] is listed at [x]%, above the [max]% OTC limit. That's usually a filing error, so check the strength on the package. Until it's clear, we leave this product off our concern lists.”`,
    ],
    [
      "D8",
      "“Sensitive skin” filter",
      `One chip on every product list that applies ${list(SENSITIVE_SKIN_FREE)} together (the same three things the match score marks down for sensitive skin), shown as “No fragrance, drying alcohol or essential oils”.`,
    ],
    [
      "D9",
      "Ingredient checker: patch-test mixes",
      "Allergens found in a pasted list are also grouped under the mix or family they belong to (for example “Fragrance mix I: Cinnamal, Eugenol, Hydroxycitronellal”), with “Your patch-test results may use these names rather than the chemical names.”",
    ],
    [
      "D10",
      "Ingredient checker: similar products",
      "“Products with a similar formula” only lists products whose full ingredient list is clear of the visitor's avoid list or, with no list saved, of every fragrance allergen when the pasted list contains fragrance. Not screened for every allergen found, because phenoxyethanol or tocopherol are in most formulas.",
    ],
    [
      "D11",
      "Unreadable label strengths",
      "When the FDA strength can't be parsed (“SALICYLIC ACID 1.8 mg/180mL”, “.14 mg/1”), cards show the active names and “strength unclear on the label” rather than converting to a percentage, which would print a wrong number.",
    ],
    ["D12", "Nickel on the patient's patch-test sheet", esc(mainlyOffLabel("nickel") ?? "")],
    [
      "D13",
      "Children's skin guides for parents",
      `<code>/guide/kids</code> shows the ${pediatric.length} pediatric library handouts to anyone, without a clinician account: the education sections, over-the-counter care steps only (prescription steps and their directions are left out), “Call your child's doctor if:” with the handout's stop rules plus the universal ones, and the note “Written as a handout a dermatology clinic gives families. Where it says ‘we’ or ‘us’, that means your child's doctor or dermatologist. It's general information, not a diagnosis, and any prescription is used only as your child's clinician directs.” Not indexed by search engines. The handouts' own text is in <code>review/handout-library-review.html</code>.`,
    ],
    [
      "D14",
      "Review status shown on handouts and guides",
      "Per-handout “Draft” badges are gone. One small note per page: “Drafted with AI assistance; physician review in progress.” It changes to “Drafted with AI assistance and reviewed by the site's dermatologist before clinical use.” only for handouts marked reviewed.",
    ],
  ];

  const cautionRows = CAUTIONS.map(
    (r, i) => `<tr><th>D-R${i + 1}</th><td><b>${esc(CLASS_LABEL[r.a])} + ${esc(CLASS_LABEL[r.b])}</b><br><span class="src">${list(CLASS_IDS[r.a])} with ${list(CLASS_IDS[r.b])}</span></td><td>${esc(r.note)}</td>${BOX}</tr>`,
  ).join("\n");

  const guideRows = [
    ["Intro", G.intro],
    [G.disclaimerTitle, G.disclaimer],
    ...G.pairsWell.map((p) => ["Pairs well", `${p.lead} ${p.text}`]),
    ...G.spaceOut.map((p) => ["Space out / ask first", `${p.lead} ${p.text}`]),
    ...G.firstWeeks.map((t) => ["First weeks", t]),
  ]
    .map(([w, t], i) => `<tr><th>D-G${i + 1}</th><td><b>${esc(w)}</b></td><td>${esc(t)}</td>${BOX}</tr>`)
    .join("\n");

  const hintRows = Object.entries(SEARCH_HINTS)
    .map(([id, h], i) => `<tr><th>D-S${i + 1}</th><td><b>${esc(h.title)}</b><br><span class="src">search pointer “${esc(id)}” → ${esc(h.href)}</span></td><td>${esc(h.body)}</td>${BOX}</tr>`)
    .join("\n");

  const questions = [
    "D3: topical antihistamines and antifungals are <b>removed</b> from the eczema list rather than ranked lower. Pramoxine (an anti-itch anesthetic) stays. Right call on both?",
    "D5: SPF 30 is the line for “first”. Tinted mineral sunscreens count as sunscreens (useful for melasma), powders as makeup. Agree?",
    `D7: products above the monograph maximum are hidden from concern lists${n ? ` (${n.aboveMonograph} today)` : ""}. Some are filing errors on otherwise normal products. Hide, or show with the note?`,
    "D1: retinyl palmitate in the first 12 ingredients now triggers the retinoid + acid caution. Too sensitive for a common antioxidant ester?",
    "Prescription retinoid guide: please check the 8–12 week expectation, the benzoyl peroxide / tretinoin statement, and whether waxing belongs on the list. It is live but hidden from search engines until you approve it.",
    "D13: the children's guides are public now, while the handouts are still in review. Keep them public, or hide until reviewed?",
  ];

  const html = `<section id="part-d"><h2>Part D — Changes from the persona testing (October 2026)</h2>
<div class="callout"><b>Live now.</b> Unlike Parts A and B, these are not behind a flag: they shipped in PRs #5–#8 so you could review them on the site. Counts are from the local catalog copy the document was built from.</div>
<h3 style="margin-top:20px">Rules</h3>
<table><thead><tr><th>#</th><th>Rule</th><th>What the site does</th><th>Sign-off</th></tr></thead><tbody>
${rules.map(([id, t, d]) => `<tr><th>${id}</th><td><b>${t}</b></td><td>${d}</td>${BOX}</tr>`).join("\n")}
</tbody></table>
<h3 style="margin-top:20px">Regimen and shelf cautions</h3>
<p class="meta">Shown when two products in the same routine (or the prescription-retinoid marker, D2) are used at the same time; when they're split between morning and night the page says that's the usual way to combine them. Worded as “consider”, never a verdict. Source: <code>lib/routine-conflicts.ts</code>.</p>
<table><thead><tr><th>#</th><th>Pair</th><th>Text shown</th><th>Sign-off</th></tr></thead><tbody>
${cautionRows}
</tbody></table>
<h3 style="margin-top:20px">Guide: “Using a prescription retinoid?” (<code>/guide/prescription-retinoids</code>)</h3>
<p class="meta">Linked from the tretinoin search pointer, the D2 card and every retinoid ingredient page. Not indexed by search engines until approved. Source: <code>db/rx-retinoid-guide.ts</code>. Cited: ${G.sources.map(esc).join("; ")}.</p>
<table><thead><tr><th>#</th><th>Section</th><th>Text shown</th><th>Sign-off</th></tr></thead><tbody>
${guideRows}
</tbody></table>
<h3 style="margin-top:20px">Search pointers</h3>
<p class="meta">Shown above results for topic searches (HSA/FSA, tretinoin and other prescription retinoids, kids). Source: <code>lib/search-hint-copy.ts</code>.</p>
<table><thead><tr><th>#</th><th>Pointer</th><th>Text shown</th><th>Sign-off</th></tr></thead><tbody>
${hintRows}
</tbody></table>
</section>`;
  return { html, questions, ruleCount: rules.length + CAUTIONS.length };
}
