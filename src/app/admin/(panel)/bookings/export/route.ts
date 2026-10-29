import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { statusLabels } from "@/lib/booking/labels";
import { bakuDate, bakuMinutes, formatDate, formatInstant, formatTime } from "@/lib/booking/time";
import { bookingOrder, bookingWhere, readFilters } from "../query";

const cell = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV of the bookings matching the list filters (Excel-friendly: BOM + semicolons). */
export async function GET(request: Request) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const f = readFilters(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await db.select().from(bookings).where(bookingWhere(f)).orderBy(...bookingOrder(f)).limit(10_000);
  const header = ["Tarix", "Başlama", "Bitmə", "Studiya", "Dekor", "İstək", "Ad", "Soyad", "Telefon", "E-poçt", "Status", "Qeyd", "Göndərilib"];
  const lines = rows.map((b) =>
    [
      formatDate(bakuDate(b.startsAt)),
      formatTime(bakuMinutes(b.startsAt)),
      formatTime(bakuMinutes(b.endsAt) || 1440),
      b.studioSnapshot.name,
      b.decorSnapshot?.name ?? "",
      b.customRequest ?? "",
      b.firstName,
      b.lastName,
      b.phone,
      b.email,
      statusLabels[b.status],
      b.adminNote,
      formatInstant(b.createdAt),
    ]
      .map(cell)
      .join(";"),
  );
  return new Response("﻿" + [header.join(";"), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rezervasiyalar-${bakuDate()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
