import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { packageRequests } from "@/db/schema";
import { formatInstant } from "@/lib/booking/time";
import { Card, EditGrid, PageHeader } from "../../_components/cms";
import { requestStatusBadge, requestStatusLabels } from "../labels";
import { RequestStatusForm } from "../status-form";

export default async function PackageRequestPage({ params }: PageProps<"/admin/package-requests/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [r] = await db.select().from(packageRequests).where(eq(packageRequests.id, id));
  if (!r) notFound();
  // Opening a new request marks it as seen (the menu badge counts unseen ones).
  if (!r.read) await db.update(packageRequests).set({ read: true }).where(eq(packageRequests.id, id));
  const custom = r.addonsSnapshot.some((a) => a.price === null);
  const rows: [string, string][] = [
    ["Paket", `${r.packageSnapshot.name} — ${r.packageSnapshot.price} AZN`],
    ["Add-on-lar", r.addonsSnapshot.map((a) => `${a.name} — ${a.price === null ? "fərdi qiymət" : `+${a.price} AZN`}`).join("\n") || "—"],
    ["Ümumi", `${r.total} AZN${custom ? " + fərdi qiymət" : ""}`],
    ["Ad, soyad", `${r.firstName} ${r.lastName}`],
    ["Telefon", r.phone],
    ["E-poçt", r.email],
    ["Göndərilib", formatInstant(r.createdAt)],
    ["Admin-ə email", r.notifiedAt ? formatInstant(r.notifiedAt) : "göndərilməyib"],
  ];
  return (
    <>
      <PageHeader
        title={`${r.firstName} ${r.lastName}`}
        crumbs={[{ label: "Paket müraciətləri", href: "/admin/package-requests" }, { label: r.packageSnapshot.name }]}
        actions={
          <span className={`self-center rounded-full px-3 py-1 text-[13px] font-medium ${requestStatusBadge[r.status]}`}>{requestStatusLabels[r.status]}</span>
        }
      />
      <EditGrid
        main={
          <Card>
            <p className="mb-4 text-[13px] text-cms-muted">Qiymətlər müraciət anındakı kimidir (sonradan dəyişsə də burada qalır).</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[10rem_1fr]">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-cms-muted">{k}</dt>
                  <dd className="whitespace-pre-wrap">
                    {k === "Telefon" ? (
                      <a href={`tel:${v.replace(/[^\d+]/g, "")}`} className="hover:underline">
                        {v}
                      </a>
                    ) : k === "E-poçt" ? (
                      <a href={`mailto:${v}`} className="hover:underline">
                        {v}
                      </a>
                    ) : (
                      v
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        }
        side={
          <Card>
            <RequestStatusForm id={r.id} status={r.status} note={r.adminNote} />
          </Card>
        }
      />
    </>
  );
}
