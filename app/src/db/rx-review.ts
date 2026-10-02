// Writes review/rx-handouts-review.html (repo root) -- the dermatologist's
// sign-off copy of the clinical content behind FEATURE_RX_CATALOG and
// FEATURE_HANDOUTS: steroid potency mapping (db/steroid-potency.ts), handout
// templates and default stop-and-call rules (db/handout-templates.ts), and
// the fixed patient-facing Rx / plan copy. Same format as
// clinical-review.ts's review/clinical-content-review.html.
//
//   npx tsx src/db/rx-review.ts        (from app/)
//
// Re-run after editing any of those files. Reads the local DB (read-only)
// to list which catalog products each potency rule matches and which
// steroid listings stay unclassified.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { POTENCY_LABEL, POTENCY_RULES, ROMAN, matchPotencyRule, STEROID_NAMES, type PotencyRule } from "./steroid-potency";
import { HANDOUT_TEMPLATES, UNIVERSAL_STOP_RULES, UNIVERSAL_STOP_SOURCES, type HandoutTemplate } from "./handout-templates";
import { RX_GROUPS } from "./rx";
import { SLOT_LABEL } from "../lib/handout-types";

const OUT = path.join(process.cwd(), "..", "review", "rx-handouts-review.html");
const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "skinwiz.db");
const RX_CSV = path.join(process.cwd(), "..", "tools", "catalog_pipeline", "output", "rx_catalog.csv");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BOX = `<td class="box">☐ Approve<br>☐ Edit<br>☐ Cut</td>`;
const POTENCY_SOURCE =
  "Ference JD, Last AR. Choosing topical corticosteroids. Am Fam Physician 2009;79(2):135-140, Table 1; cross-checked against the National Psoriasis Foundation topical steroid potency chart";

// --- catalog data (read-only) ---------------------------------------------------
type RxRow = { id: string; brand: string; generic: string; strength: string; form: string; group: string; cat: string; potency: number | null; ingredients: string };
let rx: RxRow[] = [];
let dbNote = "";
if (fs.existsSync(DB_PATH)) {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    rx = db
      .prepare(
        `SELECT id, brand_name AS brand, generic_name AS generic, strength_text AS strength, dosage_form AS form, rx_group AS "group",
          marketing_category AS cat, steroid_potency_class AS potency, active_ingredient_text AS ingredients FROM products WHERE is_rx = 1`,
      )
      .all() as RxRow[];
  } catch {
    dbNote = " (local database has no Rx rows yet: run migrations + seed)";
  }
  db.close();
} else dbNote = " (local database not found, so catalog matches are not listed)";

// Re-derive each Rx row's matching rule from its stored ingredient line.
const MASS: Record<string, number> = { kg: 1000, g: 1, mg: 0.001, ug: 1e-6, mcg: 1e-6, l: 1000, ml: 1 };
function ingredientsOf(line: string | null) {
  return (line ?? "").split(";").map((seg) => {
    const m = /^\s*(.+?)\s+(\d*\.?\d+)\s*([a-zA-Z]+)\s*\/\s*(\d*\.?\d+)?\s*([a-zA-Z]+)\s*$/.exec(seg);
    if (!m) return { name: seg.trim().replace(/\s+[\d.].*$/, ""), pct: null };
    const [, name, n, u, dn, du] = m;
    const a = MASS[u.toLowerCase()];
    const b = MASS[du.toLowerCase()];
    return { name, pct: a && b ? Math.round(((parseFloat(n) * a) / ((dn ? parseFloat(dn) : 1) * b)) * 100 * 10000) / 10000 : null };
  });
}
const ruleHits = new Map<PotencyRule, RxRow[]>();
const unclassified: RxRow[] = [];
for (const r of rx) {
  const ings = ingredientsOf(r.ingredients);
  const hasSteroid = ings.some((i) => STEROID_NAMES.has(i.name.toUpperCase().replace(/\s+USP\b/, "").trim()));
  if (!hasSteroid) continue;
  const rule = matchPotencyRule(ings, r.form);
  if (rule) (ruleHits.get(rule) ?? ruleHits.set(rule, []).get(rule)!).push(r);
  else unclassified.push(r);
}
const byGroup = RX_GROUPS.map((g) => ({ ...g, n: rx.filter((r) => r.group === g.id).length }));
const uniqueNames = (rows: RxRow[]) => [...new Set(rows.map((r) => `${r.brand} (${r.strength}, ${(r.form ?? "").toLowerCase()})`))];

// --- sections -----------------------------------------------------------------
let p = 0;
function potencyRow(r: PotencyRule): string {
  p++;
  const hits = ruleHits.get(r) ?? [];
  const names = uniqueNames(hits);
  const strength = r.pct === "any" ? `${r.minPct ?? "any"}–${r.maxPct ?? "any"}%` : `${r.pct}%`;
  const vehicles = r.vehicles === "any" ? "any vehicle" : r.vehicles.join(", ");
  return `<tr${r.unsure ? ' class="unsure"' : ""}><th>S${p}</th><td><b>${esc(r.steroid.toLowerCase())}</b> ${strength} · ${esc(vehicles)}${r.augmented ? " · augmented" : ""}<br>
<span class="lvl c${r.cls}">${POTENCY_LABEL[r.cls]}</span>${r.unsure ? `<div class="flag">Unsure: ${esc(r.unsure)}</div>` : ""}
<div class="meta">${hits.length} catalog listing${hits.length === 1 ? "" : "s"}${names.length ? `: ${esc(names.slice(0, 6).join("; "))}${names.length > 6 ? `; … ${names.length - 6} more` : ""}` : ""}</div></td>
<td class="src">${esc(POTENCY_SOURCE)}</td>${BOX}</tr>`;
}

let k = 0;
function templateHtml(t: HandoutTemplate): string {
  const src = t.sources.map(esc).join("<br>");
  const row = (label: string, text: string) => {
    k++;
    return `<tr><th>T${k}<br><small>${label}</small></th><td>${text}</td><td class="src">${src}</td>${BOX}</tr>`;
  };
  return `<article id="t-${t.id}">
<h3>${esc(t.name)} <code>${t.id}</code></h3>
<p class="meta"><b>Handout title:</b> ${esc(t.title)} · <b>Summary:</b> ${esc(t.summary)}</p>
<table><thead><tr><th>#</th><th>Statement shown (clinician can edit before printing)</th><th>Source note</th><th>Sign-off</th></tr></thead><tbody>
${t.steps.map((s) => row(`Step · ${SLOT_LABEL[s.slot]}`, `<b>${esc(s.label)}</b> <span class="meta">(${s.kind === "rx" ? "prescription" : "OTC"}; picker search “${esc(s.search)}”)</span><br>${esc(s.directions)}`)).join("\n")}
${t.stopRules.map((r) => row("Stop and call if", esc(r))).join("\n")}
${row("Notes to patient", esc(t.notes))}
</tbody></table>
<div class="review"><span>☐ Approve template as written</span><span>☐ Approve with edits</span><span>☐ Don't publish</span><div class="notes">Notes:</div></div>
</article>`;
}

const UI_COPY: [string, string][] = [
  ["Rx page callout (/rx/[id])", "Prescription only: ask your dermatologist. This page summarizes what the FDA label says about {generic}. It isn't a recommendation for you: whether it's right for your skin, at what strength and how often, is a decision for a clinician who has examined you."],
  ["Rx page section titles", "What it's for (indications) · How it's typically used (dosage & administration) · Pregnancy · Breastfeeding · Who shouldn't use it (contraindications) · Warnings and precautions — each quoted verbatim from the label, capped at ~6,000 characters, with a DailyMed link."],
  ["Rx page boxed warning", "Red box titled “Boxed warning”: “The FDA's most serious label warning, quoted from the label.” followed by the label text."],
  ["Isotretinoin page", "Reference only. Isotretinoin is dispensed only through the FDA's iPLEDGE REMS program, with pregnancy testing and monthly visits. Your dermatologist manages it directly; it is never part of an Actively plan or handout."],
  ["Rx cost box", "Prescription prices vary a lot by pharmacy and coupon. Your prescriber sends the prescription; you can compare cash prices before you fill it. [Check prices → GoodRx search] A plain search on GoodRx. Not an affiliate link: we earn nothing from it."],
  ["Rx page footer", "Label text is quoted from the manufacturer's FDA prescribing information (full label on DailyMed). Sections are shortened for length. Never start, stop or change a prescription medicine without your prescriber."],
  ["Steroid potency on Rx pages", "“Class IV (medium potency)” etc.; “US 7-class system (I strongest, VII mildest).”"],
  ["Approval line", "FDA-approved brand (NDA) / FDA-approved generic (ANDA) / Authorized generic / Marketed without FDA approval (unapproved drug) — the last applies to most Rx hydroquinone and sodium sulfacetamide listings."],
  ["Plan step, prescription", "Your clinician sends this prescription to your pharmacy. [Check prices]"],
  ["Plan header", "Read-only: this is exactly what your clinician wrote (plan REF). To change anything, make a personal copy, or ask your clinician."],
  ["Plan footer", "This plan is between you and your clinician; Actively shows it as written and doesn't change it. Questions about your treatment go to your clinician."],
  ["Order all, OTC fallback", "Find these at any store, or search: [Amazon] [Walmart] [Target] — Plain store searches, not affiliate links. Any equivalent product your clinician named works."],
  ["Order all, prescriptions", "Your clinician sends these to your pharmacy; they can't be ordered here. Prices vary a lot by pharmacy, so it's worth comparing before you fill them."],
  ["Print sheet footer", "Plan REF · Saved plans are private to you on Actively; the link and QR don't contain your name. Follow your clinician's directions and each product's label. Prescriptions are sent to your pharmacy by your clinician."],
  ["QR landing (/h/…)", "Save the plan your clinician printed for you to Actively: your steps morning and night, their directions, and when to call them. Private to you … No account needed. Your clinic doesn't see what you do here, and we don't know your name."],
  ["Builder: NPI note", "NPI verification confirms you are a licensed prescriber; it is not board certification."],
  ["Chart note (fixed lines)", "Skincare plan given via Actively (ref REF), DATE: TITLE. … Patient education: written handout + QR provided. Sig shorthand option: qAM / qHS / BID."],
];

const OPEN_QUESTIONS = [
  "<b>Steroid potency.</b> Every rule below is a draft; the yellow rows are where published charts disagree or the product postdates the 2009 AFP table (Impoyz 0.025%, Topicort spray, desoximetasone 0.05% ointment, Luxiq foam, triamcinolone 0.1%/0.05%/0.5% ointment, diflorasone cream, Locoid ointment, Cutivate lotion, desonide ointment). Which chart do you want to be the single source of truth?",
  "<b>Combinations take the steroid component's class</b> (Lotrisone = betamethasone dipropionate 0.05% cream = class III; Mycolog = triamcinolone 0.1% = IV; pramoxine/hydrocortisone acetate = VII). Acceptable, or label combinations “not classified”?",
  "Listings left unclassified (bottom of Part A) include filing errors (clobetasol spray filed as 5%, Wynzora as 6.4%, Psorcon cream as 0.5%), halobetasol 0.01% lotion (Bryhali), betamethasone dipropionate spray (Sernivo) and hydrocortisone acetate 10% foam (rectal). Leave unclassified or assign?",
  "<b>Templates</b> name products by role and only pre-fill the picker; the clinician picks the actual product and owns every word. Default sigs: tretinoin every other night × 2 weeks then nightly; BPO wash short-contact 1–2 min; topical steroid BID ≤ 2 weeks on body only; tacrolimus BID for face/folds; ketoconazole shampoo 2–3×/week then weekly; hydroquinone nightly to patches “for the length of time we discussed”. Edit any you'd write differently.",
  "Default “stop and call” rules are written for patients and include two universal ones on every handout (911 for airway swelling; same-day care for spreading/blistering rash with fever). Keep both on every template?",
  "Melasma template names hydroquinone (most Rx listings are “unapproved drug other”). Comfortable listing an unapproved product in a template, or default to Tri-Luma (NDA) with an 8-week limit?",
  "Post-procedure template is generic (peel/laser/resurfacing). Do you want a separate excision / wound-care template (dressing changes, suture care)? Not drafted.",
  "The seborrheic dermatitis template uses ketoconazole Rx shampoo; OTC 1% ketoconazole and zinc/selenium shampoos are alternatives. Prefer OTC-first?",
  "Rx pages show label D&A text verbatim as “How it's typically used”. Some labels are long and technical; they are capped at ~6,000 characters with a DailyMed link. Acceptable, or show only a short excerpt?",
  "Chart note abbreviations: qAM / qHS / BID. qHS is NOT on the Joint Commission “do not use” list but IS on ISMP's error-prone list (“qhs” misread as “every hour”). Keep qHS (owner's example) or switch to “nightly”?",
  "Rx group placement: minocycline foam is under acne topicals; Tri-Luma under retinoids (first match); clotrimazole/betamethasone under steroids. Any you'd move?",
  "Isotretinoin is listed as informational only (page with iPLEDGE note, excluded from builder search and server validation). Do you want the isotretinoin reference page at all?",
];

const LEGAL_QUESTIONS = [
  "Rx reference content on a consumer site (business-plan §3, §8 item 5): informational pages quoting FDA labels with a “prescription only, ask your dermatologist” callout and noindex. Confirm wording and whether indexing is ever OK.",
  "HIPAA-avoidance structure of handouts: no patient identifiers stored; patient name typed client-side only; first-device claim binds the plan to the patient's own browser/email, a relationship between patient and Actively, not via the clinic. Confirm we are not the clinic's business associate, and whether the clinic's dashboard counts (printed/opened/saved per version) change that.",
  "NPI verification proves the NPI exists, is an active individual and the last name matches — NPI and name are public, so anyone could register as any prescriber. Is email + NPI enough for issuing handouts that carry Rx steps, or do we need stronger identity proofing (NPPES phone callback, work-email domain, manual review) before launch?",
  "“MD” badge text uses the registry credential (MD/DO/PA-C/NP, else “Clinician”). Any state-law issue with displaying a credential we haven't independently verified beyond NPPES?",
  "Order all: affiliate commissions on OTC products that a physician recommended on a handout (anti-kickback/fee-splitting if the clinic or a physician-owner shares in revenue; FTC disclosure is shown next to the button). Walmart/Amazon multi-item cart URLs and program terms need checking before enabling.",
  "GoodRx “check prices” link is a plain non-affiliate search. If a GoodRx/Cost Plus partner link is used later, pharmacy-advertising and disclosure rules apply. The pharmacy-fulfillment hook (lib/rx-fulfillment.ts) stays disabled pending advice.",
  "Check-ins on a clinician plan: an email opt-in by the patient; the clinic never sees answers. Confirm consumer-health-data consent (WA MHMDA/CT) for plan data stored server-side (regimen + step states keyed to an anonymous session or email).",
  "Privacy policy and Terms need sections for clinician accounts (NPI data stored from NPPES), handout storage and retention (versions are immutable and never deleted; unclaimed printouts expire after 90 days), and the patient's claimed plan.",
];

const rulesByClass = ([1, 2, 3, 4, 5, 6, 7] as const).map((c) => ({ c, rules: POTENCY_RULES.filter((r) => r.cls === c) }));
const today = new Date().toISOString().slice(0, 10);
const unsureCount = POTENCY_RULES.filter((r) => r.unsure).length;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Actively Rx catalog &amp; clinician handouts — draft for review</title>
<style>
:root{--ink:#141b24;--muted:#5d646c;--line:#d7d4cc;--paper:#f6f4ee;--card:#fff;--teal:#006761}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 Georgia, "Times New Roman", serif}
main{max-width:960px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:32px;margin:0 0 4px} h2{font-size:24px;margin:48px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--teal)}
h3{font:600 18px/1.3 system-ui,sans-serif;margin:0 0 8px}
code{font:12px ui-monospace,monospace;color:var(--muted);background:#eeece5;padding:1px 6px;border-radius:4px;margin-left:6px}
article{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:14px 0;break-inside:avoid}
ul,ol{margin:4px 0;padding-left:22px} .meta{font-family:system-ui,sans-serif;font-size:13px;color:var(--muted)}
.review{margin-top:14px;padding-top:12px;border-top:1px dashed var(--line);display:flex;flex-wrap:wrap;gap:18px;font:14px system-ui,sans-serif}
.notes{flex-basis:100%;min-height:44px;color:var(--muted)}
.callout{background:#fff8e6;border:1px solid #f0d58a;border-radius:14px;padding:14px 18px} .callout li{margin:6px 0}
.legal{background:#eef4fb;border:1px solid #a9c4e3;border-radius:14px;padding:14px 18px} .legal li{margin:6px 0}
.lede{color:var(--muted)} nav a{color:var(--teal)} nav{font:14px system-ui,sans-serif;columns:2}
table{width:100%;border-collapse:collapse;font:14px/1.45 system-ui,sans-serif;margin-top:8px;background:var(--card)}
th,td{border:1px solid var(--line);padding:6px 8px;vertical-align:top;text-align:left} thead th{background:#eeece5;font-weight:600}
tbody th{width:90px;font-weight:600} td.src{width:26%;color:var(--muted);font-size:12px} td.box{width:84px;white-space:nowrap;font-size:13px}
tr.unsure td{background:#fffbe9} .flag{color:#8a5a00;font-size:13px;margin-top:4px}
.lvl{display:inline-block;font-size:12px;font-weight:600;border-radius:999px;padding:0 8px;border:1px solid #999;margin-top:3px}
.c1{background:#fde2e2}.c2{background:#fdeadb}.c3{background:#fdf3d6}.c4{background:#eef6dc}.c5{background:#e1f2ec}.c6{background:#e1edf7}.c7{background:#ece6f6}
pre{font:13px ui-monospace,monospace;background:#eeece5;padding:10px 12px;border-radius:8px;white-space:pre-wrap}
@media print{body{background:#fff} article{border-color:#bbb}}
</style></head><body><main>
<h1>Actively Rx catalog &amp; clinician handouts — draft for review</h1>
<p class="lede">Generated ${today} from <code>app/src/db/steroid-potency.ts</code>, <code>app/src/db/handout-templates.ts</code> and fixed UI copy · ${POTENCY_RULES.length} potency rules (${unsureCount} flagged unsure) · ${HANDOUT_TEMPLATES.length} templates · ${rx.length.toLocaleString()} Rx catalog rows${dbNote}</p>

<h2>How to review</h2>
<p>Everything below was drafted by Claude (AI) for your review as the site's board-certified dermatologist. None of it is live in production: both features sit behind flags that are <b>off in production</b> and on only in local development. Tick one box per row (and per template) and note edits; send the file back or list row numbers. Regenerate with <code>npx tsx src/db/rx-review.ts</code> in <code>app/</code>.</p>
<p>Drafting rules: FDA labeling and mainstream guidelines (AAD guidelines of care, National Rosacea Society, AFP reviews); templates set roles and default directions only, and every word is editable by the prescribing clinician before printing. Rx pages quote the label and never recommend.</p>

<h2>Turning the features on</h2>
<pre>FEATURE_RX_CATALOG=on   # /rx and /rx/[id] reference pages (noindex); off = 404
FEATURE_HANDOUTS=on     # /clinicians (sign-in, NPI, builder, dashboard), /h/[token] claim links, clinician plans in /regimen; off = 404
AMAZON_ASSOCIATE_TAG=…  # optional: enables Amazon multi-item carts once live (non-demo) affiliate rows exist
WALMART_IMPACT_LINK=…   # optional: enables Walmart multi-item carts (Impact tracking link prefix)</pre>
<p>Prescription rows never appear in browse, concern pages, search, autocomplete, match scores, similar/dupes, /same groups, HSA tags, affiliate links or the sitemap, whatever the flags say.</p>

<h2>Open clinical questions</h2>
<div class="callout"><ol>${OPEN_QUESTIONS.map((q) => `<li>${q}</li>`).join("")}</ol></div>

<h2>For the attorney</h2>
<div class="legal"><ol>${LEGAL_QUESTIONS.map((q) => `<li>${q}</li>`).join("")}</ol></div>

<h2>Contents</h2>
<nav><div><a href="#scope">Rx catalog scope</a></div><div><a href="#potency">Part A — Steroid potency</a> (${POTENCY_RULES.length})</div><div><a href="#unclassified">Unclassified steroid listings</a> (${unclassified.length})</div><div><a href="#templates">Part B — Handout templates</a> (${HANDOUT_TEMPLATES.length})</div><div><a href="#universal">Universal stop rules</a></div><div><a href="#ui-copy">Part C — Fixed copy</a> (${UI_COPY.length})</div></nav>

<section id="scope"><h2>Rx catalog scope</h2>
<p class="meta">From <code>tools/catalog_pipeline/build_rx_catalog.py</code> (openFDA NDC directory, Rx product type, topical/cutaneous routes plus the listed orals, original packagers only). Rows per group:</p>
<table><thead><tr><th>Group</th><th>Rows</th><th>Generics searched</th></tr></thead><tbody>
${byGroup.map((g) => `<tr><td>${esc(g.label)}</td><td>${g.n}</td><td class="meta">${esc([...new Set(rx.filter((r) => r.group === g.id).map((r) => (r.generic ?? "").split(" and ")[0]))].sort().join(", "))}</td></tr>`).join("\n")}
</tbody></table>
<p class="meta">Isotretinoin: ${rx.filter((r) => /isotretinoin/i.test(r.generic ?? "")).length} rows, informational only (never in a handout).${fs.existsSync(RX_CSV) ? "" : " rx_catalog.csv not found."}</p>
</section>

<section id="potency"><h2>Part A — Topical steroid potency classes</h2>
<p class="meta">Source for every row: ${esc(POTENCY_SOURCE)}. Potency is molecule + strength + vehicle. Yellow rows are flagged unsure. Catalog listings each rule matches are from the local database.</p>
${rulesByClass
  .map(
    ({ c, rules }) => `<h3>Class ${ROMAN[c]} — ${POTENCY_LABEL[c].replace(/^Class [IVX]+ /, "")}</h3>
<table><thead><tr><th>#</th><th>Rule</th><th>Source</th><th>Sign-off</th></tr></thead><tbody>${rules.map(potencyRow).join("\n")}</tbody></table>`,
  )
  .join("\n")}
</section>

<section id="unclassified"><h2>Steroid listings left unclassified</h2>
<p class="meta">No rule matched (strength/vehicle not in the table, or a filing error). Shown on Rx pages without a potency class.</p>
<table><thead><tr><th>NDC</th><th>Listing</th><th>Strength as filed</th><th>Form</th><th>Decision</th></tr></thead><tbody>
${unclassified
  .map((r) => `<tr><td>${esc(r.id)}</td><td>${esc(r.brand)}</td><td>${esc(r.strength ?? "")}</td><td>${esc((r.form ?? "").toLowerCase())}</td><td class="box">☐ Leave<br>☐ Class: ___</td></tr>`)
  .join("\n")}
</tbody></table>
</section>

<section id="templates"><h2>Part B — Handout templates</h2>
${HANDOUT_TEMPLATES.map(templateHtml).join("\n")}
</section>

<section id="universal"><h2>Universal stop-and-call rules (added to every template)</h2>
<table><thead><tr><th>#</th><th>Statement</th><th>Source note</th><th>Sign-off</th></tr></thead><tbody>
${UNIVERSAL_STOP_RULES.map((r, i) => `<tr><th>U${i + 1}</th><td>${esc(r)}</td><td class="src">${UNIVERSAL_STOP_SOURCES.map(esc).join("<br>")}</td>${BOX}</tr>`).join("\n")}
</tbody></table>
</section>

<section id="ui-copy"><h2>Part C — Fixed patient-facing copy</h2>
<table><thead><tr><th>Where</th><th>Text</th><th>Sign-off</th></tr></thead><tbody>
${UI_COPY.map(([w, t]) => `<tr><th style="width:200px">${esc(w)}</th><td>${esc(t)}</td>${BOX}</tr>`).join("\n")}
</tbody></table>
</section>
</main></body></html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`Wrote ${OUT}: ${POTENCY_RULES.length} potency rules, ${unclassified.length} unclassified steroid listings, ${HANDOUT_TEMPLATES.length} templates.`);
