import { PencilSimple } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { href, type RouteKey } from "@/i18n/routes";
import { pageKeys, pageLayouts } from "@/sections/pages";
import { buttonClass, PageHeader, TableCard, td, th } from "../_components/cms";

export default function PagesIndex() {
  return (
    <>
      <PageHeader title="Səhifələr" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Səhifələr" }]} />
      <TableCard total={pageKeys.length}>
        <thead>
          <tr>
            <th className={th}>#</th>
            <th className={th}>Başlıq</th>
            <th className={th}>Sectionlar</th>
            <th className={th}>URL</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {pageKeys.map((key, i) => (
            <tr key={key}>
              <td className={td}>{i + 1}</td>
              <td className={td}>
                <Link href={`/admin/pages/${key}`} className="hover:text-cms-link">
                  {pageLayouts[key].label}
                </Link>
              </td>
              <td className={td}>{pageLayouts[key].slots.length}</td>
              <td className={td}>
                {key === "global" ? (
                  "Bütün səhifələr"
                ) : key === "decors" ? (
                  `${href("studios", "az")}/… (hər studiya)`
                ) : (
                  <a href={href(key as RouteKey, "az")} target="_blank" className="text-cms-link hover:underline">
                    {href(key as RouteKey, "az")}
                  </a>
                )}
              </td>
              <td className={td}>
                <Link href={`/admin/pages/${key}`} aria-label="Redaktə et" className={buttonClass("info", "px-3")}>
                  <PencilSimple size={16} weight="fill" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </>
  );
}
