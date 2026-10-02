// Pure scheduling rules for outcome check-ins (no database), unit tested in
// checkin-schedule.test.ts. lib/checkins.ts applies them.

export const CHECKIN_WEEKS = [2, 4, 8, 12] as const;
export const WEEK_MS = 7 * 24 * 60 * 60_000;
// A check-in more than this late (the job was down, or check-ins were off
// and turned back on) is dropped rather than sent: "how is it going at 2
// weeks?" means little at week 6.
export const CHECKIN_GRACE_MS = 3 * WEEK_MS;

export type CheckinAnswer = "better" | "same" | "worse" | "stopped";
export const CHECKIN_ANSWERS: CheckinAnswer[] = ["better", "same", "worse", "stopped"];

export function isCheckinAnswer(v: unknown): v is CheckinAnswer {
  return typeof v === "string" && (CHECKIN_ANSWERS as string[]).includes(v);
}

export function checkinDueDates(start: Date): { weeks: number; dueAt: Date }[] {
  return CHECKIN_WEEKS.map((weeks) => ({ weeks, dueAt: new Date(start.getTime() + weeks * WEEK_MS) }));
}

export type DueRow = { id: number; personId: string; productId: string; weeks: number; dueAt: string };

/**
 * Given scheduled check-ins that are already due, decide what to do with
 * each. Per (person, product) only the latest due point is sent -- after
 * downtime someone gets one "8 weeks" email, not 2, 4 and 8 at once -- and
 * the earlier ones are skipped. If even the latest is past the grace period,
 * all are expired.
 */
export function planDue(rows: DueRow[], now: Date, graceMs = CHECKIN_GRACE_MS): { send: DueRow[]; skip: number[]; expire: number[] } {
  const groups = new Map<string, DueRow[]>();
  for (const r of rows) {
    if (Date.parse(r.dueAt) > now.getTime()) continue;
    const key = `${r.personId}\u0000${r.productId}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const send: DueRow[] = [];
  const skip: number[] = [];
  const expire: number[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.weeks - b.weeks);
    const latest = group.at(-1)!;
    if (now.getTime() - Date.parse(latest.dueAt) > graceMs) {
      expire.push(...group.map((r) => r.id));
      continue;
    }
    send.push(latest);
    skip.push(...group.slice(0, -1).map((r) => r.id));
  }
  return { send, skip, expire };
}

// How a check-in answer feeds the existing User Score (audience_outcomes,
// "% reporting improvement at 8 weeks", project.md §5):
//  - Only the 8-week answer counts; the 12-week one stands in only when the
//    person never answered at 8 weeks. 2- and 4-week answers are too early
//    to call a product helpful (most actives need 8-12 weeks).
//  - "better" -> improved; "same" or "worse" -> not improved.
//  - "stopped" isn't scored: they didn't use it for 8 weeks, so it says
//    nothing either way about whether it works. It's still kept as an
//    observation (with the reaction flag) for later drop-out analysis.
export const SCORED_WEEKS = 8;
export const FALLBACK_SCORED_WEEKS = 12;

export function scoreFromAnswer(answer: CheckinAnswer): boolean | null {
  if (answer === "better") return true;
  if (answer === "same" || answer === "worse") return false;
  return null;
}
