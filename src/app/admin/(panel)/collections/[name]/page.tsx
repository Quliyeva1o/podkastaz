/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, desc, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { collectionItems, media } from "@/db/schema";
import { collections, isCollectionName } from "@/collections/registry";
import { mediaUrl } from "@/lib/media/url";
import { Button, buttonClass, inputClass, MoveButtons, PageHeader, TableCard, td, th } from "../../_components/cms";
import { AutoSwitch, ConfirmButton } from "../../_components/cms-client";
import { createItemAction, deleteItemAction, moveItemAction, togglePublishedAction } from "../actions";

const PER_PAGE = 20;

export default async function CollectionPage({ params, searchParams }: PageProps<"/admin/collections/[name]">) {
  const { name } = await params;
  if (!isCollectionName(name)) notFound();
  const def = collections[name];
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  // A select field (e.g. works "kind") is shown as its own column.
  const categoryField = def.fields.find((f) => f.kind === "select");
  const categoryLabel = (v: unknown) =>
    categoryField?.kind === "select" ? (categoryField.options.find((o) => o.value === v)?.label ?? "") : "";

  const where: SQL[] = [eq(collectionItems.collection, name)];
  if (q) where.push(ilike(sql`${collectionItems.data}->'title'->>'az'`, `%${q}%`));
  if (status === "active") where.push(eq(collectionItems.published, true));
  if (status === "inactive") where.push(eq(collectionItems.published, false));
  const condition = and(...where);

  const [{ total }] = await db.select({ total: count() }).from(collectionItems).where(condition);
  const rows = await db
    .select()
    .from(collectionItems)
    .where(condition)
    .orderBy(asc(collectionItems.position), desc(collectionItems.publishedAt))
    .limit(PER_PAGE)
    .offset((page - 1) * PER_PAGE);

  const coverIds = rows.map((r) => (r.data as { cover?: string }).cover).filter((id): id is string => Boolean(id));
  const covers = coverIds.length ? await db.select().from(media).where(inArray(media.id, coverIds)) : [];
  // Image covers: a WebP preview; video covers: the smallest rendition, played muted.
  const coverThumb = (id: unknown) => {
    const m = covers.find((c) => c.id === id);
    if (!m) return null;
    const video = m.mime.startsWith("video/");
    return { video, url: mediaUrl(m.variants.find((v) => v.format === (video ? "mp4" : "webp"))?.key ?? m.key) };
  };
  const pages = Math.ceil(total / PER_PAGE);
  const pageHref = (p: number) => `?${new URLSearchParams({ q, status, page: String(p) })}`;
  const dateFormat = new Intl.DateTimeFormat("az-AZ", { dateStyle: "short" });

  return (
    <>
      <PageHeader title={def.label} crumbs={[{ label: "Dashboard", href: "/admin" }, { label: def.label }]} />
      <TableCard
        total={total}
        from={total ? (page - 1) * PER_PAGE + 1 : 0}
        to={Math.min(page * PER_PAGE, total)}
        toolbar={
          <form action={createItemAction}>
            <input type="hidden" name="collection" value={name} />
            <Button>
              <Plus size={14} weight="bold" /> Əlavə et
            </Button>
          </form>
        }
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
            <th className={th} />
            <th className={th}>Şəkil</th>
            <th className={th}>Adı</th>
            <th className={th}>{categoryField ? categoryField.label : "Tarix"}</th>
            <th className={th}>Status</th>
            <th className={th} />
          </tr>
          <tr>
            <td className="px-7 pb-4" colSpan={3} />
            <td className="px-2 pb-4">
              <input form="filters" name="q" defaultValue={q} aria-label="Ada görə axtar" className={inputClass} />
            </td>
            <td className="px-2 pb-4" />
            <td className="px-2 pb-4">
              <select form="filters" name="status" defaultValue={status} aria-label="Status" className={inputClass}>
                <option value="">Seç</option>
                <option value="active">Aktiv</option>
                <option value="inactive">Deaktiv</option>
              </select>
            </td>
            <td className="px-2 pb-4">
              <form id="filters">
                <button className={buttonClass("primary")}>Axtar</button>
              </form>
            </td>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const data = r.data as { title?: { az?: string }; cover?: string; highlighted?: boolean; kind?: string };
            const thumb = coverThumb(data.cover);
            const editHref = `/admin/collections/${name}/${r.id}`;
            return (
              <tr key={r.id}>
                <td className={td}>{(page - 1) * PER_PAGE + i + 1}</td>
                <td className={td}>
                  <MoveButtons action={moveItemAction} hidden={{ collection: name, id: r.id }} />
                </td>
                <td className={td}>
                  <div className="h-12 w-20 overflow-hidden rounded-lg bg-cms-bg">{thumb &&
                    (thumb.video ? (
                      <video src={thumb.url} autoPlay muted loop playsInline preload="metadata" className="size-full object-cover" />
                    ) : (
                      <img src={thumb.url} alt="" width={80} height={48} className="size-full object-cover" />
                    ))}</div>
                </td>
                <td className={td}>
                  <Link href={editHref} className="hover:text-cms-link">
                    {data.title?.az || "(adsız)"}
                  </Link>
                  {data.highlighted && <span className="ml-2 rounded-full bg-highlight px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-white">Ən çox seçilən</span>}
                </td>
                <td className={td}>{categoryField ? categoryLabel(data[categoryField.name as "kind"]) : dateFormat.format(r.publishedAt)}</td>
                <td className={td}>
                  <AutoSwitch
                    action={togglePublishedAction}
                    hidden={{ collection: name, id: r.id }}
                    name="published"
                    checked={r.published}
                    label="Saytda dərc olunsun"
                  />
                </td>
                <td className={td}>
                  <div className="flex gap-1">
                    <Link href={editHref} aria-label="Redaktə et" className={buttonClass("info", "px-3")}>
                      <PencilSimple size={16} weight="fill" />
                    </Link>
                    <form action={deleteItemAction}>
                      <input type="hidden" name="collection" value={name} />
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton message={`“${data.title?.az ?? ""}” silinsin?`} className={buttonClass("danger", "px-3")}>
                        <Trash size={16} weight="fill" />
                        <span className="sr-only">Sil</span>
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className={td} colSpan={7}>
                Heç nə tapılmadı.
              </td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}
