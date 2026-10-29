"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookingEvents, bookings, decors } from "@/db/schema";
import { clientIp, filledTooFast, hashIp, verifyTurnstile } from "@/lib/forms/spam";
import { notifyAdmin, notifyCustomer } from "./emails";
import { daySlots, isOffered } from "./slots";
import { busyOn, studioForBooking } from "./server";
import { bakuInstant, isDate, parseTime } from "./time";

const schema = z.object({
  studio: z.string().regex(/^[a-z0-9-]{1,80}$/),
  // A decor slug, or "other" (custom decor on request).
  decor: z.string().regex(/^[a-z0-9-]{1,80}$/),
  request: z.string().trim().max(1000).optional().default(""),
  date: z.string().refine(isDate),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(5).max(50),
  email: z.email().max(200),
  accuracy: z.literal("on"),
  terms: z.literal("on"),
  source: z.enum(["decor", "direct"]).optional().default("direct"),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional(),
});

export type BookingState = { ok: true } | { ok: false; error: "invalid" | "taken" | "rate" | "server" } | null;

const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 5;

/**
 * Public booking request: validated, spam-checked, re-checked against opening hours and the
 * studio's rules, then stored as "new". The database refuses an overlapping booking even when
 * two requests arrive together (exclusion constraint, error 23P01) → "taken". Emails go out
 * after the response (admin + "we received your request" to the customer).
 */
export async function createBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return typeof raw.website === "string" && raw.website ? { ok: true } : { ok: false, error: "invalid" };
  }
  const ip = clientIp(await headers());
  if (filledTooFast(raw.startedAt) || !(await verifyTurnstile(raw["cf-turnstile-response"], ip))) return { ok: true };

  const ipHash = hashIp(ip);
  const [{ n }] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(eq(bookings.ipHash, ipHash), gt(bookings.createdAt, new Date(Date.now() - RATE_WINDOW_MS))));
  if (n >= RATE_MAX) return { ok: false, error: "rate" };

  const d = parsed.data;
  const found = await studioForBooking(d.studio);
  if (!found) return { ok: false, error: "invalid" };
  const { studio, rules } = found;

  let decor: typeof decors.$inferSelect | undefined;
  if (d.decor !== "other") {
    [decor] = await db
      .select()
      .from(decors)
      .where(and(eq(decors.studioId, studio.id), eq(decors.slugAz, d.decor), eq(decors.active, true)))
      .limit(1);
    if (!decor) return { ok: false, error: "invalid" };
  }

  const slots = daySlots(d.date, studio.hours, rules, await busyOn(studio.id, d.date));
  if (!isOffered(slots, d.start, d.end)) {
    // A valid time a moment ago that is now taken (or a tampered form).
    return { ok: false, error: slots.status === "open" ? "taken" : "invalid" };
  }
  const startsAt = bakuInstant(d.date, parseTime(d.start)!);
  const endsAt = bakuInstant(d.date, parseTime(d.end)!);

  let row: typeof bookings.$inferSelect;
  try {
    row = await db.transaction(async (tx) => {
      const [b] = await tx
        .insert(bookings)
        .values({
          studioId: studio.id,
          decorId: decor?.id ?? null,
          studioSnapshot: { name: studio.name.az, address: studio.address.az },
          decorSnapshot: decor ? { name: decor.name.az } : null,
          customRequest: decor ? null : d.request || null,
          startsAt,
          endsAt,
          blockedUntil: new Date(endsAt.getTime() + rules.bufferMin * 60_000),
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.phone,
          email: d.email,
          source: d.source,
          ipHash,
        })
        .returning();
      await tx.insert(bookingEvents).values({ bookingId: b.id, status: "new" });
      return b;
    });
  } catch (error) {
    if (pgCode(error) === "23P01") return { ok: false, error: "taken" };
    console.error("Booking insert failed", error);
    return { ok: false, error: "server" };
  }

  after(async () => {
    try {
      await notifyAdmin(row);
      await notifyCustomer(row, "new");
    } catch (error) {
      console.error("Booking emails failed", error);
    }
  });
  return { ok: true };
}

/** Postgres error code, also when drizzle wraps the driver error. */
function pgCode(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.cause?.code ?? e?.code;
}
