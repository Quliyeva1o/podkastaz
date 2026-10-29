import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getPageContent } from "@/lib/content/queries";
import { sendMail, tableEmail } from "@/lib/mail";
import { siteUrl } from "@/lib/seo";
import type { BookingEmailsData, NotificationsData } from "@/sections/types";
import { bakuDate, bakuMinutes, formatDate, formatTime } from "./time";

type Booking = typeof bookings.$inferSelect;
export type CustomerStatus = "new" | "confirmed" | "rejected" | "cancelled";

async function globalSection<T>(type: string) {
  return (await getPageContent("global")).sections.find((s) => s.type === type)?.data as T | undefined;
}

const when = (b: Booking) => ({
  tarix: formatDate(bakuDate(b.startsAt)),
  // An end at midnight reads 24:00.
  saat: `${formatTime(bakuMinutes(b.startsAt))} – ${formatTime(bakuMinutes(b.endsAt) || 1440)}`,
});

function rows(b: Booking): [string, string][] {
  const w = when(b);
  return [
    ["Studiya", `${b.studioSnapshot.name}${b.studioSnapshot.address ? ` (${b.studioSnapshot.address})` : ""}`],
    ["Dekor", b.decorSnapshot?.name ?? ""],
    ["İstək", b.customRequest ?? ""],
    ["Tarix", w.tarix],
    ["Saat", w.saat],
    ["Ad, soyad", `${b.firstName} ${b.lastName}`.trim()],
    ["Telefon", b.phone],
    ["E-poçt", b.email],
  ];
}

/** {ad} {studiya} {dekor} {tarix} {saat} in an admin template. */
function fill(template: string, b: Booking) {
  const values: Record<string, string> = {
    ad: b.firstName,
    studiya: b.studioSnapshot.name,
    dekor: b.decorSnapshot?.name ?? b.customRequest ?? "",
    ...when(b),
  };
  return template.replace(/\{(ad|studiya|dekor|tarix|saat)\}/g, (_, k: string) => values[k]);
}

const validEmails = (list: string) => list.split(/[,;\s]+/).filter((a) => z.email().safeParse(a).success);

/** New booking → the recipients from Ayarlar → Email bildirişləri. */
export async function notifyAdmin(b: Booking) {
  const [settings, templates] = await Promise.all([
    globalSection<NotificationsData>("notifications"),
    globalSection<BookingEmailsData>("bookingEmails"),
  ]);
  const to = validEmails(settings?.recipients?.trim() || process.env.NOTIFY_EMAIL || "");
  const w = when(b);
  const subject = `${fill(templates?.adminSubject?.az || "Yeni rezervasiya", b)}: ${b.studioSnapshot.name}, ${w.tarix} ${w.saat}`;
  const mail = tableEmail(subject, rows(b), { label: "Admin paneldə aç", href: `${siteUrl}/admin/bookings/${b.id}` });
  const sent = await sendMail({ to, subject, ...mail, replyTo: b.email || undefined });
  if (sent) await db.update(bookings).set({ notifiedAt: new Date() }).where(eq(bookings.id, b.id));
  return sent;
}

/** The customer's email for a status (admin templates). Returns false when nothing was sent. */
export async function notifyCustomer(b: Booking, status: CustomerStatus) {
  if (!b.email) return false;
  const templates = await globalSection<BookingEmailsData>("bookingEmails");
  const subject = fill(templates?.[`${status}Subject`]?.az || "Rezervasiya", b);
  const body = fill(templates?.[`${status}Body`]?.az || "", b);
  const mail = tableEmail(subject, rows(b).slice(0, 5), undefined, body.split(/\n\s*\n/).filter(Boolean));
  return sendMail({ to: [b.email], subject, ...mail });
}
