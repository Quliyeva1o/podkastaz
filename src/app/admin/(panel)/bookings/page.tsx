import { CalendarBlank, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { db } from "@/db";
import { bookings, studios } from "@/db/schema";
import { statusBadge, statusLabels } from "@/lib/booking/labels";
import { bakuDate, bakuMinutes, formatDate, formatInstant, formatTime } from "@/lib/booking/time";
import { buttonClass, inputClass, PageHeader, TableCard, td, th } from "../_components/cms";
import { bookingOrder, bookingWhere, readFilters } from "./query";

const PER_PAGE = 25;

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const sp = await searchParams;
  const f = readFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = bookingWhere(f);

  const [{ total }] = await db.select({ total: count() }).from(bookings).where(where);
  const rows = await db
    .select()
    .from(bookings)
    .where(where)
    .orderBy(...bookingOrder(f))
    .limit(PER_PAGE)
    .offset((page - 1) * PER_PAGE);
  const studioRows = await db.select({ id: studios.id, name: studios.name }).from(studios).orderBy(asc(studios.position));
  const query = (extra: Record<string, string>) => `?${new URLSearchParams({ ...f, ...extra })}`;
  const pages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <PageHeader
        title="Rezervasiyalar"
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Rezervasiyalar" }]}
        actions={
          <>
            <Link href="/admin/bookings/calendar" className={buttonClass("light")}>
              <CalendarBlank size={16} /> Təqvim
            </Link>
            <a href={`/admin/bookings/export${query({})}`} className={buttonClass("light")}>
              <DownloadSimple size={16} /> CSV
            </a>
          </>
        }
      />
      <TableCard
        total={total}
        from={total ? (page - 1) * PER_PAGE + 1 : 0}
        to={Math.min(page * PER_PAGE, total)}
        toolbar={
          <form className="flex flex-wrap items-end gap-2">
            <select name="status" defaultValue={f.status} aria-label="Status" className={`${inputClass} w-40`}>
              <option value="">Bütün statuslar</option>
              {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select name="studio" defaultValue={f.studio} aria-label="Studiya" className={`${inputClass} w-40`}>
              <option value="">Bütün studiyalar</option>
              {studioRows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name.az}
                </option>
              ))}
            </select>
            <input type="date" name="from" defaultValue={f.from} aria-label="Tarixdən" className={`${inputClass} w-40`} />
            <input type="date" name="to" defaultValue={f.to} aria-label="Tarixədək" className={`${inputClass} w-40`} />
            <input name="q" defaultValue={f.q} placeholder="Ad, telefon, email" aria-label="Axtar" className={`${inputClass} w-52`} />
            <button className={buttonClass("primary")}>Axtar</button>
          </form>
        }
        footer={
          pages > 1 && (
            <nav aria-label="Səhifələr" className="mt-6 flex flex-wrap gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={query({ page: String(p) })} className={buttonClass(p === page ? "primary" : "light", "px-3 py-1.5")}>
                  {p}
                </Link>
              ))}
            </nav>
          )
        }
      >
        <thead>
          <tr>
            <th className={th}>Tarix, saat</th>
            <th className={th}>Studiya / dekor</th>
            <th className={th}>Müştəri</th>
            <th className={th}>Telefon</th>
            <th className={th}>Status</th>
            <th className={th}>Göndərilib</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className={b.status === "new" && !b.read ? "bg-highlight/10 font-medium" : ""}>
              <td className={td}>
                <Link href={`/admin/bookings/${b.id}`} className="whitespace-nowrap hover:text-cms-link">
                  {formatDate(bakuDate(b.startsAt))}, {formatTime(bakuMinutes(b.startsAt))}–{formatTime(bakuMinutes(b.endsAt) || 1440)}
                </Link>
              </td>
              <td className={td}>
                {b.studioSnapshot.name}
                <span className="block text-[12px] text-cms-muted">{b.decorSnapshot?.name ?? (b.status === "blocked" ? b.adminNote : b.customRequest ? `Digər: ${b.customRequest}` : "Digər")}</span>
              </td>
              <td className={td}>
                <Link href={`/admin/bookings/${b.id}`} className="hover:text-cms-link">
                  {b.status === "blocked" ? "—" : `${b.firstName} ${b.lastName}`}
                </Link>
              </td>
              <td className={td}>{b.phone}</td>
              <td className={td}>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ${statusBadge[b.status]}`}>{statusLabels[b.status]}</span>
              </td>
              <td className={`${td} whitespace-nowrap text-cms-muted`}>{formatInstant(b.createdAt)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className={td} colSpan={6}>
                Heç nə tapılmadı.
              </td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}
