// Writes review/handout-library-review.html (repo root): the dermatologist's
// approve / edit / cut copy of the patient-education handout library
// (db/handout-library/*), the drafting notes on where each category is least
// certain, the fixed copy of the clinic tools, and open legal questions.
// Same format as rx-review.ts.
//
//   npx tsx src/db/handout-library-review.ts        (from app/)
//
// Re-run after editing the library. Approved handouts get reviewed: true.
import fs from "node:fs";
import path from "node:path";
import { HANDOUT_CATEGORIES, UNIVERSAL_STOP_RULES, type HandoutTemplate } from "./handout-templates";
import { CONDITIONS_INFLAMMATORY_HANDOUTS } from "./handout-library/conditions-inflammatory";
import { CONDITIONS_GROWTHS_HANDOUTS } from "./handout-library/conditions-growths";
import { PROCEDURE_HANDOUTS } from "./handout-library/procedures";
import { COSMETIC_HANDOUTS } from "./handout-library/cosmetic";
import { PEDIATRIC_HANDOUTS } from "./handout-library/pediatric";
import { TREATMENT_HANDOUTS } from "./handout-library/treatments";
import { REVIEWER_NOTES } from "./handout-library/reviewer-notes";
import { SLOT_LABEL } from "../lib/handout-types";

const OUT = path.join(process.cwd(), "..", "review", "handout-library-review.html");
const LIBRARY = [
  ...CONDITIONS_INFLAMMATORY_HANDOUTS,
  ...CONDITIONS_GROWTHS_HANDOUTS,
  ...PROCEDURE_HANDOUTS,
  ...COSMETIC_HANDOUTS,
  ...PEDIATRIC_HANDOUTS,
  ...TREATMENT_HANDOUTS,
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BOX = `<td class="box">☐ Approve<br>☐ Edit<br>☐ Cut</td>`;

/** A section body as HTML: blank line = paragraph, "- " = bullet (same rules as components/handout-sections.tsx). */
function bodyHtml(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((chunk) => {
      const out: string[] = [];
      let bullets: string[] = [];
      let para: string[] = [];
      const flushP = () => {
        if (para.length) out.push(`<p>${esc(para.join(" "))}</p>`);
        para = [];
      };
      const flushB = () => {
        if (bullets.length) out.push(`<ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`);
        bullets = [];
      };
      for (const line of chunk.split("\n").map((l) => l.trim()).filter(Boolean)) {
        const m = /^[-•*]\s+(.*)$/.exec(line);
        if (m) {
          flushP();
          bullets.push(m[1]);
        } else {
          flushB();
          para.push(line);
        }
      }
      flushP();
      flushB();
      return out.join("");
    })
    .join("");
}

let k = 0;
function handoutHtml(t: HandoutTemplate): string {
  const row = (label: string, html: string) => `<tr><th>H${++k}<br><small>${label}</small></th><td>${html}</td>${BOX}</tr>`;
  return `<article id="h-${t.id}">
<h3>${esc(t.name)} <code>${t.id}</code></h3>
<p class="meta"><b>Patient sees:</b> ${esc(t.title)} · <b>Clinician summary:</b> ${esc(t.summary)}</p>
<table><thead><tr><th>#</th><th>Text (the clinician can edit any of it before giving it out)</th><th>Sign-off</th></tr></thead><tbody>
${t.sections.map((s) => row("Section", `<b>${esc(s.heading)}</b>${bodyHtml(s.body)}`)).join("\n")}
${t.steps.map((s) => row(`Step · ${SLOT_LABEL[s.slot]}`, `<b>${esc(s.label)}</b> <span class="meta">(OTC; picker search “${esc(s.search)}”)</span><br>${esc(s.directions)}`)).join("\n")}
${t.stopRules.map((r) => row("Stop and call if", esc(r))).join("\n")}
</tbody></table>
<p class="meta"><b>Sources:</b> ${t.sources.map(esc).join(" · ")}</p>
<div class="review"><span>☐ Approve as written</span><span>☐ Approve with edits</span><span>☐ Don't publish</span><div class="notes">Notes:</div></div>
</article>`;
}

const FIXED_COPY: [string, string][] = [
  ["Library draft marker", "Draft: AI-written and still in dermatologist review. Read it before handing it out; every word is editable."],
  ["Clinic tools page", "Free tools for your clinic. Patient handouts, patch-test reading and allergen lists that send patients somewhere useful afterwards. Free to use; we never receive your patients' names or contact details."],
  ["Handout email (opens the clinic's own email app)", "Subject: TITLE from CLINIC. “Hello, CLINICIAN at CLINIC shared a handout with you: TITLE. Open it here to read it and save it privately on your phone (no account needed): LINK. The first device to save this link keeps it, so please don't forward it. Questions? Call us at PHONE.”"],
  ["Print sheet QR line (education handouts)", "Scan to save this handout privately on your phone. No account needed."],
  ["Chart note (education handouts)", "Patient handout given via Actively (ref REF), DATE: TITLE. Topics covered: HEADINGS. … Patient education: written handout + QR provided."],
  ["Patch-test reader: chart note", "Patch test reading: SERIES, DAY, read DATE. Grading: ICDRG (?+ doubtful, + weak, ++ strong, +++ extreme, IR irritant). Positive (n): - ALLERGEN (Panel, #): GRADE … Negative: n of N allergens. Negative control: negative. Clinical relevance to be determined by the clinician."],
  ["Patch-test reader: patient email (clinic's own email app)", "Subject: Your patch-test results. “Here are the ingredients to avoid from your patch test. Open the link to see every name they go by on product labels, add them to a free avoid list, and find products that are safe for you: LINK. No account is needed. You can save the list to your email so it follows you to any device.”"],
  ["Avoid-list landing: sign-up prompt", "Keep this list on every device. Optional. Add your email and your avoid list is saved to your account, so it's there on any phone or computer you sign in on, along with My products and any plans from your clinic."],
];

const LEGAL_QUESTIONS = [
  "<b>Patient email stays in the clinic's own email app.</b> “Email” buttons open the clinician's mail client (mailto:) with the link pre-filled; Actively never receives the patient's address. Confirm this keeps Actively outside a business-associate relationship for these features.",
  "<b>MA patch-test reader.</b> Grades, the chart note and the patient's name stay in the browser tab. The only data that leaves is the avoid-list link (allergen code + reading date, no identifiers), and only when printed, shown as a QR or emailed from the clinic's app. Confirm no HIPAA obligations attach; consider whether the reader page should carry any terms-of-use line for clinics.",
  "<b>Avoid list saved to accounts.</b> A signed-in person's avoid list (their allergies) is now stored with their email, like their shelf and plans. This is consumer health data (WA My Health My Data, CT, NV). The privacy policy needs a line for it; deletion is covered by account deletion. Confirm consent wording on the sign-up prompt is sufficient.",
  "<b>Public draft previews.</b> /clinic-tools/handouts/[id] shows each draft handout's full text to anyone (noindex). Keep public, or require a clinician sign-in until reviewed?",
  "<b>Clinician responsibility.</b> Library text is a starting point; the clinician edits and issues it under their name. Is the builder's draft marker plus the terms enough, or do you want an explicit attestation at first use?",
];

const today = new Date().toISOString().slice(0, 10);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Handout library review</title>
<style>
:root{--ink:#141b24;--muted:#5d646c;--line:#d7d4cc;--paper:#f6f4ee;--card:#fff;--teal:#006761}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 Georgia, "Times New Roman", serif}
main{max-width:960px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:32px;margin:0 0 4px} h2{font-size:24px;margin:48px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--teal)}
h3{font:600 18px/1.3 system-ui,sans-serif;margin:0 0 8px}
code{font:12px ui-monospace,monospace;color:var(--muted);background:#eeece5;padding:1px 6px;border-radius:4px;margin-left:6px}
article{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:14px 0;break-inside:avoid}
ul,ol{margin:4px 0;padding-left:22px} p{margin:4px 0} .meta{font-family:system-ui,sans-serif;font-size:13px;color:var(--muted)}
.review{margin-top:14px;padding-top:12px;border-top:1px dashed var(--line);display:flex;flex-wrap:wrap;gap:18px;font:14px system-ui,sans-serif}
.notes{flex-basis:100%;min-height:44px;color:var(--muted)}
.callout{background:#fff8e6;border:1px solid #f0d58a;border-radius:14px;padding:14px 18px} .callout li{margin:6px 0}
.legal{background:#eef4fb;border:1px solid #a9c4e3;border-radius:14px;padding:14px 18px} .legal li{margin:6px 0}
.lede{color:var(--muted)} nav a{color:var(--teal)} nav{font:14px system-ui,sans-serif;columns:2}
table{width:100%;border-collapse:collapse;font:14px/1.45 system-ui,sans-serif;margin-top:8px;background:var(--card)}
th,td{border:1px solid var(--line);padding:6px 8px;vertical-align:top;text-align:left} thead th{background:#eeece5;font-weight:600}
tbody th{width:90px;font-weight:600} td.box{width:84px;white-space:nowrap;font-size:13px}
@media print{body{background:#fff} article{border-color:#bbb}}
</style></head><body><main>
<h1>Actively patient handout library — draft for review</h1>
<p class="lede">Generated ${today} from <code>app/src/db/handout-library/</code> · ${LIBRARY.length} handouts in ${HANDOUT_CATEGORIES.length} categories · ${LIBRARY.filter((t) => t.reviewed).length} approved so far</p>

<h2>How to review</h2>
<p>Every handout below was drafted by Claude (AI) for your review as the site's board-certified dermatologist. They are <b>live for signed-in clinicians, each marked “Draft”</b>, and every word is editable by the clinician before it reaches a patient. Tick one box per row and per handout, and note edits; send the file back or list row numbers. Approved handouts get <code>reviewed: true</code> and lose the draft marker. Regenerate with <code>npx tsx src/db/handout-library-review.ts</code> in <code>app/</code>.</p>
<p>Drafting rules: plain language (about 6th–8th grade); no prescription doses, strengths or schedules (“as prescribed”); OTC products “as directed on the label”; no brand names; no isotretinoin; pregnancy cautions where standard; timings hedged (“usually”, “unless we told you otherwise”); sources are organization patient pages or guidelines cited by author, journal and year only. The two universal stop rules below are added to every handout.</p>
<div class="callout"><b>Universal stop rules (added to every handout):</b><ol>${UNIVERSAL_STOP_RULES.map((r) => `<li>${esc(r)}</li>`).join("")}</ol></div>

<h2>For the attorney</h2>
<div class="legal"><ol>${LEGAL_QUESTIONS.map((q) => `<li>${q}</li>`).join("")}</ol></div>

<h2>Contents</h2>
<nav>${HANDOUT_CATEGORIES.map((c) => `<div><a href="#cat-${c.id}">${esc(c.name)}</a> (${LIBRARY.filter((t) => t.category === c.id).length})</div>`).join("")}<div><a href="#fixed">Fixed copy</a> (${FIXED_COPY.length})</div></nav>

${HANDOUT_CATEGORIES.map((c) => {
  const items = LIBRARY.filter((t) => t.category === c.id);
  const notes = REVIEWER_NOTES[c.id] ?? [];
  return `<section id="cat-${c.id}"><h2>${esc(c.name)} (${items.length})</h2>
${notes.length ? `<div class="callout"><b>Start here: what the drafter was least sure of</b><ol>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></div>` : ""}
${items.map(handoutHtml).join("\n")}
</section>`;
}).join("\n")}

<section id="fixed"><h2>Fixed copy in the clinic tools</h2>
<table><thead><tr><th>Where</th><th>Text</th><th>Sign-off</th></tr></thead><tbody>
${FIXED_COPY.map(([w, t]) => `<tr><th style="width:200px">${esc(w)}</th><td>${esc(t)}</td>${BOX}</tr>`).join("\n")}
</tbody></table>
</section>
</main></body></html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`Wrote ${OUT}: ${LIBRARY.length} handouts, ${k} review rows.`);
