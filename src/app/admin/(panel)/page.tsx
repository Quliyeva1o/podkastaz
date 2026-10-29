import { CalendarCheck, CalendarDots, Envelope, ShoppingCartSimple } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { connection } from "next/server";
import { and, asc, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, media, submissions } from "@/db/schema";
import { statusBadge, statusLabels } from "@/lib/booking/labels";
import { addDays, bakuDate, bakuInstant, bakuMinutes, formatDate, formatTime } from "@/lib/booking/time";
import { Card, PageHeader, td, th } from "./_components/cms";

const dateFormat = new Intl.DateTimeFormat("az-AZ", { dateStyle: "short", timeStyle: "short" });

export default async function DashboardPage() {
  // "Today" is request-time data: never prerendered.
  await connection();
  const today = bakuDate();
  // Today's and tomorrow's live bookings (Baku time), soonest first.
  const soon = await db
    .select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["new", "confirmed"]),
        gte(bookings.startsAt, bakuInstant(today, 0)),
        lt(bookings.startsAt, bakuInstant(addDays(today, 2), 0)),
      ),
    )
    .orderBy(asc(bookings.startsAt));
  const todayCount = soon.filter((b) => bakuDate(b.startsAt) === today).length;
  const [{ fresh }] = await db
    .select({ fresh: count() })
    .from(bookings)
    .where(and(eq(bookings.status, "new"), eq(bookings.read, false)));
  const [{ total }] = await db.select({ total: count() }).from(submissions);
  const [{ unread }] = await db.select({ unread: count() }).from(submissions).where(eq(submissions.read, false));
  const [{ files }] = await db.select({ files: count() }).from(media);
  const latest = await db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(5);

  // Same four-tile strip as the previous panel's dashboard.
  const stats = [
    { value: todayCount, label: "Bugünkü rezervasiyalar", href: `/admin/bookings?from=${today}&to=${today}`, Icon: CalendarDots },
    { value: fresh, label: "Yeni müraciətlər (baxılmamış)", href: "/admin/bookings?status=new", Icon: CalendarCheck },
    { value: total, label: "Mesajlar", note: unread ? `${unread} yeni` : undefined, href: "/admin/submissions", Icon: Envelope },
    { value: files, label: "Media faylları", href: "/admin/media", Icon: ShoppingCartSimple },
  ];

  return (
    <>
      <PageHeader title="Dashboard" />
      <Card accent={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ value, label, note, href, Icon }, i) => (
            <Link
              key={label}
              href={href}
              className={`group flex items-center gap-5 rounded-2xl px-5 py-4 hover:bg-cms-bg ${i > 0 ? "xl:border-l xl:border-cms-line xl:rounded-l-none" : ""}`}
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-highlight">
                <Icon size={28} />
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-[2rem] leading-none font-semibold tracking-[-0.02em] text-cms-text">{value}</span>
                <span className="text-[14px] text-cms-muted">{label}</span>
              </span>
              {note && <span className="self-start rounded-full bg-highlight px-2 py-0.5 text-[11px] font-medium text-white">{note}</span>}
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-7">
        <Card accent={false} title="Bu gün və sabah">
          {soon.length === 0 ? (
            <p>Bu gün və sabah rezervasiya yoxdur.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-cms-line">
              {soon.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-cms-link">
                    <span className="w-44 font-medium">
                      {bakuDate(b.startsAt) === today ? "Bu gün" : "Sabah"}, {formatTime(bakuMinutes(b.startsAt))}–{formatTime(bakuMinutes(b.endsAt) || 1440)}
                    </span>
                    <span className="flex-1">
                      {b.studioSnapshot.name} · {b.firstName} {b.lastName}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${statusBadge[b.status]}`}>{statusLabels[b.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[13px] text-cms-muted">
            <Link href="/admin/bookings/calendar" className="underline-offset-2 hover:underline">
              Təqvim ({formatDate(today)} həftəsi) →
            </Link>
          </p>
        </Card>
      </div>

      <div className="mt-7">
        <Card accent={false} title="Son mesajlar">
          {latest.length === 0 ? (
            <p>Hələ müraciət yoxdur.</p>
          ) : (
            <div className="-mx-6 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr>
                    <th className={th}>Adı</th>
                    <th className={th}>E-mail</th>
                    <th className={th}>Telefon</th>
                    <th className={th}>Tarix</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map((s) => (
                    <tr key={s.id} className={s.read ? "" : "font-bold"}>
                      <td className={td}>
                        <Link href={`/admin/submissions/${s.id}`} className="underline-offset-2 hover:underline">
                          {s.data.name || "—"}
                        </Link>
                      </td>
                      <td className={td}>{s.data.email}</td>
                      <td className={td}>{s.data.phone}</td>
                      <td className={td}>{dateFormat.format(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
