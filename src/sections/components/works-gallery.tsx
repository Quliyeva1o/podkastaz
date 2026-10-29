import Link from "next/link";
import { Picture } from "@/components/picture";
import { PhotoGallery, VideoGallery } from "@/components/site/works-client";
import { cx } from "@/components/site/ui";
import { listPublished } from "@/collections/queries";
import type { WorkData } from "@/collections/registry";
import { href } from "@/i18n/routes";
import { getMediaItems, type MediaItem } from "@/lib/content/queries";
import { mediaUrl } from "@/lib/media/url";
import { youtubeId } from "@/lib/media/youtube";
import { tx } from "../helpers";
import type { SectionProps, WorksGalleryData } from "../types";

const largest = (m: MediaItem, format: "webp" | "mp4") =>
  mediaUrl(m.variants.filter((v) => v.format === format).sort((a, b) => b.width - a.width)[0]?.key ?? m.key);

/**
 * İşlərimiz (Figma "Şəkillər" / "Videolar"): the Şəkillər | Videolar switch (two URLs, so both
 * tabs can be shared and indexed), then the photo masonry or the video gallery.
 */
export async function WorksGallerySection({ data, lang, page }: SectionProps<WorksGalleryData> & { page?: string }) {
  const videosTab = page === "worksVideos";
  const items = (await listPublished<WorkData>("works")).filter((w) => w.data.kind === (videosTab ? "video" : "photo"));
  const media = await getMediaItems(items.map((w) => w.data.cover).filter((id): id is string => Boolean(id)));
  const labels = { play: tx(data.playLabel, lang), prev: tx(data.prevLabel, lang), next: tx(data.nextLabel, lang), close: tx(data.closeLabel, lang) };

  const tab = (active: boolean, route: "works" | "worksVideos", label: string) => (
    <Link
      href={href(route, lang)}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-11 flex-1 items-center justify-center rounded-full px-5 text-16 leading-[1.5] font-medium transition-colors desktop:w-40 desktop:flex-none",
        active ? "bg-white text-primary-600" : "text-neutral-600 hover:text-neutral-950",
      )}
    >
      {label}
    </Link>
  );

  return (
    <section data-section="worksGallery" className="container-page px-4 desktop:px-15">
      <nav aria-label={`${tx(data.photosLabel, lang)} / ${tx(data.videosLabel, lang)}`} className="mt-4 flex justify-center desktop:mt-5.25">
        <div className="flex w-full rounded-full bg-neutral-100 p-1 desktop:w-auto">
          {tab(!videosTab, "works", tx(data.photosLabel, lang))}
          {tab(videosTab, "worksVideos", tx(data.videosLabel, lang))}
        </div>
      </nav>

      <div className="pt-10 desktop:pt-15">
        {videosTab ? (
          <VideoGallery
            labels={labels}
            videos={items.map((w, i) => {
              const cover = media[w.data.cover ?? ""];
              const isVideo = cover?.mime.startsWith("video/");
              return {
                id: w.id,
                title: tx(w.data.title, lang),
                youtube: youtubeId(w.data.youtube),
                mp4: isVideo ? largest(cover, "mp4") : undefined,
                thumb: cover && !isVideo && (
                  // The first ones are the largest paint (mobile list, desktop carousel and its neighbours).
                  <Picture
                    media={cover}
                    lang={lang}
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    priority={i < 2 || i === items.length - 1}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                ),
              };
            })}
          />
        ) : (
          <PhotoGallery
            labels={labels}
            photos={items
              .filter((w) => media[w.data.cover ?? ""]?.mime.startsWith("image/"))
              .map((w, i) => {
                const cover = media[w.data.cover!];
                return {
                  id: w.id,
                  alt: tx(cover.alt, lang) || tx(w.data.title, lang),
                  full: largest(cover, "webp"),
                  thumb: (
                    <Picture
                      media={cover}
                      lang={lang}
                      sizes="(min-width: 1024px) 30vw, (min-width: 768px) 50vw, 100vw"
                      priority={i < 3}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ),
                };
              })}
          />
        )}
      </div>
    </section>
  );
}
