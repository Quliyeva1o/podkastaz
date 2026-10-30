import "server-only";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingSettings, studios } from "@/db/schema";
import { daySlots, type DaySlots, type Rules } from "./slots";
import { addDays, bakuInstant } from "./time";

/** Booking statuses that occupy the studio (the same list as the DB constraint, drizzle/0001). */
export const liveStatuses = ["new", "confirmed", "blocked"] as const;

export const defaultRules: Rules = {
  stepMin: 30,
  minDurationMin: 60,
  maxDurationMin: 480,
  bufferMin: 0,
  horizonDays: 60,
  leadTimeMin: 120,
};

/** An active studio with its opening hours and booking rules. Never cached: bookings are live. */
export async function studioForBooking(slug: string) {
  const [row] = await db
    .select({ studio: studios, rules: bookingSettings })
    .from(studios)
    .leftJoin(bookingSettings, eq(bookingSettings.studioId, studios.id))
    .where(and(eq(studios.slugAz, slug), eq(studios.active, true)))
    .limit(1);
  if (!row) return null;
  const rules: Rules = row.rules ?? defaultRules;
  return { studio: row.studio, rules };
}

/** Occupied ranges of a studio that touch a Baku date (a booking may run past midnight). */
export async function busyOn(studioId: string, date: string) {
  const from = bakuInstant(date, 0);
  // One day more: a buffer can reach past midnight.
  const to = bakuInstant(addDays(date, 2), 0);
  const rows = await db
    .select({ start: bookings.startsAt, end: bookings.blockedUntil })
    .from(bookings)
    .where(
      and(
        eq(bookings.studioId, studioId),
        inArray(bookings.status, [...liveStatuses]),
        lt(bookings.startsAt, to),
        gt(bookings.blockedUntil, from),
      ),
    );
  return rows;
}

export async function availability(slug: string, date: string): Promise<DaySlots | null> {
  const found = await studioForBooking(slug);
  if (!found) return null;
  return daySlots(date, found.studio.hours, found.rules, await busyOn(found.studio.id, date));
}

/** How a day looks in the booking calendar: bookable, fully taken, or not offered. */
export type DayState = "open" | "full" | "closed" | "past" | "tooFar";

/**
 * Every day of a studio from `from` for `days` days (the calendar's 6 weeks), from one query.
 * "full" = the studio opens that day but no start time is free any more.
 */
export async function daysAvailability(slug: string, from: string, days: number): Promise<Record<string, DayState> | null> {
  const found = await studioForBooking(slug);
  if (!found) return null;
  const rows = await db
    .select({ start: bookings.startsAt, end: bookings.blockedUntil })
    .from(bookings)
    .where(
      and(
        eq(bookings.studioId, found.studio.id),
        inArray(bookings.status, [...liveStatuses]),
        lt(bookings.startsAt, bakuInstant(addDays(from, days + 1), 0)),
        gt(bookings.blockedUntil, bakuInstant(addDays(from, -1), 0)),
      ),
    );
  const now = new Date();
  const out: Record<string, DayState> = {};
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const dayStart = bakuInstant(date, 0).getTime();
    const dayEnd = bakuInstant(addDays(date, 2), 0).getTime();
    const busy = rows.filter((b) => b.start.getTime() < dayEnd && b.end.getTime() > dayStart);
    const slots = daySlots(date, found.studio.hours, found.rules, busy, now);
    out[date] = slots.status !== "open" ? slots.status : slots.starts.some((s) => s.ends.length) ? "open" : "full";
  }
  return out;
}
