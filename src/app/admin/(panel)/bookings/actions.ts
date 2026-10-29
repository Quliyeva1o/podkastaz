"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { bookingEvents, bookings, studios } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { notifyCustomer, type CustomerStatus } from "@/lib/booking/emails";
import { bakuInstant, isDate, parseTime } from "@/lib/booking/time";
import type { ActionResult } from "../pages/actions";

const statusSchema = z.enum(["new", "confirmed", "rejected", "cancelled", "completed"]);

/** Allowed moves (PLAN.md §5.4): new → confirmed | rejected | cancelled; confirmed → cancelled | completed. */
const transitions: Record<string, string[]> = {
  new: ["confirmed", "rejected", "cancelled"],
  confirmed: ["cancelled", "completed", "new"],
  rejected: ["new"],
  cancelled: ["new"],
  completed: ["confirmed"],
};

const pgCode = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.cause?.code ?? e?.code;
};

/**
 * Changes a booking's status and/or note, records who did it (booking_events) and, when asked,
 * emails the customer with the status's template. Re-opening a cancelled booking is refused by
 * the database if its time has been taken meanwhile.
 */
export async function updateBookingAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = z.uuid().parse(form.get("id"));
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  const parsedStatus = statusSchema.safeParse(form.get("status"));
  if (!parsedStatus.success) return { ok: false, error: "Status yanlışdır" };
  const status = parsedStatus.data;

  const [current] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!current || current.status === "blocked") return { ok: false, error: "Rezervasiya tapılmadı" };
  const changed = status !== current.status;
  if (changed && !transitions[current.status]?.includes(status)) {
    return { ok: false, error: "Bu statusa keçmək olmaz" };
  }

  let updated: typeof bookings.$inferSelect;
  try {
    updated = await db.transaction(async (tx) => {
      const [b] = await tx
        .update(bookings)
        .set({ status, adminNote: note, read: true })
        .where(eq(bookings.id, id))
        .returning();
      if (changed || note !== current.adminNote) {
        await tx.insert(bookingEvents).values({ bookingId: id, status, note: note !== current.adminNote ? note : "", userId: user.id });
      }
      return b;
    });
  } catch (error) {
    if (pgCode(error) === "23P01") return { ok: false, error: "Bu vaxt artıq başqa rezervasiya ilə tutulub" };
    throw error;
  }

  let mailed = false;
  if (changed && form.get("notify") === "on" && ["new", "confirmed", "rejected", "cancelled"].includes(status)) {
    try {
      mailed = await notifyCustomer(updated, status as CustomerStatus);
    } catch (error) {
      console.error("Booking status email failed", error);
      return { ok: true, message: "Yadda saxlanıldı, amma email göndərilmədi" };
    }
  }
  return { ok: true, message: mailed ? "Yadda saxlanıldı, müştəriyə email göndərildi" : "Yadda saxlanıldı" };
}

/** Admin-closed time (holiday, maintenance): a "blocked" row that occupies the studio. */
export async function blockTimeAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const studioId = z.uuid().safeParse(form.get("studioId"));
  const date = String(form.get("date") ?? "");
  const from = parseTime(String(form.get("start") ?? ""));
  const to = parseTime(String(form.get("end") ?? "").replace(/^00:00$/, "24:00"));
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (!studioId.success || !isDate(date) || from === null || to === null || to <= from) {
    return { ok: false, error: "Studiya, tarix və saatları düzgün seçin" };
  }
  const [studio] = await db.select().from(studios).where(eq(studios.id, studioId.data));
  if (!studio) return { ok: false, error: "Studiya tapılmadı" };
  const startsAt = bakuInstant(date, from);
  const endsAt = bakuInstant(date, to);
  try {
    const [b] = await db
      .insert(bookings)
      .values({
        studioId: studio.id,
        studioSnapshot: { name: studio.name.az, address: studio.address.az },
        startsAt,
        endsAt,
        blockedUntil: endsAt,
        status: "blocked",
        adminNote: note,
        source: "admin",
        read: true,
      })
      .returning({ id: bookings.id });
    await db.insert(bookingEvents).values({ bookingId: b.id, status: "blocked", note, userId: user.id });
  } catch (error) {
    if (pgCode(error) === "23P01") return { ok: false, error: "Bu vaxtda artıq rezervasiya var — əvvəlcə onu ləğv edin" };
    throw error;
  }
  return { ok: true, message: "Vaxt bağlandı" };
}

/** Removes blocked time (real bookings are never deleted, only cancelled). */
export async function unblockAction(form: FormData) {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  await db.delete(bookings).where(and(eq(bookings.id, id), eq(bookings.status, "blocked")));
  const back = String(form.get("back") ?? "");
  if (back.startsWith("/admin/bookings")) redirect(back);
}
