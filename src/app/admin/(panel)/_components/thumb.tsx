/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { mediaUrl } from "@/lib/media/url";

export type ThumbInfo = { video: boolean; url: string };

/** Small previews for list rows: a WebP rendition for images, the smallest mp4 for videos. */
export async function loadThumbs(ids: (string | null | undefined)[]): Promise<Map<string, ThumbInfo>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const rows = wanted.length ? await db.select().from(media).where(inArray(media.id, wanted)) : [];
  return new Map(
    rows.map((m) => {
      const video = m.mime.startsWith("video/");
      const variant = m.variants.filter((v) => v.format === (video ? "mp4" : "webp")).sort((a, b) => a.width - b.width)[0];
      return [m.id, { video, url: mediaUrl(variant?.key ?? m.key) }];
    }),
  );
}

export function Thumb({ thumb }: { thumb?: ThumbInfo }) {
  return (
    <div className="h-12 w-20 overflow-hidden rounded-lg bg-cms-bg">
      {thumb &&
        (thumb.video ? (
          <video src={thumb.url} autoPlay muted loop playsInline preload="metadata" className="size-full object-cover" />
        ) : (
          <img src={thumb.url} alt="" width={80} height={48} className="size-full object-cover" />
        ))}
    </div>
  );
}
