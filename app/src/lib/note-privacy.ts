// A light, client-side heads-up when free text in the handout builder looks
// like it carries patient details. It only warns -- it can't catch
// everything and never blocks -- the real protection is that the handout has
// no patient fields at all and the patient name box never leaves the browser.
// Pure; tested in note-privacy.test.ts.

export type PrivacyHit = { kind: "dob" | "mrn" | "name" | "contact"; match: string };

const PATTERNS: [PrivacyHit["kind"], RegExp][] = [
  ["dob", /\b(?:dob|d\.o\.b\.?|date of birth|born(?: on)?)\b/i],
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
  for (const [kind, re] of PATTERNS) {
    const m = re.exec(text);
    if (m && !hits.some((h) => h.kind === kind)) hits.push({ kind, match: m[0] });
  }
  return hits;
}

export const PRIVACY_HIT_TEXT: Record<PrivacyHit["kind"], string> = {
  dob: "a date of birth",
  mrn: "a record number",
  name: "a patient's name",
  contact: "contact details",
};
