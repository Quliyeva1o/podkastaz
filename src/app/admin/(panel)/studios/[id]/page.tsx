import { PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bookingSettings, decors, studios } from "@/db/schema";
import { href } from "@/i18n/routes";
import { bookingRuleFields, studioFields, studioToEditor, weekdays } from "@/lib/studios/fields";
import { withDefaults } from "@/sections/fields";
import { buttonClass, Card, inputClass, labelClass, MoveButtons, PageHeader, td, th } from "../../_components/cms";
import { AutoSwitch, ConfirmButton } from "../../_components/cms-client";
import { RecordEditor } from "../../_components/record-editor";
import { loadThumbs, Thumb } from "../../_components/thumb";
import { createDecorAction, deleteStudioAction, moveDecorAction, saveStudioAction, toggleDecorAction } from "../actions";

export default async function EditStudioPage({ params, searchParams }: PageProps<"/admin/studios/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [studio] = await db.select().from(studios).where(eq(studios.id, id));
  if (!studio) notFound();
  const [rules] = await db.select().from(bookingSettings).where(eq(bookingSettings.studioId, id));
  const decorRows = await db.select().from(decors).where(eq(decors.studioId, id)).orderBy(asc(decors.position), asc(decors.createdAt));
  const thumbs = await loadThumbs(decorRows.map((d) => d.cover));
  const notice = (await searchParams).notice;

  return (
    <>
      <PageHeader
        title={studio.name.az || "Yeni studiya"}
        crumbs={[{ label: "Studiyalar", href: "/admin/studios" }, { label: "Studiya" }]}
        actions={
          studio.active && (
            <a href={href("studios", "az", studio.slugAz)} target="_blank" className={buttonClass("light")}>
              Dekorlar səhifəsi ↗
            </a>
          )
        }
      />
      {notice === "has-bookings" && (
        <p role="status" className="mb-6 rounded-2xl bg-white p-4 text-cms-danger">
          Bu studiyanın rezervasiyaları var, ona görə silinmədi — saytdan gizlədildi.
        </p>
      )}
      <RecordEditor
        action={saveStudioAction}
        hidden={{ id: studio.id }}
        fields={studioFields}
        initialData={withDefaults(studioFields, studioToEditor(studio))}
        slug={studio.slugAz}
        active={studio.active}
        side={
          <>
            <Card accent={false} title="İş saatları (Bakı vaxtı)">
              <div className="flex flex-col gap-3">
                {weekdays.map((day, i) => {
                  const h = studio.hours[i];
                  return (
                    <div key={day} className="grid grid-cols-[1fr_5.5rem_5.5rem] items-center gap-2">
                      <label className="flex items-center gap-2 text-[13px]">
                        <input type="checkbox" name={`hours.${i}.closed`} defaultChecked={h === null} className="size-4 accent-ink" />
                        <span>
                          {day}
                          <span className="block text-[11px] text-cms-muted">bağlı</span>
                        </span>
                      </label>
                      <input type="time" name={`hours.${i}.open`} defaultValue={h?.open ?? "10:00"} aria-label={`${day}: açılış`} className={inputClass} />
                      <input type="time" name={`hours.${i}.close`} defaultValue={h?.close === "24:00" ? "00:00" : (h?.close ?? "22:00")} aria-label={`${day}: bağlanış`} className={inputClass} />
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card accent={false} title="Rezervasiya qaydaları">
              <div className="grid grid-cols-2 gap-4">
                {bookingRuleFields.map((f) => (
                  <label key={f.name} className="block">
                    <span className={labelClass}>{f.label}</span>
                    <input
                      type="number"
                      name={`rules.${f.name}`}
                      min={f.min}
                      max={f.max}
                      defaultValue={rules?.[f.name] ?? ""}
                      required
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
            </Card>
          </>
        }
        aside={
          <Card accent={false}>
            <ConfirmButton formAction={deleteStudioAction} message="Studiya və onun bütün dekorları silinsin?" className={buttonClass("danger", "w-full")}>
              <span>Studiyanı sil</span>
            </ConfirmButton>
          </Card>
        }
      />

      <div className="mt-7">
        <Card accent={false} title={`Dekorlar (${decorRows.length})`}>
          <form action={createDecorAction} className="mb-4">
            <input type="hidden" name="studioId" value={studio.id} />
            <button className={buttonClass("primary")}>
              <Plus size={14} weight="bold" /> Dekor əlavə et
            </button>
          </form>
          <div className="-mx-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead>
                <tr>
                  <th className={th} />
                  <th className={th}>Örtük</th>
                  <th className={th}>Adı</th>
                  <th className={th}>Qalereya</th>
                  <th className={th}>Saytda</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {decorRows.map((d) => {
                  const edit = `/admin/studios/${studio.id}/decors/${d.id}`;
                  return (
                    <tr key={d.id}>
                      <td className={td}>
                        <MoveButtons action={moveDecorAction} hidden={{ id: d.id, studioId: studio.id }} />
                      </td>
                      <td className={td}>
                        <Thumb thumb={thumbs.get(d.cover ?? "")} />
                      </td>
                      <td className={td}>
                        <Link href={edit} className="hover:text-cms-link">
                          {d.name.az || "(adsız)"}
                        </Link>
                      </td>
                      <td className={td}>{d.gallery.length} şəkil</td>
                      <td className={td}>
                        <AutoSwitch action={toggleDecorAction} hidden={{ id: d.id }} name="active" checked={d.active} label="Saytda göstərilsin" />
                      </td>
                      <td className={td}>
                        <Link href={edit} aria-label="Redaktə et" className={buttonClass("info", "px-3")}>
                          <PencilSimple size={16} weight="fill" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {decorRows.length === 0 && (
                  <tr>
                    <td className={td} colSpan={6}>
                      Hələ dekor yoxdur.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
