// Pure logic for the MA patch-test reader (components/patch-test-reader.tsx):
// grades, chamber numbering per series, and the chart write-up. Runs in the
// browser; nothing here is sent to the server.
import { PATCH_TEST_SERIES, type PatchTestSeries, type SeriesItem } from "@/db/patch-test-series";

// ICDRG grading, as on the T.R.U.E. Test label: negative, doubtful, weak,
// strong, extreme, irritant. A tap steps forward and wraps back to negative.
export const GRADES = ["neg", "?+", "+", "++", "+++", "IR"] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABEL: Record<Grade, string> = {
  neg: "Negative",
  "?+": "Doubtful",
  "+": "Weak positive",
  "++": "Strong positive",
  "+++": "Extreme positive",
  IR: "Irritant",
};

export function nextGrade(g: Grade): Grade {
  return GRADES[(GRADES.indexOf(g) + 1) % GRADES.length];
}

export const POSITIVE: ReadonlySet<Grade> = new Set(["+", "++", "+++"]);

export const READING_DAYS = [
  { id: "d2", label: "Day 2 (48 h)" },
  { id: "d3", label: "Day 3 (72 h)" },
  { id: "d4", label: "Day 4 (96 h)" },
  { id: "d5", label: "Day 5" },
  { id: "d7", label: "Day 7" },
] as const;
export type ReadingDay = (typeof READING_DAYS)[number]["id"];

export type Chamber = { key: string; number: number; group: string; item: SeriesItem | null }; // item null = negative control

/**
 * Chambers in the order they sit on the back. The T.R.U.E. Test uses its
 * own position numbers (9 is the negative control); other series are
 * numbered 1..n in list order, which the reader says to confirm against
 * the clinic's tray.
 */
export function chambersFor(series: PatchTestSeries): Chamber[] {
  const out: Chamber[] = [];
  let n = 0;
  for (const g of series.groups) {
    for (const item of g.items) {
      const number = item.pos ?? ++n;
      if (series.id === "true-test" && number === 10) out.push({ key: "control", number: 9, group: g.title, item: null });
      out.push({ key: `${number}`, number, group: g.title, item });
    }
  }
  return out;
}

export function getSeries(id: string): PatchTestSeries {
  return PATCH_TEST_SERIES.find((s) => s.id === id) ?? PATCH_TEST_SERIES[0];
}

/** Allergen and off-label ids for the avoid list: positives, plus doubtfuls if asked. */
export function avoidIdsFrom(chambers: Chamber[], grades: Record<string, Grade>, includeDoubtful: boolean): string[] {
  const ids: string[] = [];
  for (const c of chambers) {
    const g = grades[c.key] ?? "neg";
    if (!c.item || !(POSITIVE.has(g) || (includeDoubtful && g === "?+"))) continue;
    ids.push(...c.item.ids);
    if (c.item.notOnLabel) ids.push(c.item.notOnLabel);
  }
  return [...new Set(ids)];
}

/** Plain-text write-up for the chart. No patient identifiers: the MA adds this to the patient's own chart. */
export function readingWriteUp(opts: {
  series: PatchTestSeries;
  chambers: Chamber[];
  grades: Record<string, Grade>;
  day: ReadingDay;
  readDate?: string;
  appliedDate?: string;
}): string {
  const { series, chambers, grades } = opts;
  const day = READING_DAYS.find((d) => d.id === opts.day)?.label ?? opts.day;
  const place = (c: Chamber) => (series.id === "true-test" ? `${c.group}, #${c.number}` : `#${c.number}`);
  const line = (c: Chamber) => `- ${c.item ? c.item.name : "Negative control"} (${place(c)}): ${grades[c.key] ?? "neg"}`;
  const by = (pred: (g: Grade) => boolean) => chambers.filter((c) => c.item && pred(grades[c.key] ?? "neg"));
  const positive = by((g) => POSITIVE.has(g));
  const doubtful = by((g) => g === "?+");
  const irritant = by((g) => g === "IR");
  const negatives = chambers.filter((c) => c.item && (grades[c.key] ?? "neg") === "neg").length;
  const control = chambers.find((c) => !c.item);
  const lines = [
    `Patch test reading: ${series.name}, ${day}${opts.readDate ? `, read ${opts.readDate}` : ""}${opts.appliedDate ? ` (applied ${opts.appliedDate})` : ""}.`,
    "Grading: ICDRG (?+ doubtful, + weak, ++ strong, +++ extreme, IR irritant).",
    positive.length ? `Positive (${positive.length}):` : "Positive: none.",
    ...positive.map(line),
    ...(doubtful.length ? [`Doubtful (${doubtful.length}):`, ...doubtful.map(line)] : []),
    ...(irritant.length ? [`Irritant (${irritant.length}):`, ...irritant.map(line)] : []),
    `Negative: ${negatives} of ${chambers.filter((c) => c.item).length} allergens.`,
  ];
  if (control) {
    const g = grades[control.key] ?? "neg";
    lines.push(g === "neg" ? "Negative control: negative." : `Negative control: ${g}; interpret other reactions with caution.`);
  }
  lines.push("Clinical relevance to be determined by the clinician.");
  return lines.join("\n");
}
