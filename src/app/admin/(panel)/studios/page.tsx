import { PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { db } from "@/db";
import { decors, studios } from "@/db/schema";
import { href } from "@/i18n/routes";
import { Button, buttonClass, MoveButtons, PageHeader, TableCard, td, th } from "../_components/cms";
import { AutoSwitch } from "../_components/cms-client";
import { loadThumbs, Thumb } from "../_components/thumb";
import { createStudioAction, moveStudioAction, toggleStudioAction } from "./actions";

export default async function StudiosPage() {
  const rows = await db.select().from(studios).orderBy(asc(studios.position), asc(studios.createdAt));
  const decorCounts = await db.select({ studioId: decors.studioId, n: count() }).from(decors).groupBy(decors.studioId);
  const thumbs = await loadThumbs(rows.map((r) => r.cover));

  return (
    <>
      <PageHeader title="Studiyalar" crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Studiyalar" }]} />
      <TableCard
        total={rows.length}
        toolbar={
          <form action={createStudioAction}>
            <Button>
              <Plus size={14} weight="bold" /> Studiya əlavə et
            </Button>
          </form>
        }
      >
        <thead>
          <tr>
            <th className={th}>#</th>
            <th className={th} />
            <th className={th}>Şəkil</th>
            <th className={th}>Adı</th>
            <th className={th}>Ünvan</th>
            <th className={th}>Dekorlar</th>
            <th className={th}>Saytda</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className={td}>{i + 1}</td>
              <td className={td}>
                <MoveButtons action={moveStudioAction} hidden={{ id: r.id }} />
              </td>
              <td className={td}>
                <Thumb thumb={thumbs.get(r.cover ?? "")} />
              </td>
              <td className={td}>
                <Link href={`/admin/studios/${r.id}`} className="hover:text-cms-link">
                  {r.name.az || "(adsız)"}
                </Link>
                {r.active && (
                  <a href={href("studios", "az", r.slugAz)} target="_blank" className="ml-2 text-[12px] text-cms-muted hover:underline">
                    ↗
                  </a>
                )}
              </td>
              <td className={td}>{r.address.az}</td>
              <td className={td}>{decorCounts.find((d) => d.studioId === r.id)?.n ?? 0}</td>
              <td className={td}>
                <AutoSwitch action={toggleStudioAction} hidden={{ id: r.id }} name="active" checked={r.active} label="Saytda göstərilsin" />
              </td>
              <td className={td}>
                <Link href={`/admin/studios/${r.id}`} aria-label="Redaktə et" className={buttonClass("info", "px-3")}>
                  <PencilSimple size={16} weight="fill" />
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className={td} colSpan={8}>
                Hələ studiya yoxdur.
              </td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}
