import { CaretLeft, CaretRight, ListBullets } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { and, asc, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, studios } from "@/db/schema";
import { statusLabels, studioColors } from "@/lib/booking/labels";
import { addDays, bakuDate, bakuInstant, bakuMinutes, formatDate, formatTime, isDate, weekday } from "@/lib/booking/time";
import { buttonClass, Card, PageHeader } from "../../_components/cms";
import { BlockForm } from "./block-form";

const dayNames = ["B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş.", "B."];
const HOUR_PX = 44;

/** Week view (Monday–Sunday, Baku time) of live bookings and blocked time, coloured by studio. */
export default async function CalendarPage({ searchParams }: PageProps<"/admin/bookings/calendar">) {
  const sp = await searchParams;
  const asked = typeof sp.week === "string" && isDate(sp.week) ? sp.week : bakuDate();
  const monday = addDays(asked, -weekday(asked));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = bakuDate();

  const studioRows = await db.select().from(studios).orderBy(asc(studios.position));
  const color = new Map(studioRows.map((s, i) => [s.id, studioColors[i % studioColors.length]]));
  const rows = await db
    .select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["new", "confirmed", "completed", "blocked"]),
        lt(bookings.startsAt, bakuInstant(addDays(monday, 7), 0)),
        gt(bookings.endsAt, bakuInstant(monday, 0)),
      ),
    )
    .orderBy(asc(bookings.startsAt));

  // Visible hours: the earliest opening to the latest closing of all studios (at least 09–22).
  const opens = studioRows.flatMap((s) => s.hours.filter((h) => h !== null).map((h) => [Number(h.open.slice(0, 2)), Math.ceil(Number(h.close.slice(0, 2)) + Number(h.close.slice(3)) / 60)]));
  const first = Math.min(9, ...opens.map(([o]) => o));
  const last = Math.max(22, ...opens.map(([, c]) => c));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);

  return (
    <>
      <PageHeader
        title="Təqvim"
        crumbs={[{ label: "Rezervasiyalar", href: "/admin/bookings" }, { label: "Təqvim" }]}
        actions={
          <>
            <Link href={`?week=${addDays(monday, -7)}`} aria-label="Əvvəlki həftə" className={buttonClass("light", "px-3")}>
              <CaretLeft size={16} />
            </Link>
            <Link href="?" className={buttonClass("light")}>
              Bu həftə
            </Link>
            <Link href={`?week=${addDays(monday, 7)}`} aria-label="Növbəti həftə" className={buttonClass("light", "px-3")}>
              <CaretRight size={16} />
            </Link>
            <Link href="/admin/bookings" className={buttonClass("light")}>
              <ListBullets size={16} /> Siyahı
            </Link>
          </>
        }
      />

      <Card accent={false}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium">
            {formatDate(monday)} – {formatDate(addDays(monday, 6))}
          </p>
          <ul className="flex flex-wrap gap-4 text-[13px]">
            {studioRows.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-full" style={{ background: color.get(s.id) }} />
                {s.name.az}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-full bg-[repeating-linear-gradient(45deg,#292726_0_3px,#85807d_3px_6px)]" />
              {statusLabels.blocked}
            </li>
          </ul>
        </div>
        <div className="-mx-6 overflow-x-auto px-6">
          <div className="grid min-w-[880px] grid-cols-[3rem_repeat(7,1fr)]">
            <div />
            {days.map((d, i) => (
              <div key={d} className={`border-b border-cms-line pb-2 text-center text-[13px] ${d === today ? "font-semibold text-highlight" : "text-cms-muted"}`}>
                {dayNames[i]} {d.slice(8)}.{d.slice(5, 7)}
              </div>
            ))}
            <div className="relative">
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="-translate-y-2 pr-2 text-right text-[11px] text-cms-muted">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {days.map((d) => {
              const dayStart = bakuInstant(d, 0).getTime();
              const dayEnd = bakuInstant(addDays(d, 1), 0).getTime();
              const items = rows.filter((b) => b.startsAt.getTime() < dayEnd && b.endsAt.getTime() > dayStart);
              // Side by side when bookings of different studios overlap.
              const lanes = new Map(studioRows.map((s, i) => [s.id, i]));
              const laneCount = Math.max(1, studioRows.length);
              return (
                <div key={d} className="relative border-l border-cms-line" style={{ height: HOUR_PX * hours.length }}>
                  {hours.map((h) => (
                    <div key={h} style={{ top: (h - first) * HOUR_PX }} className="absolute inset-x-0 border-t border-cms-line" />
                  ))}
                  {items.map((b) => {
                    const from = Math.max(b.startsAt.getTime(), dayStart);
                    const to = Math.min(b.endsAt.getTime(), dayEnd);
                    const startMin = from === dayStart ? 0 : bakuMinutes(new Date(from));
                    const endMin = to === dayEnd ? 1440 : bakuMinutes(new Date(to));
                    const top = ((startMin - first * 60) / 60) * HOUR_PX;
                    const height = Math.max(18, ((endMin - startMin) / 60) * HOUR_PX - 2);
                    const lane = lanes.get(b.studioId) ?? 0;
                    const blocked = b.status === "blocked";
                    return (
                      <Link
                        key={b.id}
                        href={`/admin/bookings/${b.id}`}
                        title={`${b.studioSnapshot.name}, ${formatTime(startMin)}–${formatTime(endMin)}`}
                        className={`absolute overflow-hidden rounded-md px-1.5 py-1 text-[11px] leading-tight text-white hover:z-10 hover:ring-2 hover:ring-ink ${b.status === "new" ? "ring-2 ring-white ring-inset" : ""}`}
                        style={{
                          top,
                          height,
                          left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                          width: `calc(${100 / laneCount}% - 4px)`,
                          background: blocked ? "repeating-linear-gradient(45deg,#292726 0 6px,#5d5957 6px 12px)" : color.get(b.studioId),
                          opacity: b.status === "completed" ? 0.55 : 1,
                        }}
                      >
                        <span className="block font-semibold">
                          {formatTime(startMin)}–{formatTime(endMin)}
                        </span>
                        <span className="block truncate">{blocked ? b.adminNote || statusLabels.blocked : `${b.firstName} ${b.lastName}`}</span>
                        {b.status === "new" && <span className="block truncate opacity-90">{statusLabels.new}</span>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="mt-7">
        <Card accent={false} title="Vaxtı bağla (bayram, texniki iş)">
          <BlockForm studios={studioRows.map((s) => ({ id: s.id, name: s.name.az }))} date={asked} />
        </Card>
      </div>
    </>
  );
}
