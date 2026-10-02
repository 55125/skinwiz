// "Copy chart note": a plain-text summary of a handout VERSION for a medical
// assistant to paste into the EHR. Pure (client and server), tested in
// chart-note.test.ts.
//
// - Input is the version only. There is no parameter for a patient or a
//   printout, so neither the patient's name nor the per-printout claim token
//   (a secret: it opens the patient's private plan) can end up in a chart.
//   The "ref" is the version's public reference code.
// - Output is ASCII with CRLF line breaks, no markdown or HTML, so it pastes
//   cleanly into Epic / Cerner / athena / ModMed free-text fields.
// - Plain English by default; with abbreviations, standard sig shorthand
//   (qAM, qHS, BID). Never a Joint Commission "do not use" abbreviation (U,
//   IU, QD, QOD, MS, MSO4, MgSO4, trailing zero, missing leading zero): ours
//   aren't on the list, and the clinician's own free text is rewritten where
//   it uses one.
import { sectionsOf, type HandoutContent, type HandoutSlot } from "@/lib/handout-types";

export type ChartNoteVersion = {
  ref: string;
  title: string;
  createdAt: string; // ISO
  content: Pick<HandoutContent, "steps" | "stopRules" | "avoidCode" | "sections">;
};

export type ChartNoteOptions = { abbreviations?: boolean; short?: boolean; date?: Date };

const EOL = "\r\n";

const PLAIN: Record<HandoutSlot, string> = { am: "every morning", pm: "every night", both: "twice daily", "as-directed": "as directed" };
const ABBR: Record<HandoutSlot, string> = { am: "qAM", pm: "qHS", both: "BID", "as-directed": "as directed" };

// Curly quotes, dashes, ellipses, degree signs etc. -> ASCII; anything else
// non-ASCII is dropped (accents are folded first).
export function toAscii(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/°/g, " deg")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/µ/g, "mc")
    .replace(/[  -​ ]/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e\r\n]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Joint Commission "do not use" list, and the safe rewrite for each.
const DO_NOT_USE: [RegExp, string][] = [
  [/\bq\.?\s?o\.?\s?d\.?(?=[\s,;)]|$)/gi, "every other day"],
  [/\bq\.?\s?d\.?(?=[\s,;)]|$)/gi, "daily"],
  [/\bI\.?U\.?(?=[\s,;)]|$)/g, "units"],
  [/(\d)\s*U\b/g, "$1 units"],
  [/\bMSO4\b|\bMgSO4\b|\bMS\b/g, "(spell out drug name)"],
  [/(\d)\.0+(?!\d)/g, "$1"], // trailing zero: 1.0 -> 1
  [/(^|[^\d.])\.(\d)/g, "$10.$2"], // missing leading zero: .5 -> 0.5
];

export function scrubDoNotUse(text: string): string {
  return DO_NOT_USE.reduce((t, [re, rep]) => t.replace(re, rep), text);
}

const clean = (s: string) => scrubDoNotUse(toAscii(s)).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
const stripEnd = (s: string) => s.replace(/[.;,\s]+$/, "");

function formatDate(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function stepName(step: HandoutContent["steps"][number]): string {
  return clean(step.productName ?? step.label);
}

export function buildChartNote(v: ChartNoteVersion, opts: ChartNoteOptions = {}): string {
  const timing = opts.abbreviations ? ABBR : PLAIN;
  const date = formatDate(opts.date ?? new Date(v.createdAt));
  const ref = clean(v.ref);
  const steps = v.content.steps;
  const topics = sectionsOf(v.content).map((x) => stripEnd(clean(x.heading))).filter(Boolean);
  // Education-only handouts (wound care, what is eczema) have no steps.
  const kind = steps.length > 0 ? "skincare plan" : "patient handout";

  if (opts.short) {
    if (steps.length === 0) return `Actively patient handout ${ref} provided ${date}: ${clean(v.title)}.`;
    const parts = steps.map((s) => {
      const what = s.kind === "rx" ? clean(s.productName ?? s.label).replace(/\s*\(.*\)$/, "") : clean(s.label);
      return s.slot === "as-directed" ? what : `${what} ${timing[s.slot]}`;
    });
    return `Actively skincare plan ${ref} provided ${date}: ${parts.join(", ")}.`;
  }

  const lines: string[] = [`${kind.charAt(0).toUpperCase()}${kind.slice(1)} given via Actively (ref ${ref}), ${date}: ${clean(v.title)}.`];
  if (topics.length) lines.push(`Topics covered: ${topics.join("; ")}.`);
  const otc = steps.filter((s) => s.kind !== "rx");
  for (const [slot, head] of [
    ["am", "AM"],
    ["pm", "PM"],
  ] as const) {
    const inSlot = otc.filter((s) => s.slot === slot || s.slot === "both");
    if (inSlot.length === 0) continue;
    const items = inSlot.map((s, i) => {
      const dir = s.directions ? ` - ${stripEnd(clean(s.directions))}` : "";
      const label = clean(s.label);
      const name = stepName(s);
      return `${i + 1}) ${label && label !== name ? `${label}: ` : ""}${name}${dir}`;
    });
    lines.push(`${head}: ${items.join(" ")}`);
  }
  const asDirected = otc.filter((s) => s.slot === "as-directed");
  if (asDirected.length) {
    lines.push(`As directed: ${asDirected.map((s) => `${stepName(s)}${s.directions ? ` - ${stripEnd(clean(s.directions))}` : ""}`).join("; ")}`);
  }
  const rx = steps.filter((s) => s.kind === "rx");
  if (rx.length) {
    lines.push(
      `Rx: ${rx
        .map((s) => {
          const sig = s.directions ? stripEnd(clean(s.directions)) : timing[s.slot];
          return `${clean(s.productName ?? s.label)} - ${sig}${s.directions && s.slot !== "as-directed" ? ` (${timing[s.slot]})` : ""}`;
        })
        .join("; ")}`,
    );
  }
  if (v.content.stopRules.length) {
    lines.push(`Stop and call if: ${v.content.stopRules.map((r) => stripEnd(clean(r))).join("; ")}.`);
  }
  if (v.content.avoidCode) lines.push("Patch-test avoid list included with the plan.");
  lines.push("Patient education: written handout + QR provided.");
  return lines.join(EOL);
}
