import { Eye } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { and, count, desc, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { buttonClass, inputClass, PageHeader, TableCard, td, th } from "../_components/cms";

const PER_PAGE = 20;
const dateFormat = new Intl.DateTimeFormat("az-AZ", { dateStyle: "short", timeStyle: "short" });
const filters = [
  ["name", "Adı"],
  ["email", "E-mail"],
  ["phone", "Telefon"],
  ["subject", "Mövzu"],
  ["message", "Mesaj"],
] as const;

export default async function SubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  const params = await searchParams;
  const value = (k: string) => (typeof params[k] === "string" ? (params[k] as string).trim() : "");
  const page = Math.max(1, Number(value("page")) || 1);

  const where: SQL[] = [];
  for (const [key] of filters) {
    const v = value(key);
    if (v) where.push(ilike(sql`${submissions.data}->>${key}`, `%${v}%`));
  }
  const q = value("q");
  if (q) where.push(or(...filters.map(([k]) => ilike(sql`${submissions.data}->>${k}`, `%${q}%`)))!);
  const condition = where.length ? and(...where) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(submissions).where(condition);
  const rows = await db
    .select()
    .from(submissions)
    .where(condition)
    .orderBy(desc(submissions.createdAt))
    .limit(PER_PAGE)
    .offset((page - 1) * PER_PAGE);
  const pages = Math.ceil(total / PER_PAGE);
  const pageHref = (p: number) => `?${new URLSearchParams({ ...(params as Record<string, string>), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Müraciətlər" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Əlaqə formu" }]} />
      <TableCard
        total={total}
        from={total ? (page - 1) * PER_PAGE + 1 : 0}
        to={Math.min(page * PER_PAGE, total)}
        footer={
          pages > 1 && (
            <nav aria-label="Səhifələr" className="mt-6 flex flex-wrap gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={pageHref(p)} className={buttonClass(p === page ? "primary" : "light", "px-3 py-1.5")}>
                  {p}
                </Link>
              ))}
            </nav>
          )
        }
      >
        <thead>
          <tr>
            <th className={th}>#</th>
            {filters.map(([, label]) => (
              <th key={label} className={th}>
                {label}
              </th>
            ))}
            <th className={th}>Tarix</th>
            <th className={th} />
          </tr>
          {/* Filter row: plain GET form, so filters live in the URL. */}
          <tr>
            <td className="px-7 pb-4" />
            {filters.map(([key, label]) => (
              <td key={key} className="px-2 pb-4">
                <input form="filters" name={key} defaultValue={value(key)} aria-label={`${label} üzrə axtar`} className={inputClass} />
              </td>
            ))}
            <td className="px-2 pb-4" colSpan={2}>
              <form id="filters" className="flex gap-2">
                <button className={buttonClass("primary")}>Axtar</button>
                <Link href="/admin/submissions" className={buttonClass("light")}>
                  Sıfırla
                </Link>
              </form>
            </td>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.id} className={s.read ? "" : "bg-highlight/10 font-medium"}>
              <td className={td}>{(page - 1) * PER_PAGE + i + 1}</td>
              <td className={td}>{s.data.name}</td>
              <td className={td}>{s.data.email}</td>
              <td className={td}>{s.data.phone}</td>
              <td className={td}>{s.data.subject}</td>
              <td className={`${td} max-w-60 truncate`}>{s.data.message}</td>
              <td className={`${td} whitespace-nowrap`}>{dateFormat.format(s.createdAt)}</td>
              <td className={td}>
                <Link href={`/admin/submissions/${s.id}`} aria-label="Bax" className={buttonClass("info", "px-3")}>
                  <Eye size={16} />
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className={td} colSpan={8}>
                Müraciət tapılmadı.
              </td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}
