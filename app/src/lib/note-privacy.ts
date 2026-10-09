// A light heads-up when free text in the handout builder looks like it
// carries patient details. Most patterns only warn: they are loose and also
// match ordinary template text ("Centers for Disease Control"). A few are
// labelled identifiers ("DOB 03/14/1987", "MRN 00482913", "Patient: Maria")
// that handout text has no reason to hold; those block the save, in the
// builder and again in the API, because a saved version can't be deleted.
// It can't catch everything -- the real protection is that the handout has
// no patient fields at all and the patient name box never leaves the browser.
// Pure; tested in note-privacy.test.ts.

export type PrivacyHit = { kind: "dob" | "mrn" | "name" | "contact"; match: string; blocking: boolean };

const DATE = String.raw`(?:(?:0?[1-9]|1[0-2])[/.-](?:0?[1-9]|[12]\d|3[01])[/.-](?:19|20)?\d{2}|(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))`;

// Labelled identifiers: blocking.
const BLOCKING: [PrivacyHit["kind"], RegExp][] = [
  ["dob", new RegExp(String.raw`\b(?:dob|d\.o\.b\.?|date of birth|born(?: on)?)\s*[:#-]?\s*${DATE}`, "i")],
  ["mrn", /\b(?:mrn|medical record(?: number| no\.?)?|record #|chart #|acct #|account #)\s*[:#-]?\s*\d{4,}/i],
  ["name", /\b(?:[Pp]atient|[Pp]t)(?: [Nn]ame)?\s*[:#-]\s*[A-Z][a-z]+/],
];

const PATTERNS: [PrivacyHit["kind"], RegExp][] = [
  ["dob", /\b(?:dob|d\.o\.b\.?|date of birth)\b/i],
  ["dob", /\b(?:0?[1-9]|1[0-2])[/.-](?:0?[1-9]|[12]\d|3[01])[/.-](?:19|20)?\d{2}\b/],
  ["dob", /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/],
  ["mrn", /\b(?:mrn|medical record|record #|chart #|acct #|account #)\b/i],
  ["mrn", /\b\d{6,10}\b/],
  ["name", /\b(?:patient|pt)(?: name)?\s*[:#-]\s*\S/i],
  ["name", /\b(?:[Mm]rs?|[Mm]s|[Mm]iss|[Mm]x)\.?\s+[A-Z][a-z]+/],
  ["name", /\bfor\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/],
  // Email only: a phone number in the notes is usually the clinic's own.
  ["contact", /\b[\w.+-]+@[\w-]+\.[\w.]+\b/],
];

export function findPrivacyHits(text: string): PrivacyHit[] {
  const hits: PrivacyHit[] = [];
  for (const [list, blocking] of [[BLOCKING, true], [PATTERNS, false]] as const) {
    for (const [kind, re] of list) {
      const m = re.exec(text);
      if (m && !hits.some((h) => h.kind === kind)) hits.push({ kind, match: m[0], blocking });
    }
  }
  return hits;
}

export const hasBlockingHit = (hits: PrivacyHit[]) => hits.some((h) => h.blocking);

export const PRIVACY_HIT_TEXT: Record<PrivacyHit["kind"], string> = {
  dob: "a date of birth",
  mrn: "a record number",
  name: "a patient's name",
  contact: "contact details",
};

// Every free-text field a clinician can type into a handout, as one string
// for findPrivacyHits. The builder and the save API both use it.
export function handoutFreeText(h: {
  title: string;
  notes: string;
  stopRules: string[];
  sections: { heading: string; body: string }[];
  steps: { label: string; directions: string }[];
}): string {
  return [h.title, h.notes, ...h.stopRules, ...h.sections.map((x) => `${x.heading}\n${x.body}`), ...h.steps.map((s) => `${s.label} ${s.directions}`)].join("\n");
}
