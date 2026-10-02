// Writes review/clinical-content-review.html (repo root) -- the
// dermatologist's sign-off copy of the gated clinical content:
// pregnancy/lactation classifications (db/pregnancy-lactation.ts) and
// "When OTC isn't enough" guidance (db/escalation-guidance.ts).
//
//   npx tsx src/db/clinical-review.ts        (from app/)
//
// Re-run after any edit to either data file so the review copy matches what
// would ship. Reads the local DB (read-only) to show which catalog
// ingredient slugs each classification actually matches.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PREGNANCY_ENTRIES, pregnancyEntryFor, type Classification, type PregnancyEntry, type SafetyLevel } from "./pregnancy-lactation";
import { ESCALATION_GUIDANCE, ESCALATION_URGENT_SOURCES, UNIVERSAL_URGENT, type EscalationGuidance } from "./escalation-guidance";
import { CONCERN_DEFINITIONS } from "./actives";
import { DERM_FINDER } from "../lib/derm-finder";

const OUT = path.join(process.cwd(), "..", "review", "clinical-content-review.html");
const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "skinwiz.db");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Catalog slugs (with product counts) each entry claims.
const matches = new Map<string, { id: string; n: number }[]>();
let dbNote = "";
if (fs.existsSync(DB_PATH)) {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare("SELECT id, product_count AS n FROM ingredients ORDER BY product_count DESC").all() as { id: string; n: number }[];
  for (const r of rows) {
    const e = pregnancyEntryFor(r.id);
    if (!e) continue;
    const list = matches.get(e.id) ?? matches.set(e.id, []).get(e.id)!;
    list.push(r);
  }
  db.close();
} else {
  dbNote = " (local database not found, so catalog matches are not listed)";
}

const LEVEL: Record<SafetyLevel, string> = { avoid: "Avoid", caution: "Caution / ask first", ok: "Generally OK" };
const BOX = `<td class="box">☐ Approve<br>☐ Edit<br>☐ Cut</td>`;

function classRow(label: string, c: Classification, src: string): string {
  return `<tr><th>${label}</th><td><span class="lvl ${c.level}">${LEVEL[c.level]}</span> ${esc(c.note)}</td><td class="src">${src}</td>${BOX}</tr>`;
}

let n = 0;
function entryHtml(e: PregnancyEntry): string {
  n++;
  const src = e.sources.map((s) => esc(s)).join("<br>");
  const m = matches.get(e.id) ?? [];
  const shown = m.slice(0, 18).map((x) => `${esc(x.id)} (${x.n})`).join(", ");
  return `<article id="p-${e.id}">
<h3>P${n}. ${esc(e.name)} <code>${e.id}</code></h3>
<p class="meta"><b>Matching patterns:</b> ${e.patterns.map((p) => `<code>${esc(p)}</code>`).join(" ")}</p>
<p class="meta"><b>Catalog slugs matched</b> (products): ${m.length ? shown + (m.length > 18 ? `, … ${m.length - 18} more` : "") : "none in the current catalog"}</p>
<table><thead><tr><th></th><th>Statement shown</th><th>Source note</th><th>Sign-off</th></tr></thead><tbody>
${classRow("Pregnancy", e.pregnancy, src)}
${e.washOff?.pregnancy ? classRow("Pregnancy, rinse-off", e.washOff.pregnancy, src) : ""}
${classRow("Breastfeeding", e.lactation, src)}
${e.washOff?.lactation ? classRow("Breastfeeding, rinse-off", e.washOff.lactation, src) : ""}
</tbody></table>
<div class="review"><span>☐ Approve entry as written</span><span>☐ Approve with edits</span><span>☐ Don't publish</span><div class="notes">Notes:</div></div>
</article>`;
}

let k = 0;
function escalationHtml(g: EscalationGuidance): string {
  const name = CONCERN_DEFINITIONS.find((c) => c.id === g.concernId)?.name ?? g.concernId;
  const src = g.sources.map((s) => esc(s)).join("<br>");
  const row = (label: string, text: string) => {
    k++;
    return `<tr><th>E${k}<br><small>${label}</small></th><td>${esc(text)}</td><td class="src">${src}</td>${BOX}</tr>`;
  };
  return `<article id="e-${g.concernId}">
<h3>${esc(name)} <code>${g.concernId}</code> <span class="order">fair trial: ${g.trialWeeks === null ? "n/a" : `${g.trialWeeks} week${g.trialWeeks === 1 ? "" : "s"}`}</span></h3>
<table><thead><tr><th>#</th><th>Statement shown</th><th>Source note</th><th>Sign-off</th></tr></thead><tbody>
${row("Fair OTC trial", g.fairTrial)}
${g.seeDermatologistIf.map((s) => row("See a dermatologist if", s)).join("\n")}
${g.urgent.map((s) => row("Get care right away", s)).join("\n")}
</tbody></table>
<div class="review"><span>☐ Approve concern as written</span><span>☐ Approve with edits</span><span>☐ Don't publish</span><div class="notes">Notes:</div></div>
</article>`;
}

// Fixed UI copy that carries clinical meaning (kept in sync by hand with the components).
const UI_COPY: [string, string][] = [
  ["Profile option (profile-editor.tsx)", "Pregnant or trying · Breastfeeding. Optional. Product pages will note ingredients that published guidance suggests avoiding or asking about at this time. It doesn't change match scores, and it isn't medical clearance — talk to your OB or dermatologist."],
  ["Product notice title (pregnancy-notice.tsx)", "“Contains an ingredient usually avoided during pregnancy” (avoid) / “Worth checking during pregnancy” (caution); “while breastfeeding” variants. Amber box for avoid, neutral for caution, never red."],
  ["Product notice, nothing flagged", "Nothing in this ingredient list is on our list to avoid or ask about during pregnancy. Generally considered OK: …"],
  ["Product notice footer", "A screen of the published ingredient list against general published guidance, not medical clearance for you. Talk to your OB or dermatologist before starting or stopping anything."],
  ["Low-on-list hint", "“listed low on the ingredients, likely a small amount” when an ingredient sits past position 12 of a cosmetic list."],
  ["Listing filter (browse, concern pages)", "Hide products to avoid in pregnancy. Hides products listing an ingredient usually avoided in pregnancy (retinoids, hydroquinone, coal tar), and products without a full ingredient list, since they can't be checked. Not medical clearance — talk to your OB or dermatologist."],
  ["Guide page /guide/pregnancy-breastfeeding", "Most skincare is fine to keep using. A few ingredients are usually set aside during pregnancy, and a few more are worth a question. … This is general information, not medical clearance. Your situation may differ. Talk to your OB or dermatologist before starting or stopping any product, and don't stop a prescribed medicine on your own."],
  ["Guide page: sun protection", "Melasma (the “mask of pregnancy”) often appears or darkens during pregnancy, and sun exposure drives it. A broad-spectrum sunscreen every day, plus shade and a hat, is one of the most useful things you can keep doing. Mineral (zinc oxide, titanium dioxide) sunscreens are a common choice if you'd rather skip chemical filters."],
  ["Escalation footnote (escalation-guidance.tsx)", "General information from OTC labeling and dermatology guidelines, not a diagnosis or advice about your skin."],
  ["Dermatologist finder link", `${DERM_FINDER.label} → ${DERM_FINDER.href}. ${DERM_FINDER.provider}`],
  ["Shelf prompt", "Not seeing results? Some products didn't help, by your answers. Here's how long a fair try usually is, and when it's worth seeing a dermatologist. (Shown per concern when the visitor answered “didn't help” for a product they own or finished.)"],
];

const OPEN_QUESTIONS = [
  "Retinyl esters (retinyl palmitate etc.) are classed <b>caution</b>, not avoid, in pregnancy. Some patient guidance lumps every vitamin A derivative together as “avoid”. Retinyl palmitate is in ~285 catalog products, often low on the list as an antioxidant (including sunscreens), so “avoid” would flag many products. Which do you want?",
  "Cosmetic retinol / retinal / HPR are <b>avoid</b> in pregnancy at any list position, with a “likely a small amount” hint past position 12. Should a trace retinoid low on a cosmetic list still read as “usually avoided”?",
  "Salicylic acid: leave-on is <b>caution</b> (limited areas OK, no peels / large areas / occlusion); rinse-off cleansers and shampoos are <b>OK</b>. ACOG's FAQ lists topical salicylic acid among generally acceptable OTC acne options, so caution for a 2% face product may be more conservative than you want. “Rinse-off” is inferred from the product name / form (cleanser, wash, shampoo, scalp), so a leave-on scalp serum is treated as rinse-off.",
  "Oxybenzone is <b>caution</b> in pregnancy (weak, mixed observational data) and <b>OK</b> in lactation. That flags ~1,200 catalog products (mostly sunscreens) for pregnant users. Keep, downgrade to OK with a note, or upgrade?",
  "Topical retinoids and adapalene in lactation are <b>caution</b> (LactMed: low risk, keep off the breast). Hydroquinone in lactation is <b>caution</b>; coal tar in lactation is <b>caution</b>. Is any of these better as avoid?",
  "Kojic acid, arbutin, tranexamic acid and bakuchiol are <b>caution</b> purely for lack of data (no studies found). Is “ask first” right, or would you rather call these OK?",
  "Butenafine, tolnaftate and undecylenic acid are <b>OK</b> on minimal absorption with little or no pregnancy data. Selenium sulfide shampoo is OK as rinse-off. Agree?",
  "Not classified at all: methyl salicylate (pain-rub use in late pregnancy is an NSAID-like concern; in our catalog it's mostly flavor/fragrance at low levels), essential oils, hair dye / hydrogen peroxide, minoxidil (not in catalog), tea tree. Add any?",
  "The pregnancy listing filter hides only <b>avoid</b> ingredients, and also hides every product without a full ingredient list (consistent with the other filters). On /concern/acne that takes 1,322 products to 775. OK?",
  "Breastfeeding-only users get no listing filter (nothing is classed avoid for lactation). Fine?",
  "Escalation: acne fair trial 12 weeks; antifungal 2 weeks (jock itch) / 4 weeks (athlete's foot, ringworm) per 21 CFR 333.250; dandruff ~4 weeks (the monograph only says “if it doesn't improve with regular use”); itch 7 days per the hydrocortisone label; dry skin 7 days per 21 CFR 347.50 but “a couple of weeks” for eczema routines; sweating “a few weeks” (no guideline number found); brightening 8–12 weeks. Please confirm or replace each number.",
  "Acne red flag “acne that starts suddenly in adulthood, especially with irregular periods or new hair growth” hints at hyperandrogenism without naming it. Too close to diagnosis, or useful?",
  "Universal urgent signs (911 for airway swelling; emergency care for rash + fever + blistering/mucosal sores after a new medicine) are shown on every escalation panel. Keep them on every concern?",
  "Privacy: pregnancy status is consumer health data under WA My Health My Data Act and similar laws (project.md §2). It lives only in the visitor's httpOnly profile cookie and is read per request to render the page; it isn't stored server-side or logged. Worth a line in the privacy policy and an attorney check before launch.",
  "Many AAD sources are cited as “AAD public guidance on …” rather than an exact page title / URL, because the drafter couldn't verify exact titles. Kaplan et al. (hydroquinone review) is cited without a year for the same reason. Please confirm or replace.",
];

const pregnancyByLevel = (["avoid", "caution", "ok"] as SafetyLevel[]).map((lvl) => ({
  lvl,
  entries: PREGNANCY_ENTRIES.filter((e) => e.pregnancy.level === lvl),
}));
const statementCount = ESCALATION_GUIDANCE.reduce((t, g) => t + 1 + g.seeDermatologistIf.length + g.urgent.length, 0);
const today = new Date().toISOString().slice(0, 10);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Actively pregnancy mode &amp; escalation guidance — draft for review</title>
<style>
:root{--ink:#141b24;--muted:#5d646c;--line:#d7d4cc;--paper:#f6f4ee;--card:#fff;--teal:#006761;--amber:#8a5a00}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 Georgia, "Times New Roman", serif}
main{max-width:960px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:32px;margin:0 0 4px} h2{font-size:24px;margin:48px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--teal)}
h3{font:600 18px/1.3 system-ui,sans-serif;margin:0 0 8px} h4{font:600 13px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:14px 0 4px}
code{font:12px ui-monospace,monospace;color:var(--muted);background:#eeece5;padding:1px 6px;border-radius:4px;margin-left:6px}
.order{font:12px system-ui,sans-serif;color:var(--muted);margin-left:6px}
article{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:14px 0;break-inside:avoid}
ul{margin:4px 0;padding-left:22px} .meta,.sources{font-family:system-ui,sans-serif;font-size:14px} .sources{color:var(--muted)}
.review{margin-top:14px;padding-top:12px;border-top:1px dashed var(--line);display:flex;flex-wrap:wrap;gap:18px;font:14px system-ui,sans-serif}
.notes{flex-basis:100%;min-height:44px;color:var(--muted)}
.callout{background:#fff8e6;border:1px solid #f0d58a;border-radius:14px;padding:14px 18px} .callout li{margin:6px 0}
.lede{color:var(--muted)} nav a{color:var(--teal)} nav{font:14px system-ui,sans-serif;columns:2}
table{width:100%;border-collapse:collapse;font:14px/1.45 system-ui,sans-serif;margin-top:8px}
th,td{border:1px solid var(--line);padding:6px 8px;vertical-align:top;text-align:left} thead th{background:#eeece5;font-weight:600}
tbody th{width:110px;font-weight:600} td.src{width:28%;color:var(--muted);font-size:12px} td.box{width:84px;white-space:nowrap;font-size:13px}
.lvl{display:inline-block;font-size:12px;font-weight:600;border-radius:999px;padding:0 8px;margin-right:4px;border:1px solid}
.lvl.avoid{color:#8a3b00;border-color:#e3a36b;background:#fff1e3} .lvl.caution{color:#0b4f71;border-color:#86bfdc;background:#eaf6fc} .lvl.ok{color:#14613a;border-color:#8fcca8;background:#ebf8f0}
pre{font:13px ui-monospace,monospace;background:#eeece5;padding:10px 12px;border-radius:8px;white-space:pre-wrap}
@media print{body{background:#fff} article{border-color:#bbb}}
</style></head><body><main>
<h1>Actively pregnancy mode &amp; escalation guidance — draft for review</h1>
<p class="lede">Generated ${today} from <code>app/src/db/pregnancy-lactation.ts</code> and <code>app/src/db/escalation-guidance.ts</code> · ${PREGNANCY_ENTRIES.length} ingredient classifications · ${ESCALATION_GUIDANCE.length} concerns, ${statementCount} escalation statements${dbNote}</p>

<h2>How to review</h2>
<p>Everything below was drafted by Claude (AI) for your review as the site's board-certified dermatologist. None of it is live in production: both features sit behind flags that are <b>off in production</b> and on only in local development.</p>
<p>Tick one box per row (and per entry) and note edits. Send the marked-up file back, or list row numbers and changes, and the edits get applied before either flag is turned on. This file is regenerated from the source data with <code>npx tsx src/db/clinical-review.ts</code> (run in <code>app/</code>), so it always matches what would ship.</p>
<p>Drafting rules: mainstream guidance only (ACOG, AAD, peer-reviewed reviews, NIH LactMed, FDA OTC labeling). Levels reflect the evidence rather than blanket caution, and every notice says it isn't medical clearance and to talk to an OB or dermatologist. Escalation text says when to get seen, never what a condition is.</p>

<h2>Turning the features on</h2>
<p>Flags live in <code>app/src/lib/feature-flags.ts</code>. Each is OFF when <code>NODE_ENV=production</code> and ON otherwise, unless its environment variable overrides it (<code>on</code>/<code>1</code>/<code>true</code> or <code>off</code>/<code>0</code>/<code>false</code>). After sign-off, set the variable on the production service (e.g. Railway → Variables) and redeploy or restart:</p>
<pre>FEATURE_PREGNANCY_MODE=on   # Part A: profile options, product notices, listing filter, /guide/pregnancy-breastfeeding
FEATURE_ESCALATION=on       # Part B: "When OTC isn't enough" on concern pages, My regimen and My shelf</pre>
<p>While a flag is off: the profile options are hidden (any saved choice stays in the visitor's cookie, unused), notices and filters don't render, <code>?pregnancy=hide</code> is ignored, and the guide page returns 404 and is left out of the sitemap.</p>

<h2>Where it shows</h2>
<ul class="meta">
<li><b>Part A, pregnancy &amp; breastfeeding mode.</b> Two optional checkboxes on <code>/profile</code> (“Pregnant or trying”, “Breastfeeding”, stored in the profile cookie). With either set, product pages show a notice for any avoid / caution ingredient in the published list or label actives (rinse-off products use their rinse-off level). <code>/browse</code> and <code>/concern/*</code> offer “Hide products to avoid in pregnancy” (pregnant flag only). New explainer page <code>/guide/pregnancy-breastfeeding</code>. The match score is unchanged.</li>
<li><b>Part B, when OTC isn't enough.</b> A full panel at the bottom of each <code>/concern/*</code> page (with a jump link under the red-flag banner); a collapsible list on <code>/regimen</code> for the concerns its products cover; on <code>/shelf</code>, for concerns where the visitor answered “didn't help”. Each includes a neutral link to the AAD's public dermatologist finder; <code>app/src/lib/derm-finder.ts</code> is the one place to swap in a referral partner (setting <code>paid: true</code> adds a disclosure next to the link).</li>
</ul>

<h2>Open questions to resolve first</h2>
<div class="callout"><ol>${OPEN_QUESTIONS.map((q) => `<li>${q}</li>`).join("")}</ol></div>

<h2>Contents</h2>
<nav>${pregnancyByLevel.map((g) => `<div><a href="#lvl-${g.lvl}">Pregnancy: ${LEVEL[g.lvl]}</a> (${g.entries.length})</div>`).join("")}<div><a href="#escalation">When OTC isn't enough</a> (${ESCALATION_GUIDANCE.length})</div><div><a href="#ui-copy">Fixed UI copy</a> (${UI_COPY.length})</div></nav>

<h2>Part A — Pregnancy &amp; breastfeeding classifications</h2>
<p class="meta">Levels: <span class="lvl avoid">Avoid</span> mainstream guidance says don't use it during this time (often precautionary) · <span class="lvl caution">Caution / ask first</span> fine in limited use, or not enough data · <span class="lvl ok">Generally OK</span> acceptable in normal use. Grouped by pregnancy level. The first entry whose patterns match an ingredient slug claims it; salicylate esters (butyloctyl, benzyl, tridecyl, methyl salicylate) deliberately don't match salicylic acid.</p>
${pregnancyByLevel.map((g) => `<section id="lvl-${g.lvl}"><h2>Pregnancy: ${LEVEL[g.lvl]}</h2>${g.entries.map(entryHtml).join("\n")}</section>`).join("\n")}

<section id="escalation"><h2>Part B — When OTC isn't enough</h2>
<p class="meta">Shown with every concern's panel, under “Get care right away”:</p>
<table><thead><tr><th>#</th><th>Statement shown</th><th>Source note</th><th>Sign-off</th></tr></thead><tbody>
${UNIVERSAL_URGENT.map((s, i) => `<tr><th>U${i + 1}</th><td>${esc(s)}</td><td class="src">${ESCALATION_URGENT_SOURCES.map(esc).join("<br>")}; general emergency-care guidance</td>${BOX}</tr>`).join("\n")}
</tbody></table>
${ESCALATION_GUIDANCE.map(escalationHtml).join("\n")}
</section>

<section id="ui-copy"><h2>Fixed UI copy</h2>
<table><thead><tr><th>Where</th><th>Text</th><th>Sign-off</th></tr></thead><tbody>
${UI_COPY.map(([w, t]) => `<tr><th style="width:200px">${esc(w)}</th><td>${esc(t)}</td>${BOX}</tr>`).join("\n")}
</tbody></table>
</section>
</main></body></html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`Wrote ${OUT}: ${PREGNANCY_ENTRIES.length} classifications, ${statementCount} escalation statements.`);
