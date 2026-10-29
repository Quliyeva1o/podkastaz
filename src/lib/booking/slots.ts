import type { WeekHours } from "@/db/schema";
import { addDays, bakuDate, bakuInstant, bakuMinutes, formatTime, parseTime, weekday } from "./time";

export type Rules = {
  stepMin: number;
  minDurationMin: number;
  maxDurationMin: number;
  bufferMin: number;
  horizonDays: number;
  leadTimeMin: number;
};

/** An occupied range of the studio (another booking up to its buffer end, or blocked time). */
export type Busy = { start: Date; end: Date };

export type DaySlots =
  | { status: "closed" | "past" | "tooFar" }
  | {
      status: "open";
      /** Every start time of the day; `ends` is empty when that start is taken or too soon. */
      starts: { time: string; ends: string[] }[];
    };

/**
 * Free start and end times of one studio on one Baku date. Pure: the same function answers the
 * availability API, fills the booking form and re-checks a request on the server (the database
 * constraint is the last line of defence against two requests at the same moment).
 *
 * A booking [start, end) must lie within the opening hours; together with the cleaning buffer,
 * [start, end + buffer) must not touch any busy range. Starts move in `stepMin` steps from
 * opening time; durations run from the minimum to the maximum in the same steps.
 */
export function daySlots(date: string, hours: WeekHours, rules: Rules, busy: Busy[], now = new Date()): DaySlots {
  const today = bakuDate(now);
  if (date < today) return { status: "past" };
  if (date > addDays(today, rules.horizonDays)) return { status: "tooFar" };
  const day = hours[weekday(date)];
  if (!day) return { status: "closed" };
  const open = parseTime(day.open)!;
  const close = parseTime(day.close)!;

  const earliest = date === today ? bakuMinutes(now) + rules.leadTimeMin : -Infinity;
  const ranges = busy.map((b) => [b.start.getTime(), b.end.getTime()] as const);
  const free = (from: number, to: number) => {
    const a = bakuInstant(date, from).getTime();
    const b = bakuInstant(date, to + rules.bufferMin).getTime();
    return ranges.every(([s, e]) => b <= s || a >= e);
  };

  const step = Math.max(5, rules.stepMin);
  const starts: { time: string; ends: string[] }[] = [];
  for (let t = open; t + rules.minDurationMin <= close; t += step) {
    const ends: string[] = [];
    if (t >= earliest) {
      for (let e = t + rules.minDurationMin; e <= Math.min(close, t + rules.maxDurationMin); e += step) {
        // Ends grow, so the first conflict closes the list.
        if (!free(t, e)) break;
        ends.push(formatTime(e));
      }
    }
    starts.push({ time: formatTime(t), ends });
  }
  return { status: "open", starts };
}

/** Whether start–end is one of the offered combinations. */
export function isOffered(slots: DaySlots, start: string, end: string) {
  return slots.status === "open" && Boolean(slots.starts.find((s) => s.time === start)?.ends.includes(end));
}
