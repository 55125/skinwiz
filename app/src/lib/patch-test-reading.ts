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
  const place = (c: Chamber) => (backSpec(series) ? `${c.group}, #${c.number}` : `#${c.number}`);
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

// --- Panels as they sit on the back ---------------------------------------------

export type BackPanel = { group: string; label: string };
export type Numbering = "columns" | "rows";
export type BackSpec = {
  left: BackPanel[]; // patient's left, outermost first
  right: BackPanel[]; // patient's right, next to the spine first
  rows: number; // each panel is 2 columns wide
  numbering: Numbering; // "columns": down the left column, then the right
  note: string;
};
export type AcdsLayout = { leftCount: number; numbering: Numbering };
// Series sold as panels of 10 chambers (2 x 5), read by tray position.
export const TRAY_SERIES = new Set(["acds-2020", "acds-2017", "nac-80"]);

/** Default placement: half the panels (rounded up) on the patient's left. */
export function defaultTrayLayout(series: PatchTestSeries): AcdsLayout {
  return { leftCount: Math.ceil(series.groups.length / 2), numbering: "columns" };
}

/**
 * How a series' panels sit on the back, seen from behind the patient, or
 * null for series without a fixed panel format (read as a list).
 * T.R.U.E. Test: fixed by its label (Figures 3 and 4). ACDS core (2020: 9
 * panels, 2017: 8) and NAC-80 (8): panels of 10 (2 x 5 chambers); where
 * they go is the clinic's choice, so the split and numbering come from the
 * clinic's saved layout.
 */
export function backSpec(series: PatchTestSeries, acds: AcdsLayout = defaultTrayLayout(series)): BackSpec | null {
  if (series.id === "true-test") {
    return {
      left: [
        { group: "Panel 1", label: "1.3" },
        { group: "Panel 2", label: "2.3" },
      ],
      right: [{ group: "Panel 3", label: "3.3" }],
      rows: 6,
      numbering: "columns",
      note: "Seen from behind the patient, as the panels are applied per the T.R.U.E. Test label.",
    };
  }
  if (TRAY_SERIES.has(series.id)) {
    const panels = series.groups.map((g) => ({ group: g.title, label: g.title.replace(/^Panel /, "") }));
    const n = Math.min(panels.length - 1, Math.max(1, Math.round(acds.leftCount)));
    return {
      left: panels.slice(0, n),
      right: panels.slice(n),
      rows: 5,
      numbering: acds.numbering,
      note: "Seen from behind the patient. Panel I is outermost on the patient's left; set your clinic's layout above if yours differs.",
    };
  }
  return null;
}
