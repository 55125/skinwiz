import { formatPct } from "@/db/strength";

// The Strength filter on /concern/[slug]. Most actives come in a handful of
// label strengths (benzoyl peroxide 2.5 / 5 / 10) and get one chip each.
// Sunscreen actives don't: zinc oxide alone is filed at a couple of hundred
// distinct values (19.8%, 20%, 20.2% ...), so a chip per value is a wall of
// near-duplicates. Past EXACT_MAX chips those actives get a few even ranges
// instead ("Up to 5%", "5–10%", ... ), sized to where most products sit.

/** One label strength (lo === hi) or a range: above lo, up to and including hi (null: no top). */
export type StrengthRange = { lo: number; hi: number | null };

export type StrengthChoice = { param: string; label: string; count: number; range: StrengthRange };

type Option = { pct: number; count: number };

const EXACT_MAX = 8;
// A value seen on fewer labels than this is almost always one product's
// filing quirk (3.69%, 5.25%); it gets no chip of its own but still counts
// toward a range and stays reachable by URL.
const EXACT_MIN_COUNT = 3;
const MAX_BANDS = 5;
const STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];

const NUM = /^\d*\.?\d+$/;

export function strengthParam(r: StrengthRange): string {
  return r.lo === r.hi ? String(r.lo) : `${r.lo}-${r.hi ?? ""}`;
}

/** "20" (one strength) or "5-10" / "25-" (a range); anything else is ignored. */
export function parseStrengthParam(value: string | undefined): StrengthRange | undefined {
  if (!value) return undefined;
  if (NUM.test(value)) return { lo: Number(value), hi: Number(value) };
  const [lo, hi, ...rest] = value.split("-");
  if (rest.length > 0 || !NUM.test(lo) || (hi !== "" && !NUM.test(hi))) return undefined;
  const range = { lo: Number(lo), hi: hi === "" ? null : Number(hi) };
  return range.hi === null || range.hi > range.lo ? range : undefined;
}

export function inStrengthRange(pct: number, r: StrengthRange): boolean {
  return r.lo === r.hi ? pct === r.lo : pct > r.lo && (r.hi === null || pct <= r.hi);
}

export function strengthLabel(r: StrengthRange): string {
  if (r.lo === r.hi) return formatPct(r.lo);
  if (r.hi === null) return `Over ${formatPct(r.lo)}`;
  if (r.lo === 0) return `Up to ${formatPct(r.hi)}`;
  return `${formatPct(r.lo).slice(0, -1)}–${formatPct(r.hi)}`;
}

// Even ranges from 0 to a round number just past where 95% of products
// sit, so one mislabeled 24% octinoxate doesn't stretch every range; the
// few above that share one "Over" range.
function bands(options: Option[]): StrengthRange[] {
  const total = options.reduce((n, o) => n + o.count, 0);
  let seen = 0;
  const p95 = options.find((o) => (seen += o.count) >= total * 0.95)?.pct ?? options[options.length - 1].pct;
  const step = STEPS.find((s) => Math.ceil(p95 / s) <= MAX_BANDS) ?? STEPS[STEPS.length - 1];
  const top = Math.ceil(p95 / step) * step;
  const out: StrengthRange[] = [];
  for (let lo = 0; lo < top; lo += step) out.push({ lo, hi: lo + step });
  out.push({ lo: top, hi: null });
  return out;
}

/**
 * The strength chips for one active within a concern, given every parsed
 * label strength (sorted by pct) and the current pick. Ranges with no
 * products are left out, and a pick that isn't one of the chips (an old
 * single-strength link on an active that now shows ranges) is kept as its
 * own chip so it can be seen and cleared.
 */
export function strengthChoices(options: Option[], selected?: StrengthRange): StrengthChoice[] {
  const choice = (range: StrengthRange): StrengthChoice => ({
    param: strengthParam(range),
    label: strengthLabel(range),
    count: options.reduce((n, o) => (inStrengthRange(o.pct, range) ? n + o.count : n), 0),
    range,
  });
  const exact = options.filter((o) => o.count >= EXACT_MIN_COUNT);
  const out =
    exact.length <= EXACT_MAX
      ? exact.map((o) => choice({ lo: o.pct, hi: o.pct }))
      : bands(options).map(choice).filter((c) => c.count > 0);
  if (selected && !out.some((c) => c.param === strengthParam(selected))) out.push(choice(selected));
  return out;
}
