import { notFound } from "next/navigation";
import { getSectionForEdit } from "@/lib/content/admin";
import { isPageKey, pageLayouts } from "@/sections/pages";
import { withDefaults } from "@/sections/fields";
import { isSectionType, sections } from "@/sections/registry";
import { buttonClass, Card, PageHeader } from "../../../_components/cms";
import { SectionEditor } from "../../../_components/section-editor";
import { restoreVersionAction } from "../../actions";

const dateFormat = new Intl.DateTimeFormat("az-AZ", { dateStyle: "short", timeStyle: "short" });

export default async function EditSectionPage({ params }: PageProps<"/admin/pages/[key]/[slot]">) {
  const { key, slot } = await params;
  if (!isPageKey(key)) notFound();
  const section = await getSectionForEdit(key, slot);
  if (!section || !isSectionType(section.type)) notFound();
  const def = sections[section.type];

  return (
    <>
      <PageHeader
        title={def.label}
        crumbs={[
          { label: "Səhifələr", href: "/admin/pages" },
          { label: pageLayouts[key].label, href: `/admin/pages/${key}` },
          { label: def.label },
        ]}
      />
      <SectionEditor
        key={section.placementId}
        placementId={section.placementId}
        fields={def.fields}
        initialData={withDefaults(def.fields, section.data)}
        sharedWith={section.sharedWith}
        aside={
          <Card accent={false} title="Əvvəlki versiyalar">
            {section.versions.length === 0 && <p className="text-cms-muted">Hələ yoxdur.</p>}
            <ul className="flex flex-col">
              {section.versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 border-t border-cms-line py-2.5 first:border-t-0">
                  <span>
                    {dateFormat.format(v.createdAt)}
                    <span className="block text-[12px] text-cms-faint">{v.userEmail ?? "—"}</span>
                  </span>
                  {/* Inside the editor's form: posts its placementId to the restore action, with this version bound. */}
                  <button formAction={restoreVersionAction.bind(null, v.id)} className={buttonClass("light", "px-3 py-1.5 text-[13px]")}>
                    Qaytar
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        }
      />
    </>
  );
}
