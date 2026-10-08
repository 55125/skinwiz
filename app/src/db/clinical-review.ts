// Writes review/clinical-content-review.html (repo root) -- the
// dermatologist's sign-off copy of the gated clinical content:
// pregnancy/lactation classifications (db/pregnancy-lactation.ts) and
// "When OTC isn't enough" guidance (db/escalation-guidance.ts), plus Part D:
// the clinical calls made after the persona test and already live
// (lib/listing-rules.ts, lib/retinoids.ts, the retinoid and kids guides).
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
import { ECZEMA_EXCLUDED_ACTIVES } from "../lib/listing-rules";
import { POTENT_RETINOIDS, RETINYL_ESTERS } from "../lib/retinoids";
import { RULES as ROUTINE_RULES } from "../lib/routine-conflicts";
import { SENSITIVE_SKIN_FREE } from "../lib/profile-shared";
import { ALL_HANDOUT_TEMPLATES } from "./handout-templates";

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

// How the screen turns the classifications above into what visitors see.
// Hand-kept in sync with db/pregnancy-lactation.ts, lib/pregnancy.ts,
// lib/queries.ts and components/pregnancy-notice.tsx.
const RULES: [string, string, string][] = [
  ["C1", "What gets screened", "Every ingredient on a product's published list, at any position, plus the label's canonical active ingredients (treated as position 0). Each ingredient slug is tried against the classifications in order and the <b>first entry that matches claims it</b>, so specific entries must sit before broad ones. Salicylate esters used as emollients, fragrance or sunscreen filters are deliberately <i>not</i> treated as salicylic acid."],
  ["C2", "What is <i>not</i> screened", `Only ${PREGNANCY_ENTRIES.length} classified groups are checked. Everything else is silently unscreened: fragrance/parfum (a listed allergen or a hidden blend), most preservatives, surfactants, emollients, peptides and plant extracts. “Nothing flagged” therefore means <b>no screened ingredient was found</b>, not that the product is safe, and the notice wording is written to say exactly that.`],
  ["C3", "Products with no full ingredient list", "Only the label's active ingredients are checked, and the product-page notice says so. The listing filter <b>hides</b> these products, because “couldn't check” is never treated as “clear”."],
  ["C4", "One level per ingredient, per mode", "Each classified ingredient gets a pregnancy level and a lactation level (avoid / caution / ok). When the visitor has both boxes ticked, the notice shows both lines for every flagged ingredient and sorts by whichever mode is worse."],
  ["C5", "Rinse-off versus leave-on", "A product whose name or form reads as a cleanser, wash, soap, scrub, bar, micellar water, shampoo, scalp treatment or conditioner is treated as <b>rinse-off</b>, and uses an entry's rinse-off level where one exists. Only <b>salicylic acid</b> has one today (leave-on caution, rinse-off OK). Rinse-off is inferred from the name, so a leave-on scalp serum is treated as rinse-off. The listing filter ignores rinse-off downgrades; none currently applies to an avoid-level entry."],
  ["C6", "List position", "Position never changes a level. Past position 12 of a cosmetic list the notice adds “listed low on the ingredients, likely a small amount”, but the ingredient is still flagged. The <b>listing filter ignores position entirely</b>: an avoid-level ingredient anywhere on the list hides the product."],
  ["C7", "What the product-page notice says", "Avoid-level findings: an amber box titled “Contains an ingredient usually avoided during pregnancy” (or “while breastfeeding”). Caution-level only: a neutral box, “Worth checking during pregnancy”. Nothing flagged: “Nothing in this ingredient list is on our list to avoid or ask about…”, followed by “Generally considered OK: …” naming the ok-level ingredients found. Never red, and always footed as a screen of the label, not medical clearance."],
  ["C8", "The listing filter", "“Hide products to avoid in pregnancy” (browse and concern pages) hides products with an <b>avoid-level pregnancy</b> ingredient, and products with no full list (C3). <b>Caution-level</b> products stay visible; their ingredients appear only in the product-page notice. It looks at pregnancy only: breastfeeding has no listing filter, since nothing is classed avoid for lactation. It is offered only when the profile says pregnant (or via a <code>?pregnancy=hide</code> link), and is never applied silently."],
  ["C9", "There is no “safe” label", "Nothing on the site marks a product “pregnancy safe”, and there is no positive “show only products with nothing flagged” filter. The closest wording is “Generally considered OK” next to individual ingredients."],
  ["C10", "Score and storage", "The match score is unchanged by these flags. The two answers live only in the visitor's browser cookie (never stored in the database, even for signed-in visitors) and are read per request to render the page."],
  ["C11", "Keeping it current", "The classifications are fixed text in the code with the sources they were drafted from. Nothing prompts a re-review when guidance changes (ACOG, AAD, LactMed), and nothing records who signed off on which version."],
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
  "Rules C2/C9: the screen checks only the classified groups, so a product with nothing flagged still contains unscreened ingredients (fragrance, preservatives, surfactants). The notice says “not on our list to avoid or ask about”, and nothing is ever labelled “safe”. Is that the right posture, or should the notice also say how many ingredients were screened?",
  "Rule C8: the filter ignores <b>caution</b>-level ingredients. Should there be a stricter option that also hides caution products (for example oxybenzone sunscreens), or a positive “nothing flagged” view? Or is hiding avoid-only the right default?",
  "Rule C6: the filter ignores list position, so a trace retinoid at position 25 hides a product while the notice only adds a “likely a small amount” hint. Should the filter use a cutoff, or is “any amount” the intended conservative rule?",
  "Rule C7: the notice names ingredients as “Generally considered OK” (benzoyl peroxide, niacinamide, vitamin C, azelaic acid and others). Each ok entry now stands behind a positive statement on a product page. Is that wording acceptable, or should ok-level ingredients not be named?",
  "Rule C11: should the classifications have a review cadence (for example yearly, or when ACOG/AAD/LactMed change), and should each entry carry a reviewed-by and date?",
  "Escalation: acne fair trial 12 weeks; antifungal 2 weeks (jock itch) / 4 weeks (athlete's foot, ringworm) per 21 CFR 333.250; dandruff ~4 weeks (the monograph only says “if it doesn't improve with regular use”); itch 7 days per the hydrocortisone label; dry skin 7 days per 21 CFR 347.50 but “a couple of weeks” for eczema routines; sweating “a few weeks” (no guideline number found); brightening 8–12 weeks. Please confirm or replace each number.",
  "Acne red flag “acne that starts suddenly in adulthood, especially with irregular periods or new hair growth” hints at hyperandrogenism without naming it. Too close to diagnosis, or useful?",
  "Universal urgent signs (911 for airway swelling; emergency care for rash + fever + blistering/mucosal sores after a new medicine) are shown on every escalation panel. Keep them on every concern?",
  "Privacy: pregnancy status is consumer health data under WA My Health My Data Act and similar laws (project.md §2). It lives only in the visitor's httpOnly profile cookie and is read per request to render the page; it isn't stored server-side or logged. Worth a line in the privacy policy and an attorney check before launch.",
  "Many AAD sources are cited as “AAD public guidance on …” rather than an exact page title / URL, because the drafter couldn't verify exact titles. Kaplan et al. (hydroquinone review) is cited without a year for the same reason. Please confirm or replace.",
];

// ---- Part D: live since 2026-10-08, review after the fact ------------------
// Michael asked for best judgement on these and said he'd review them on the
// live site. Constants are read from the code; prose rows are hand-kept in
// sync with the files named in each row.
const D_RANKING: [string, string, string][] = [
  ["D1", "Eczema list: left out", `Products whose actives include ${ECZEMA_EXCLUDED_ACTIVES.map((a) => `<code>${a}</code>`).join(" ")} are not shown on <code>/concern/dry-skin-eczema</code> (they keep their own pages and stay in search). Reason given in code: topical diphenhydramine is a common cause of allergic contact dermatitis and isn't recommended for eczema; antifungals treat a different problem. Sources cited: AAD “Eczema: self-care”; AAD atopic dermatitis guidelines 2023. <i>lib/listing-rules.ts</i>`],
  ["D2", "Eczema list: ranked lower", "Diaper-area products, lip products and anything with chemical sunscreen filters (SPF day creams) rank after general eczema care. Diaper products carry a “For the diaper area” label. Petrolatum and colloidal oatmeal protectants now lead the list. <i>lib/listing-rules.ts</i>"],
  ["D3", "Sun list order", "Tier 1: name says SPF 30 or higher <b>and</b> broad spectrum (from the label or the name). Tier 2: other sunscreens. Tier 3: makeup with SPF (foundation, BB/CC cream, lip, powder…), SPF under 30, and labels with the “sunburn only” skin-aging alert. Within a tier, FDA OTC drugs first, then listings with a photo. Source cited: AAD “How to select a sunscreen”. <i>lib/listing-rules.ts</i>"],
  ["D4", "Above the OTC limit", "A product whose stated strength is above its OTC monograph maximum (today: salicylic acid 2.88% on the acne list) is left off concern lists. Its page says: “Salicylic acid is listed at 2.88%, above the 2% OTC limit. That's usually a filing error, so check the strength on the package. Until it's clear, we leave this product off our concern lists.” <i>product/[id]/page.tsx</i>"],
  ["D5", "Sensitive skin", `One-tap “Sensitive skin” filter on every product list = ${SENSITIVE_SKIN_FREE.join(" + ")}. The profile's new “My skin is sensitive” checkbox (separate from Oily / Dry / Combination / Normal) scores −12 for each of fragrance, drying alcohol and essential oils, and +8 when none is present. <i>lib/profile-shared.ts</i>`],
];

const D_RETINOIDS: [string, string, string][] = [
  ["D6", "What counts as a retinoid", `At any position on the list: ${POTENT_RETINOIDS.map((r) => `<code>${r}</code>`).join(" ")}. Only near the top of a cosmetic list (position 15 or above, like other ingredients), because they're weaker and often a trace antioxidant: ${RETINYL_ESTERS.map((r) => `<code>${r}</code>`).join(" ")}. Used for the regimen cautions below and the “Fine lines &amp; aging” match score. Before this change only the word “retinol” was caught, so INKEY Retinol (retinyl acetate + HPR) got no caution. <i>lib/retinoids.ts</i>`],
  ...ROUTINE_RULES.filter((r) => r.a === "retinoid" || r.b === "retinoid").map((r, i): [string, string, string] => [
    `D${7 + i}`,
    `Regimen caution: retinoid + ${r.b === "retinoid" ? r.a : r.b}`,
    `${esc(r.note)} <i>lib/routine-conflicts.ts</i>`,
  ]),
  ["D9", "“Also using a prescription retinoid?” (regimen)", "Tretinoin, tazarotene or another retinoid from your doctor. Mark when you use it (Morning / Night / Both) and the cautions on this page take it into account. Keep using it exactly as your prescriber told you; we don't give directions for prescription medicines. Stores no product and no dose. <i>components/rx-retinoid-card.tsx</i>"],
];

// /guide/prescription-retinoids, statement by statement (hand-kept in sync).
const D_RX_GUIDE: [string, string][] = [
  ["Header", "Tretinoin (Retin-A and others), prescription-strength adapalene, tazarotene or trifarotene. The everyday products around it make a real difference to how well you tolerate it."],
  ["Box", "Your prescriber's directions come first. This page is general information about the skincare around a prescription, not instructions for the medicine itself. Actively never tells you how much to use, how often, or whether to start or stop. Ask your prescriber before changing how you use it."],
  ["Pairs well", "A gentle, non-medicated cleanser. Fragrance-free, without scrubbing beads or acids."],
  ["Pairs well", "A fragrance-free moisturizer. Dryness and peeling are the most common side effects, and moisturizing helps. Ask your prescriber whether to apply it before or after the retinoid."],
  ["Pairs well", "Broad-spectrum sunscreen, SPF 30 or higher, every morning. Retinoids make skin more sensitive to the sun, and their labels say to limit sun exposure and use sun protection."],
  ["Space out", "Exfoliating acids (glycolic, lactic, mandelic, salicylic). Together with a retinoid they add up to more dryness and irritation. Many people keep them to different nights, or skip them while getting used to the retinoid."],
  ["Space out", "Benzoyl peroxide with tretinoin. Benzoyl peroxide can break down tretinoin, so the two are usually used at different times of day unless your prescription is made to be combined."],
  ["Space out", "Another retinoid on top, such as an over-the-counter retinol serum or adapalene gel. Doubling up adds irritation without being part of the plan."],
  ["Space out", "Scrubs, cleansing brushes, astringent or alcohol toners, and waxing on treated skin, which can lift fragile skin."],
  ["First weeks", "Dryness, redness, flaking and stinging are common at first and usually ease as skin adjusts. For acne, breakouts can look a little worse before they get better, and real improvement usually takes 8 to 12 weeks of steady use."],
  ["First weeks", "Call your prescriber if irritation is severe or doesn't settle, if you have swelling or blistering, or if you are pregnant, planning a pregnancy or breastfeeding."],
  ["Sources", "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol 2024;90(5):1006.e1-30 (AAD) · FDA prescribing information: tretinoin cream and gel; tazarotene (pregnancy) · AAD acne patient education"],
  ["Indexing", "Not indexed by search engines (robots noindex) until you approve it. Linked from the tretinoin search pointer, the regimen's prescription-retinoid option and retinoid ingredient pages."],
];

const KIDS = ALL_HANDOUT_TEMPLATES.filter((t) => t.category === "pediatric");

const D_WORDING: [string, string][] = [
  ["Handout review note (replaces the per-handout “Draft” badge)", "Unreviewed: “Drafted with AI assistance; physician review in progress.” Once a template is marked reviewed: “Drafted with AI assistance and reviewed by the site's dermatologist before clinical use.” Shown once per page in small type on /clinic-tools, each handout, /guide/kids and the retinoid guide."],
  ["Derm Score", "Described everywhere as planned: “Actively is building the Derm Score instead: a rating from a verified panel of board-certified dermatologists. The panel hasn't launched, so no product has a Derm Score yet.” (/for-clinicians, /about, /terms, footer)"],
  ["Nickel note (patch-test sheet and patient import page)", "Mostly from metal, not product labels: jewelry, belt buckles, jeans buttons, eyeglass frames, keys and metal tools like eyelash curlers."],
  ["Ingredient checker", "Found allergens are grouped under their patch-test mix, e.g. “Fragrance mix I: Cinnamal, Eugenol, Hydroxycitronellal”. Its “similar formula” suggestions are screened against the visitor's avoid list, or against fragrance when the pasted list contains any."],
  ["Search pointers", "Searching tretinoin, Retin-A, Tazorac, tazarotene or trifarotene, “kids” or “HSA” shows a pointer to the retinoid guide, /guide/kids or the HSA/FSA guide above the results."],
];

const D_QUESTIONS = [
  "D1: also leave out topical hydrocortisone from the eczema list, or keep it (it's appropriate short-term for flares)? It's kept today.",
  "D2/D3: are the tier rules right, and should the sun list also demote chemical-filter products for people who've marked sensitive skin?",
  "D6: retinyl esters only count in the top 15 ingredients. Agree, or should any retinyl ester count for the retinoid + acid caution?",
  "Retinoid guide: is the benzoyl peroxide line right now that some tretinoin formulations (microsphere) are photostable and BPO-compatible? It says “unless your prescription is made to be combined”.",
  "Kids guides: parents see each pediatric handout's education, OTC steps and stop rules; prescription steps are hidden. Any handout that shouldn't be public at all (for example ones that only make sense with a visit)?",
  "Once you've read them: mark which handouts are reviewed (the <code>reviewed</code> flag in the handout library), so the note switches to “reviewed by the site's dermatologist”.",
  "Data: “Differin Epiduo” (NDC 0299-4908, adapalene 0.1% / benzoyl peroxide 2.5%) is listed as OTC. Checked: its FDA SPL is filed as HUMAN OTC DRUG with a Drug Facts label, and differin.com sells it, so the listing looks correct (Epiduo Forte 0.3% stays Rx). Agree?",
  "Catalog gaps, no listing at all: Jergens Ultra Healing, Paula's Choice 2% BHA, Supergoop Unseen, La Roche-Posay Anthelios, PanOxyl Foaming Wash, Hero Mighty Patch, Nizoral, Sarna, Curel Itch Defense, Lubriderm Daily Moisture. Which should be added first?",
];

const pregnancyByLevel = (["avoid", "caution", "ok"] as SafetyLevel[]).map((lvl) => ({
  lvl,
  entries: PREGNANCY_ENTRIES.filter((e) => e.pregnancy.level === lvl),
}));
const statementCount = ESCALATION_GUIDANCE.reduce((t, g) => t + 1 + g.seeDermatologistIf.length + g.urgent.length, 0);
const today = new Date().toISOString().slice(0, 10);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Actively clinical content — draft for review</title>
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
<h1>Actively clinical content — draft for review</h1>
<p class="lede">Generated ${today} from <code>app/src/db/pregnancy-lactation.ts</code>, <code>app/src/db/escalation-guidance.ts</code> and the Part D sources · ${PREGNANCY_ENTRIES.length} ingredient classifications · ${ESCALATION_GUIDANCE.length} concerns, ${statementCount} escalation statements · Part D: ${D_RANKING.length + D_RETINOIDS.length} rules, ${D_RX_GUIDE.length} retinoid-guide statements, ${KIDS.length} parent guides${dbNote}</p>
<div class="callout"><b>New in this version: <a href="#part-d">Part D</a>.</b> Clinical calls made on 2026-10-08 after the 10-persona site test, using best judgement as you asked. Unlike Parts A and B, <b>these are already live</b>: eczema and sun list rules, retinoid detection and regimen cautions, the prescription retinoid guide, parent access to the pediatric handouts, and review-note and Derm Score wording. Mark them the same way; edits get applied straight to the live site.</div>

<h2>How to review</h2>
<p>Everything below was drafted by Claude (AI) for your review as the site's board-certified dermatologist. Both features sit behind flags that default to <b>off in production</b> (see the status check below for what is live today).</p>
<p>Tick one box per row (and per entry) and note edits. Send the marked-up file back, or list row numbers and changes, and the edits get applied before either flag is turned on. This file is regenerated from the source data with <code>npx tsx src/db/clinical-review.ts</code> (run in <code>app/</code>), so it always matches what would ship.</p>
<p>Drafting rules: mainstream guidance only (ACOG, AAD, peer-reviewed reviews, NIH LactMed, FDA OTC labeling). Levels reflect the evidence rather than blanket caution, and every notice says it isn't medical clearance and to talk to an OB or dermatologist. Escalation text says when to get seen, never what a condition is.</p>

<div class="callout"><b>Status check, ${today}:</b> the live site is currently serving both features, even though the code defaults them to off in production. The pregnancy guide page, the profile checkboxes and the “When OTC isn't enough” panels are all reachable. <code>FEATURE_PREGNANCY_MODE</code> and <code>FEATURE_ESCALATION</code> are set in the production environment (outside the repo); the Rx catalog is <b>not</b> live (<code>/rx</code> returns 404); the clinician handout library at <code>/clinic-tools</code> is. To switch the two clinical features off until sign-off, set both to <code>off</code> in the hosting environment and redeploy.</div>
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
<nav>${pregnancyByLevel.map((g) => `<div><a href="#lvl-${g.lvl}">Pregnancy: ${LEVEL[g.lvl]}</a> (${g.entries.length})</div>`).join("")}<div><a href="#rules">How the screen decides (rules)</a> (${RULES.length})</div><div><a href="#escalation">When OTC isn't enough</a> (${ESCALATION_GUIDANCE.length})</div><div><a href="#ui-copy">Fixed UI copy</a> (${UI_COPY.length})</div><div><a href="#part-d">Part D: live since 2026-10-08</a> (${D_RANKING.length + D_RETINOIDS.length + D_RX_GUIDE.length + KIDS.length + D_WORDING.length})</div></nav>

<h2>Part A — Pregnancy &amp; breastfeeding classifications</h2>
<p class="meta">Levels: <span class="lvl avoid">Avoid</span> mainstream guidance says don't use it during this time (often precautionary) · <span class="lvl caution">Caution / ask first</span> fine in limited use, or not enough data · <span class="lvl ok">Generally OK</span> acceptable in normal use. Grouped by pregnancy level. The first entry whose patterns match an ingredient slug claims it; salicylate esters (butyloctyl, benzyl, tridecyl, methyl salicylate) deliberately don't match salicylic acid.</p>
${pregnancyByLevel.map((g) => `<section id="lvl-${g.lvl}"><h2>Pregnancy: ${LEVEL[g.lvl]}</h2>${g.entries.map(entryHtml).join("\n")}</section>`).join("\n")}

<section id="rules"><h2>Part C — How the screen decides: the rules</h2>
<p class="meta">The classifications above say what each ingredient is. These rules say how they are applied to a product and what a visitor sees. Please check them as carefully as the entries: they decide what “screened” means.</p>
<table><thead><tr><th>#</th><th>Rule</th><th>What the code does</th><th>Sign-off</th></tr></thead><tbody>
${RULES.map(([id, t, d]) => `<tr><th>${id}</th><td><b>${t}</b></td><td>${d}</td>${BOX}</tr>`).join("\n")}
</tbody></table>
</section>

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

<section id="part-d"><h2>Part D — Live since 2026-10-08: persona-test follow-ups</h2>
<p class="meta">Drafted by Claude (AI) on your instruction to use best judgement and review on the live site. Everything here is <b>already live</b> on activelyskin.com. Constants (ingredient lists, filter definitions, caution notes) are read from the code when this file is generated.</p>

<h3>Questions for you</h3>
<div class="callout"><ol>${D_QUESTIONS.map((q) => `<li>${q}</li>`).join("")}</ol></div>

<h3 style="margin-top:24px">List ranking and filters</h3>
<table><thead><tr><th>#</th><th>Rule</th><th>What the site does</th><th>Sign-off</th></tr></thead><tbody>
${D_RANKING.map(([id, t, d]) => `<tr><th>${id}</th><td><b>${t}</b></td><td>${d}</td>${BOX}</tr>`).join("\n")}
</tbody></table>

<h3 style="margin-top:24px">Retinoids</h3>
<table><thead><tr><th>#</th><th>Rule</th><th>What the site does</th><th>Sign-off</th></tr></thead><tbody>
${D_RETINOIDS.map(([id, t, d]) => `<tr><th>${id}</th><td><b>${t}</b></td><td>${d}</td>${BOX}</tr>`).join("\n")}
</tbody></table>

<article id="d-rx-guide"><h3>Guide: “Using a prescription retinoid?” <code>/guide/prescription-retinoids</code></h3>
<table><thead><tr><th>#</th><th>Statement shown</th><th>Sign-off</th></tr></thead><tbody>
${D_RX_GUIDE.map(([w, t], i) => `<tr><th>R${i + 1}<br><small>${esc(w)}</small></th><td>${esc(t)}</td>${BOX}</tr>`).join("\n")}
</tbody></table>
<div class="review"><span>☐ Approve guide as written</span><span>☐ Approve with edits</span><span>☐ Take it down</span><div class="notes">Notes:</div></div>
</article>

<article id="d-kids"><h3>Children's skin guides for parents <code>/guide/kids</code></h3>
<p class="meta">The ${KIDS.length} pediatric handouts from the clinician library, readable without signing in and not indexed by search engines. Each shows the handout's education sections, its over-the-counter steps, its stop rules plus the universal ones, and its sources, under a note that “we” means the child's own doctor. <b>Prescription steps are hidden.</b> The full text of each is in <code>review/handout-library-review.html</code>.</p>
<table><thead><tr><th>#</th><th>Guide</th><th>Shown to parents</th><th>Hidden</th><th>Reviewed?</th><th>Sign-off</th></tr></thead><tbody>
${KIDS.map((t, i) => {
  const otc = t.steps.filter((x) => x.kind === "otc").length;
  const rx = t.steps.filter((x) => x.kind !== "otc").length;
  return `<tr><th>K${i + 1}</th><td><b>${esc(t.title)}</b><br><small>${esc(t.summary)}</small></td><td>${t.sections.length} section${t.sections.length === 1 ? "" : "s"}, ${otc} OTC step${otc === 1 ? "" : "s"}, ${t.stopRules.length} stop rule${t.stopRules.length === 1 ? "" : "s"}</td><td>${rx ? `${rx} prescription/other step${rx === 1 ? "" : "s"}` : "nothing"}</td><td>${t.reviewed ? "Yes" : "No"}</td><td class="box">☐ Public OK<br>☐ Edit<br>☐ Clinic only</td></tr>`;
}).join("\n")}
</tbody></table>
</article>

<h3 style="margin-top:24px">Wording</h3>
<table><thead><tr><th>Where</th><th>Text</th><th>Sign-off</th></tr></thead><tbody>
${D_WORDING.map(([w, t]) => `<tr><th style="width:200px">${esc(w)}</th><td>${esc(t)}</td>${BOX}</tr>`).join("\n")}
</tbody></table>
</section>
</main></body></html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`Wrote ${OUT}: ${PREGNANCY_ENTRIES.length} classifications, ${statementCount} escalation statements, Part D with ${KIDS.length} parent guides.`);
