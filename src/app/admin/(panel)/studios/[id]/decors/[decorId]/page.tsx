import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { decors, studios } from "@/db/schema";
import { href } from "@/i18n/routes";
import { decorFields, decorToEditor } from "@/lib/studios/fields";
import { withDefaults } from "@/sections/fields";
import { buttonClass, Card, PageHeader } from "../../../../_components/cms";
import { ConfirmButton } from "../../../../_components/cms-client";
import { RecordEditor } from "../../../../_components/record-editor";
import { deleteDecorAction, saveDecorAction } from "../../../actions";

export default async function EditDecorPage({ params }: PageProps<"/admin/studios/[id]/decors/[decorId]">) {
  const { id, decorId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(decorId).success) notFound();
  const [studio] = await db.select().from(studios).where(eq(studios.id, id));
  const [decor] = await db.select().from(decors).where(and(eq(decors.id, decorId), eq(decors.studioId, id)));
  if (!studio || !decor) notFound();

  return (
    <>
      <PageHeader
        title={decor.name.az || "Yeni dekor"}
        crumbs={[
          { label: "Studiyalar", href: "/admin/studios" },
          { label: studio.name.az || "Studiya", href: `/admin/studios/${studio.id}` },
          { label: "Dekor" },
        ]}
        actions={
          studio.active &&
          decor.active && (
            <a href={`${href("studios", "az", studio.slugAz)}#${decor.slugAz}`} target="_blank" className={buttonClass("light")}>
              Saytda bax ↗
            </a>
          )
        }
      />
      <RecordEditor
        action={saveDecorAction}
        hidden={{ id: decor.id, studioId: studio.id }}
        fields={decorFields}
        initialData={withDefaults(decorFields, decorToEditor(decor))}
        slug={decor.slugAz}
        active={decor.active}
        aside={
          <Card accent={false}>
            <ConfirmButton formAction={deleteDecorAction} message="Bu dekor silinsin? Köhnə rezervasiyalarda adı qalacaq." className={buttonClass("danger", "w-full")}>
              <span>Dekoru sil</span>
            </ConfirmButton>
          </Card>
        }
      />
    </>
  );
}
