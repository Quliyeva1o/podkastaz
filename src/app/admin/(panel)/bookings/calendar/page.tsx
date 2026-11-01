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
const HOUR_PX = 60;
/** Height of one text line in a booking card, and its vertical padding + border. */
const LINE_PX = 15;
const CARD_PAD_PX = 8;

/**
 * Columns for one day: a booking uses the full width unless it overlaps others; overlapping ones
 * (any studios) share the width side by side, each group as wide as it needs.
 */
function layoutLanes<T extends { id: string; startsAt: Date; endsAt: Date }>(items: T[]) {
  const sorted = [...items].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || b.endsAt.getTime() - a.endsAt.getTime());
  const place = new Map<string, { lane: number; lanes: number }>();
  let group: T[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;
  const close = () => group.forEach((b) => (place.get(b.id)!.lanes = laneEnds.length));
  for (const b of sorted) {
    if (b.startsAt.getTime() >= groupEnd) {
      close();
      group = [];
      laneEnds = [];
    }
    let lane = laneEnds.findIndex((end) => end <= b.startsAt.getTime());
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = b.endsAt.getTime();
    groupEnd = Math.max(groupEnd, b.endsAt.getTime());
    group.push(b);
    place.set(b.id, { lane, lanes: 1 });
  }
  close();
  return place;
}

/**
 * Week view (Monday–Sunday, Baku time) of live bookings and blocked time, coloured by studio;
 * `?view=day&date=` shows one day with a column per studio and the customer's details.
 */
export default async function CalendarPage({ searchParams }: PageProps<"/admin/bookings/calendar">) {
  const sp = await searchParams;
  const dayView = sp.view === "day";
  const param = dayView ? sp.date : sp.week;
  const asked = typeof param === "string" && isDate(param) ? param : bakuDate();
  const monday = addDays(asked, -weekday(asked));
  const days = dayView ? [asked] : Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const rangeStart = days[0];
  const rangeEnd = addDays(days.at(-1)!, 1);
  const today = bakuDate();
  const step = dayView ? 1 : 7;
  const nav = (d: string) => (dayView ? `?view=day&date=${d}` : `?week=${d}`);

  const studioRows = await db.select().from(studios).orderBy(asc(studios.position));
  const color = new Map(studioRows.map((s, i) => [s.id, studioColors[i % studioColors.length]]));
  const rows = await db
    .select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["new", "confirmed", "completed", "blocked"]),
        lt(bookings.startsAt, bakuInstant(rangeEnd, 0)),
        gt(bookings.endsAt, bakuInstant(rangeStart, 0)),
      ),
    )
    .orderBy(asc(bookings.startsAt));

  // Visible hours: the earliest opening to the latest closing of all studios (at least 09–22).
  const opens = studioRows.flatMap((s) => s.hours.filter((h) => h !== null).map((h) => [Number(h.open.slice(0, 2)), Math.ceil(Number(h.close.slice(0, 2)) + Number(h.close.slice(3)) / 60)]));
  const first = Math.min(9, ...opens.map(([o]) => o));
  const last = Math.max(22, ...opens.map(([, c]) => c));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  // Columns: the 7 days (all studios side by side in each), or one column per studio for the day.
  const columns = dayView
    ? studioRows.map((s) => ({ key: s.id, day: asked, studio: s.id as string | null, label: s.name.az, href: null as string | null, today: false }))
    : days.map((d, i) => ({ key: d, day: d, studio: null as string | null, label: `${dayNames[i]} ${d.slice(8)}.${d.slice(5, 7)}`, href: `?view=day&date=${d}`, today: d === today }));

  return (
    <>
      <PageHeader
        title="Təqvim"
        crumbs={[{ label: "Rezervasiyalar", href: "/admin/bookings" }, { label: "Təqvim" }]}
        actions={
          <>
            <Link href={dayView ? `?week=${asked}` : `?view=day&date=${today >= monday && today < addDays(monday, 7) ? today : monday}`} className={buttonClass("light")}>
              {dayView ? "Həftə" : "Gün"}
            </Link>
            <Link href={nav(addDays(asked, -step))} aria-label={dayView ? "Əvvəlki gün" : "Əvvəlki həftə"} className={buttonClass("light", "px-3")}>
              <CaretLeft size={16} />
            </Link>
            <Link href={dayView ? `?view=day&date=${today}` : "?"} className={buttonClass("light")}>
              {dayView ? "Bu gün" : "Bu həftə"}
            </Link>
            <Link href={nav(addDays(asked, step))} aria-label={dayView ? "Növbəti gün" : "Növbəti həftə"} className={buttonClass("light", "px-3")}>
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
            {dayView ? `${dayNames[weekday(asked)]} ${formatDate(asked)}` : `${formatDate(monday)} – ${formatDate(addDays(monday, 6))}`}
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
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full bg-highlight" />
              {statusLabels.new}
            </li>
          </ul>
        </div>
        <div className="-mx-6 overflow-x-auto px-6">
          <div className="grid min-w-[1040px]" style={{ gridTemplateColumns: `3rem repeat(${columns.length}, 1fr)` }}>
            <div />
            {columns.map((c) => (
              <div key={c.key} className={`border-b border-cms-line pb-2 text-center text-[13px] ${c.today ? "font-semibold text-highlight" : "text-cms-muted"}`}>
                {c.href ? (
                  <Link href={c.href} className="hover:text-ink hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  c.label
                )}
              </div>
            ))}
            <div className="relative">
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="-translate-y-2 pr-2 text-right text-[11px] text-cms-muted">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {columns.map((c) => {
              const d = c.day;
              const dayStart = bakuInstant(d, 0).getTime();
              const dayEnd = bakuInstant(addDays(d, 1), 0).getTime();
              const items = rows.filter((b) => b.startsAt.getTime() < dayEnd && b.endsAt.getTime() > dayStart && (!c.studio || b.studioId === c.studio));
              const lanes = layoutLanes(items);
              return (
                <div key={c.key} className={`relative border-b border-l border-cms-line last:border-r ${d === today && !dayView ? "bg-highlight/4" : ""}`} style={{ height: HOUR_PX * hours.length }}>
                  {hours.map((h) => (
                    <div key={h} style={{ top: (h - first) * HOUR_PX }} className="absolute inset-x-0 border-t border-cms-line" />
                  ))}
                  {hours.map((h) => (
                    <div key={h} style={{ top: (h - first + 0.5) * HOUR_PX }} className="absolute inset-x-0 border-t border-dashed border-cms-line/50" />
                  ))}
                  {items.map((b) => {
                    const from = Math.max(b.startsAt.getTime(), dayStart);
                    const to = Math.min(b.endsAt.getTime(), dayEnd);
                    const startMin = from === dayStart ? 0 : bakuMinutes(new Date(from));
                    const endMin = to === dayEnd ? 1440 : bakuMinutes(new Date(to));
                    const top = ((startMin - first * 60) / 60) * HOUR_PX;
                    const height = Math.max(LINE_PX + CARD_PAD_PX, ((endMin - startMin) / 60) * HOUR_PX - 3);
                    const { lane, lanes: laneCount } = lanes.get(b.id) ?? { lane: 0, lanes: 1 };
                    const blocked = b.status === "blocked";
                    const isNew = b.status === "new";
                    const studioColor = color.get(b.studioId);
                    const time = `${formatTime(startMin)}–${formatTime(endMin)}`;
                    const who = blocked ? b.adminNote || statusLabels.blocked : `${b.firstName} ${b.lastName}`;
                    const details = dayView && !blocked ? [b.decorSnapshot?.name, b.phone].filter(Boolean).join(" · ") : blocked ? "" : b.studioSnapshot.name;
                    // Only the lines that fit whole: nothing is ever cut in half; the title has it all.
                    const room = Math.floor((height - CARD_PAD_PX) / LINE_PX) - 1;
                    const summary = [b.studioSnapshot.name, time, who, details, isNew ? statusLabels.new : ""].filter(Boolean);
                    return (
                      <Link
                        key={b.id}
                        href={`/admin/bookings/${b.id}`}
                        title={[...new Set(summary)].join(" · ")}
                        className={`@container absolute overflow-hidden rounded-md border-l-[3px] py-0.5 pr-0.5 pl-1 text-[11px] leading-[15px] text-ink shadow-[0_0_0_1px_white] transition-shadow outline-none hover:z-10 hover:shadow-[0_0_0_1px_white,0_4px_12px_rgb(41_39_38/0.22)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ink ${b.status === "completed" ? "opacity-55" : ""}`}
                        style={{
                          top: top + 1,
                          height,
                          left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                          width: `calc(${100 / laneCount}% - 4px)`,
                          borderLeftColor: blocked ? "#5d5957" : studioColor,
                          background: blocked
                            ? "repeating-linear-gradient(45deg,#f1f0ef 0 6px,#e5e4e3 6px 12px)"
                            : `color-mix(in srgb, ${studioColor} 16%, white)`,
                        }}
                      >
                        <span className="sr-only">{[...new Set(summary)].join(", ")}</span>
                        {isNew && <span aria-hidden className="absolute right-1 bottom-1 size-2 rounded-full bg-highlight ring-1 ring-white @[5rem]:top-1 @[5rem]:bottom-auto" />}
                        <span aria-hidden className="block truncate font-semibold tabular-nums @[5rem]:pr-2.5">
                          {formatTime(startMin)}
                          {/* The end time only where the card is wide enough for both. */}
                          <span className="hidden @[5rem]:inline">–{formatTime(endMin)}</span>
                        </span>
                        {/* A narrow card keeps the first name; its colour already says which studio. */}
                        {room > 0 && (
                          <span aria-hidden className="block truncate">
                            {blocked ? (
                              who
                            ) : (
                              <>
                                {b.firstName}
                                <span className="hidden @[4.5rem]:inline"> {b.lastName}</span>
                              </>
                            )}
                          </span>
                        )}
                        {room > 1 && details && <span aria-hidden className="hidden truncate text-cms-muted @[4.5rem]:block">{details}</span>}
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
