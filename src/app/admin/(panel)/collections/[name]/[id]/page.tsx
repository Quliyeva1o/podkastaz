import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { collectionItems } from "@/db/schema";
import { collections, isCollectionName } from "@/collections/registry";
import { href } from "@/i18n/routes";
import { withDefaults } from "@/sections/fields";
import { buttonClass, Card, PageHeader } from "../../../_components/cms";
import { ConfirmButton } from "../../../_components/cms-client";
import { ItemEditor } from "../../../_components/item-editor";
import { deleteItemAction } from "../../actions";

export default async function EditItemPage({ params }: PageProps<"/admin/collections/[name]/[id]">) {
  const { name, id } = await params;
  if (!isCollectionName(name) || !z.uuid().safeParse(id).success) notFound();
  const [row] = await db
    .select()
    .from(collectionItems)
    .where(and(eq(collectionItems.id, id), eq(collectionItems.collection, name)));
  if (!row) notFound();
  const def = collections[name];
  const title = (row.data as { title?: { az?: string } }).title?.az || `Yeni ${def.itemLabel.toLowerCase()}`;

  return (
    <>
      <PageHeader
        title={title}
        crumbs={[{ label: def.label, href: `/admin/collections/${name}` }, { label: def.itemLabel }]}
        actions={
          row.published && (
            <a href={href(def.routes[0], "az")} target="_blank" className={buttonClass("light")}>
              Saytda bax ↗
            </a>
          )
        }
      />
      <ItemEditor
        key={row.id}
        collection={name}
        id={row.id}
        fields={def.fields}
        initialData={withDefaults(def.fields, row.data)}
        slugs={{ az: row.slugAz }}
        published={row.published}
        publishedAt={row.publishedAt.toISOString().slice(0, 10)}
        aside={
          <Card accent={false}>
            {/* Inside the editor form: formAction sends collection + id to the delete action. */}
            <ConfirmButton formAction={deleteItemAction} message={`Bu ${def.itemLabel.toLowerCase()} silinsin?`} className={buttonClass("danger", "w-full")}>
              <span>{def.itemLabel}i sil</span>
            </ConfirmButton>
          </Card>
        }
      />
    </>
  );
}
