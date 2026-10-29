import { Trash } from "@phosphor-icons/react/dist/ssr";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { redirects } from "@/db/schema";
import { buttonClass, Card, PageHeader, TableCard, td, th } from "../_components/cms";
import { ConfirmButton } from "../_components/cms-client";
import { RedirectForm } from "./redirect-form";
import { deleteRedirectAction } from "./actions";

/** 301 redirects from old URLs (old marketinq.az pages, renamed slugs, removed articles). */
export default async function RedirectsPage() {
  const rows = await db.select().from(redirects).orderBy(asc(redirects.from));

  return (
    <>
      <PageHeader title="Yönləndirmələr" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Yönləndirmələr" }]} />
      <div className="flex flex-col gap-6">
        <Card>
          <p className="mb-4 text-[14px] text-cms-muted">
            Köhnə ünvanı yeni ünvana yönləndirir (301). Sonu <code>{"/*"}</code> ilə bitən ünvan altındakı bütün səhifələri əhatə edir,
            məsələn <code>{"/xeber/*"}</code>. Dəqiq ünvan qaydası həmişə üstündür.
          </p>
          <RedirectForm />
        </Card>
        <TableCard total={rows.length}>
          <thead>
            <tr>
              <th className={th}>Köhnə ünvan</th>
              <th className={th}>Yeni ünvan</th>
              <th className={th}>Növ</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} font-mono text-[13px]`}>{r.from}</td>
                <td className={`${td} font-mono text-[13px]`}>{r.to}</td>
                <td className={td}>{r.permanent ? "301" : "302"}</td>
                <td className={td}>
                  <form action={deleteRedirectAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton message={`${r.from} silinsin?`} className={buttonClass("danger", "px-3")}>
                      <Trash size={16} weight="fill" />
                      <span className="sr-only">Sil</span>
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
    </>
  );
}
