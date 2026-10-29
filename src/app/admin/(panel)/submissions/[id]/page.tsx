import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { Button, buttonClass, ButtonLink, Card, PageHeader } from "../../_components/cms";
import { ConfirmButton } from "../../_components/cms-client";
import { deleteSubmissionAction, markUnreadAction } from "../actions";

const dateFormat = new Intl.DateTimeFormat("az-AZ", { dateStyle: "long", timeStyle: "short" });
const labels: Record<string, string> = { name: "Adı", email: "E-mail", phone: "Telefon", subject: "Mövzu", message: "Mesaj" };

export default async function SubmissionPage({ params }: PageProps<"/admin/submissions/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!row) notFound();
  if (!row.read) await db.update(submissions).set({ read: true }).where(eq(submissions.id, id));

  return (
    <>
      <PageHeader
        title={row.data.name || "Müraciət"}
        crumbs={[{ label: "Müraciətlər", href: "/admin/submissions" }, { label: dateFormat.format(row.createdAt) }]}
        actions={<ButtonLink href="/admin/submissions" variant="light">← Siyahı</ButtonLink>}
      />
      <Card>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-[160px_1fr]">
          {Object.entries(row.data).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-medium text-cms-label">{labels[k] ?? k}</dt>
              <dd className="whitespace-pre-wrap">
                {k === "email" && v ? (
                  <a href={`mailto:${v}`} className="text-cms-link hover:underline">{v}</a>
                ) : k === "phone" && v ? (
                  <a href={`tel:${v.replace(/\s+/g, "")}`} className="text-cms-link hover:underline">{v}</a>
                ) : (
                  v || "—"
                )}
              </dd>
            </div>
          ))}
          <dt className="font-medium text-cms-label">Dil</dt>
          <dd>{row.locale.toUpperCase()}</dd>
          <dt className="font-medium text-cms-label">Email bildirişi</dt>
          <dd>{row.notifiedAt ? `Göndərilib · ${dateFormat.format(row.notifiedAt)}` : "Göndərilməyib (SMTP və ya alıcı qeyd olunmayıb)"}</dd>
        </dl>
        <div className="mt-8 flex gap-2 border-t border-cms-line pt-5">
          <form action={markUnreadAction}>
            <input type="hidden" name="id" value={row.id} />
            <Button variant="light">Oxunmamış et</Button>
          </form>
          <form action={deleteSubmissionAction}>
            <input type="hidden" name="id" value={row.id} />
            <ConfirmButton message="Bu müraciət silinsin?" className={buttonClass("danger")}>
              Sil
            </ConfirmButton>
          </form>
        </div>
      </Card>
    </>
  );
}
