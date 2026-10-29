import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bookingEvents, bookings, users } from "@/db/schema";
import { statusBadge, statusLabels } from "@/lib/booking/labels";
import { bakuDate, bakuMinutes, formatDate, formatInstant, formatTime } from "@/lib/booking/time";
import { buttonClass, Card, EditGrid, PageHeader } from "../../_components/cms";
import { ConfirmButton } from "../../_components/cms-client";
import { unblockAction } from "../actions";
import { StatusForm } from "../status-form";

const next: Record<string, string[]> = {
  new: ["new", "confirmed", "rejected", "cancelled"],
  confirmed: ["confirmed", "cancelled", "completed", "new"],
  rejected: ["rejected", "new"],
  cancelled: ["cancelled", "new"],
  completed: ["completed", "confirmed"],
};

export default async function BookingPage({ params }: PageProps<"/admin/bookings/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!b) notFound();
  const events = await db
    .select({ status: bookingEvents.status, note: bookingEvents.note, at: bookingEvents.at, user: users.name })
    .from(bookingEvents)
    .leftJoin(users, eq(users.id, bookingEvents.userId))
    .where(eq(bookingEvents.bookingId, id))
    .orderBy(asc(bookingEvents.at));
  // Opening a new request marks it as seen (the menu badge counts unseen ones).
  if (!b.read) await db.update(bookings).set({ read: true }).where(eq(bookings.id, id));

  const when = `${formatDate(bakuDate(b.startsAt))}, ${formatTime(bakuMinutes(b.startsAt))} – ${formatTime(bakuMinutes(b.endsAt) || 1440)}`;
  const rows: [string, string][] = [
    ["Studiya", `${b.studioSnapshot.name}${b.studioSnapshot.address ? ` (${b.studioSnapshot.address})` : ""}`],
    ["Dekor", b.decorSnapshot?.name ?? (b.status === "blocked" ? "—" : "Digər")],
    ["İstək", b.customRequest ?? ""],
    ["Tarix, saat", when],
    ["Ad, soyad", `${b.firstName} ${b.lastName}`.trim()],
    ["Telefon", b.phone],
    ["E-poçt", b.email],
    ["Haradan", b.source === "decor" ? "Dekor səhifəsindən" : b.source === "admin" ? "Admin" : "Birbaşa"],
    ["Göndərilib", formatInstant(b.createdAt)],
    ["Admin-ə email", b.notifiedAt ? formatInstant(b.notifiedAt) : b.status === "blocked" ? "" : "göndərilməyib"],
  ];

  return (
    <>
      <PageHeader
        title={b.status === "blocked" ? "Bağlı vaxt" : `${b.firstName} ${b.lastName}`}
        crumbs={[{ label: "Rezervasiyalar", href: "/admin/bookings" }, { label: when }]}
        actions={<span className={`self-center rounded-full px-3 py-1 text-[13px] font-medium ${statusBadge[b.status]}`}>{statusLabels[b.status]}</span>}
      />
      <EditGrid
        main={
          <>
            <Card>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[10rem_1fr]">
                {rows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-cms-muted">{k}</dt>
                      <dd className="whitespace-pre-wrap">
                        {k === "Telefon" ? <a href={`tel:${v.replace(/[^\d+]/g, "")}`} className="hover:underline">{v}</a> : k === "E-poçt" ? <a href={`mailto:${v}`} className="hover:underline">{v}</a> : v}
                      </dd>
                    </div>
                  ))}
              </dl>
            </Card>
            <Card accent={false} title="Tarixçə">
              <ol className="flex flex-col gap-3">
                {events.map((e, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[13px] text-cms-muted">{formatInstant(e.at)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[12px] ${statusBadge[e.status]}`}>{statusLabels[e.status]}</span>
                    <span className="text-[13px]">{e.user ?? "Sayt"}</span>
                    {e.note && <span className="w-full text-[13px] whitespace-pre-wrap text-cms-muted">{e.note}</span>}
                  </li>
                ))}
              </ol>
            </Card>
          </>
        }
        side={
          <Card>
            {b.status === "blocked" ? (
              <form action={unblockAction} className="flex flex-col gap-4">
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="back" value="/admin/bookings/calendar" />
                {b.adminNote && <p>{b.adminNote}</p>}
                <ConfirmButton message="Bu bağlı vaxt silinsin? Vaxt yenidən rezervasiyaya açılacaq." className={buttonClass("danger", "w-full")}>
                  <span>Bağlı vaxtı sil</span>
                </ConfirmButton>
              </form>
            ) : (
              <StatusForm
                id={b.id}
                status={b.status}
                note={b.adminNote}
                canMail={Boolean(b.email)}
                options={(next[b.status] ?? [b.status]).map((v) => ({ value: v, label: statusLabels[v] }))}
              />
            )}
          </Card>
        }
      />
    </>
  );
}
