/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { locales } from "@/i18n/config";
import { mediaUrl } from "@/lib/media/storage";
import { mediaUsage } from "@/lib/media/usage";
import { buttonClass, inputClass, PageHeader } from "../_components/cms";
import { MediaUpload } from "../_components/media-upload";
import { saveAltAction } from "./actions";
import { MediaDeleteButton } from "./delete-button";

export default async function MediaPage() {
  const rows = await db.select().from(media).orderBy(desc(media.createdAt)).limit(500);
  const usage = await mediaUsage(new Set(rows.map((r) => r.id)));

  return (
    <>
      <PageHeader
        title="Media kitabxanası"
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Media" }]}
        actions={<MediaUpload />}
      />
      <p className="-mt-3 mb-6 text-[13px] text-cms-muted">
        Şəkillər avtomatik AVIF/WebP-yə, videolar sayt üçün yüngül MP4-ə (1280 / 1920 px, səssiz) çevrilir. Alt mətn Google və ekran oxuyucular üçündür.
      </p>
      <ul className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {rows.map((m) => {
          const isVideo = m.mime.startsWith("video/");
          const thumb = (isVideo ? m.variants.find((v) => v.format === "mp4")?.key : m.variants.find((v) => v.format === "webp" && v.width >= 320)?.key) ?? m.key;
          const missingAlt = locales.some((l) => !m.alt[l]);
          const usedAt = usage.get(m.id)?.paths ?? [];
          return (
            <li key={m.id} className="relative flex flex-col overflow-hidden rounded-3xl bg-white">
              <MediaDeleteButton id={m.id} usage={usedAt} />
              {isVideo ? (
                <video src={mediaUrl(thumb)} muted loop playsInline controls preload="metadata" className="aspect-video w-full bg-ink object-contain" />
              ) : (
              <img src={mediaUrl(thumb)} alt="" loading="lazy" width={m.width ?? 320} height={m.height ?? 180} className="aspect-video w-full bg-[repeating-conic-gradient(#f2f2f2_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain" />
              )}
              <div className="flex flex-col gap-3 p-4">
                <p className="text-[12px] text-cms-faint">
                  {m.width}×{m.height} · {m.mime.replace(/^(image|video)\//, "")}
                  {isVideo && m.variants.length > 0 && ` · ${m.variants.map((v) => v.width).join(" / ")} px`}
                  {missingAlt && <span className="ml-2 text-cms-danger">alt mətn natamamdır</span>}
                </p>
                {usedAt.length ? (
                  <p className="truncate text-[12px] text-cms-muted" title={usedAt.join(" · ")}>
                    İstifadə olunur: {usedAt[0]}
                    {usedAt.length > 1 && ` (+${usedAt.length - 1})`}
                  </p>
                ) : (
                  <p className="text-[12px] text-cms-faint">Saytda istifadə olunmur</p>
                )}
                <form action={saveAltAction} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  {locales.map((l) => (
                    <label key={l} className="flex items-center gap-2">
                      <span className="w-7 text-[12px] font-medium text-cms-label">{l.toUpperCase()}</span>
                      <input name={`alt.${l}`} defaultValue={m.alt[l]} placeholder="Şəkildə nə var?" className={`${inputClass} py-1.5`} />
                    </label>
                  ))}
                  {/* Saves the alt text above (it does not delete or replace the file). */}
                  <button className={buttonClass("success", "self-end px-3 py-1.5 text-[13px]")}>Alt mətni yadda saxla</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
