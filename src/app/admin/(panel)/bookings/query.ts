import "server-only";
import { and, asc, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { bookings } from "@/db/schema";
import { addDays, bakuInstant, isDate } from "@/lib/booking/time";

export type BookingFilters = { status: string; studio: string; from: string; to: string; q: string };

export function readFilters(sp: Record<string, string | string[] | undefined>): BookingFilters {
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  return { status: v("status"), studio: v("studio"), from: v("from"), to: v("to"), q: v("q").slice(0, 100) };
}

/** WHERE for the list and the CSV export. Blocked time only shows when asked for. */
export function bookingWhere(f: BookingFilters): SQL | undefined {
  const where: SQL[] = [];
  if (f.status) where.push(eq(bookings.status, f.status as typeof bookings.$inferSelect.status));
  else where.push(sql`${bookings.status} <> 'blocked'`);
  if (/^[0-9a-f-]{36}$/.test(f.studio)) where.push(eq(bookings.studioId, f.studio));
  if (isDate(f.from)) where.push(gte(bookings.startsAt, bakuInstant(f.from, 0)));
  if (isDate(f.to)) where.push(lt(bookings.startsAt, bakuInstant(addDays(f.to, 1), 0)));
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(
      or(
        ilike(bookings.firstName, like),
        ilike(bookings.lastName, like),
        ilike(bookings.phone, like),
        ilike(bookings.email, like),
      )!,
    );
  }
  return and(...where);
}

/** Upcoming first when a date range is set, newest requests first otherwise. */
export const bookingOrder = (f: BookingFilters) => (f.from || f.to ? [asc(bookings.startsAt)] : [desc(bookings.createdAt)]);
