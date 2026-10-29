import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { packageRequests } from "@/db/schema";
import { formatInstant } from "@/lib/booking/time";
import { buttonClass, inputClass, PageHeader, TableCard, td, th } from "../_components/cms";
import { requestStatusBadge, requestStatusLabels } from "./labels";

const PER_PAGE = 25;
type Status = (typeof packageRequests.$inferSelect)["status"];

export default async function PackageRequestsPage({ searchParams }: PageProps<"/admin/package-requests">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in requestStatusLabels ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where: SQL[] = [];
  if (status) where.push(eq(packageRequests.status, status as Status));
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(
      or(
        ilike(packageRequests.firstName, like),
        ilike(packageRequests.lastName, like),
        ilike(packageRequests.phone, like),
        ilike(packageRequests.email, like),
      )!,
    );
  }
  const condition = and(...where);
  const [{ total }] = await db.select({ total: count() }).from(packageRequests).where(condition);
  const rows = await db
    .select()
    .from(packageRequests)
    .where(condition)
    .orderBy(desc(packageRequests.createdAt))
    .limit(PER_PAGE)
    .offset((page - 1) * PER_PAGE);
  const pages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <PageHeader title="Paket müraciətləri" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Paket müraciətləri" }]} />
      <TableCard
        total={total}
        from={total ? (page - 1) * PER_PAGE + 1 : 0}
        to={Math.min(page * PER_PAGE, total)}
        toolbar={
          <form className="flex flex-wrap gap-2">
            <select name="status" defaultValue={status} aria-label="Status" className={`${inputClass} w-44`}>
              <option value="">Bütün statuslar</option>
              {Object.entries(requestStatusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input name="q" defaultValue={q} placeholder="Ad, telefon, email" aria-label="Axtar" className={`${inputClass} w-52`} />
            <button className={buttonClass("primary")}>Axtar</button>
          </form>
        }
        footer={
          pages > 1 && (
            <nav aria-label="Səhifələr" className="mt-6 flex flex-wrap gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`?${new URLSearchParams({ status, q, page: String(p) })}`}
                  className={buttonClass(p === page ? "primary" : "light", "px-3 py-1.5")}
                >
                  {p}
                </Link>
              ))}
            </nav>
          )
        }
      >
        <thead>
          <tr>
            <th className={th}>Müştəri</th>
            <th className={th}>Paket</th>
            <th className={th}>Ümumi</th>
            <th className={th}>Telefon</th>
            <th className={th}>Status</th>
            <th className={th}>Göndərilib</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.read ? "" : "bg-highlight/10 font-medium"}>
              <td className={td}>
                <Link href={`/admin/package-requests/${r.id}`} className="hover:text-cms-link">
                  {r.firstName} {r.lastName}
                </Link>
              </td>
              <td className={td}>
                {r.packageSnapshot.name}
                {r.addonsSnapshot.length > 0 && <span className="block text-[12px] text-cms-muted">+ {r.addonsSnapshot.length} add-on</span>}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                {r.total} AZN{r.addonsSnapshot.some((a) => a.price === null) ? " + fərdi" : ""}
              </td>
              <td className={td}>{r.phone}</td>
              <td className={td}>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ${requestStatusBadge[r.status]}`}>
                  {requestStatusLabels[r.status]}
                </span>
              </td>
              <td className={`${td} whitespace-nowrap text-cms-muted`}>{formatInstant(r.createdAt)}</td>
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
