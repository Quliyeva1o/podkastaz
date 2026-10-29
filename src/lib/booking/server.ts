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
