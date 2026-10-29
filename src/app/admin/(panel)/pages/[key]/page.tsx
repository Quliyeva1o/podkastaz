import { LinkSimple, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPageSections } from "@/lib/content/admin";
import { isPageKey, pageLayouts } from "@/sections/pages";
import { isSectionType, sections } from "@/sections/registry";
import { buttonClass, MoveButtons, PageHeader, TableCard, td, th } from "../../_components/cms";
import { AutoSwitch } from "../../_components/cms-client";
import { SeoForm } from "../../_components/seo-form";
import { moveSectionAction, toggleVisibleAction } from "../actions";

export default async function AdminPage({ params }: PageProps<"/admin/pages/[key]">) {
  const { key } = await params;
  if (!isPageKey(key)) notFound();
  const result = await listPageSections(key);
  if (!result) notFound();

  return (
    <>
      <PageHeader
        title={pageLayouts[key].label}
        crumbs={[{ label: "Səhifələr", href: "/admin/pages" }, { label: pageLayouts[key].label }]}
      />
      <div className="flex flex-col gap-7">
        <TableCard total={result.sections.length}>
          <thead>
            <tr>
              <th className={th}>#</th>
              <th className={th} />
              <th className={th}>Section</th>
              <th className={th}>Paylaşılır</th>
              <th className={th}>Status</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {result.sections.map((s, i) => (
              <tr key={s.id} className={s.visible ? "" : "text-cms-faint"}>
                <td className={td}>{i + 1}</td>
                <td className={td}>
                  <MoveButtons action={moveSectionAction} hidden={{ placementId: s.id }} />
                </td>
                <td className={td}>
                  <Link href={`/admin/pages/${key}/${s.slot}`} className="hover:text-cms-link">
                    {isSectionType(s.type) ? sections[s.type].label : s.type}
                  </Link>
                </td>
                <td className={td}>
                  {s.sharedWith.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-cms-link">
                      <LinkSimple size={14} />
                      {s.sharedWith.map((p) => p.pageLabel).join(", ")}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={td}>
                  <AutoSwitch
                    action={toggleVisibleAction}
                    hidden={{ placementId: s.id }}
                    name="visible"
                    checked={s.visible}
                    label="Saytda göstər"
                  />
                </td>
                <td className={td}>
                  <Link href={`/admin/pages/${key}/${s.slot}`} aria-label="Redaktə et" className={buttonClass("info", "px-3")}>
                    <PencilSimple size={16} weight="fill" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>

        {key !== "global" && key !== "decors" && <SeoForm pageKey={key} seo={result.page.seo} />}
      </div>
    </>
  );
}
