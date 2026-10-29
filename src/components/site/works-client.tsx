"use client";

import { CaretLeft, CaretRight, Play } from "@phosphor-icons/react/ssr";
import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";
import { cx } from "./ui";

// The full-screen viewer is only downloaded when a photo or video is opened (PLAN.md §12.2).
const Viewer = dynamic(() => import("./works-viewer").then((m) => m.Viewer), { ssr: false });
const VideoPlayer = dynamic(() => import("./works-viewer").then((m) => m.VideoPlayer), { ssr: false });

export type Labels = {
  play: string;
  prev: string;
  next: string;
  close: string;
};
export type Photo = { id: string; thumb: ReactNode; full: string; alt: string };
export type Video = {
  id: string;
  thumb: ReactNode;
  title: string;
  youtube?: string;
  mp4?: string;
};

const wrap = (i: number, n: number) => (i + n) % n;

/**
 * Figma's photo box heights (420 px columns on desktop, 288 px list on mobile), in page order and
 * repeated: the masonry keeps the designed rhythm whatever photos are uploaded (each photo is
 * cropped to its box). The three desktop columns have equal sums, so the columns break as in Figma.
 */
const desktopHeights = [
  376, 423, 535.6, 376, 535.6, 376, 553.4, 373.6, 484, 268.8, 484, 458.5, 273.9,
  444.8, 560, 310.8, 560, 472.8,
];
const mobileHeights = [
  293.3, 232.3, 346.9, 313.3, 264.2, 205.6, 364.1, 256.4, 334.4, 268.8, 263.5,
  337.4, 203.9, 299.9, 324.9, 189.2, 365.8, 308.2,
];

/** Photo masonry (Figma: 3 columns × 420, gap 30, r10; one column on mobile) + lightbox on click. */
export function PhotoGallery({
  photos,
  labels,
}: {
  photos: Photo[];
  labels: Labels;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const prev = useCallback(
    () => setOpen((i) => (i === null ? i : wrap(i - 1, photos.length))),
    [photos.length],
  );
  const next = useCallback(
    () => setOpen((i) => (i === null ? i : wrap(i + 1, photos.length))),
    [photos.length],
  );
  return (
    <>
      <ul className="columns-1 gap-7.5 tablet:columns-2 desktop:columns-3">
        {photos.map((p, i) => (
          <li key={p.id} className="reveal mb-7.5 break-inside-avoid">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={p.alt}
              style={
                {
                  "--ar-m": `288 / ${mobileHeights[i % mobileHeights.length]}`,
                  "--ar-d": `420 / ${desktopHeights[i % desktopHeights.length]}`,
                } as React.CSSProperties
              }
              className="group/zoom relative block aspect-(--ar-m) w-full overflow-hidden rounded-[0.625rem] bg-silver desktop:aspect-(--ar-d)"
            >
              {p.thumb}
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <Viewer
          labels={labels}
          onClose={close}
          onPrev={photos.length > 1 ? prev : undefined}
          onNext={photos.length > 1 ? next : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated large rendition */}
          <img
            src={photos[open].full}
            alt={photos[open].alt}
            className="max-h-[calc(100dvh-8rem)] max-w-full rounded-[0.625rem] object-contain"
          />
        </Viewer>
      )}
    </>
  );
}

function PlayBadge({ size }: { size: "sm" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "pointer-events-none absolute top-1/2 left-1/2 flex -translate-1/2 items-center justify-center rounded-full bg-[#444]/10 text-white backdrop-blur-[1.4rem]",
        size === "lg" ? "size-15 desktop:backdrop-blur-[3.125rem]" : "size-8",
      )}
    >
      <Play
        weight="fill"
        className={size === "lg" ? "size-6" : "size-[0.7rem]"}
      />
    </span>
  );
}

/**
 * Videolar tab. Desktop (Figma "Frame 1410104251"): a carousel — the current video large in
 * the middle (640×432) with the neighbours smaller on both sides, faded into the page, orange
 * arrows at the edges. Mobile: the videos in one column (288×195). Play opens the video.
 */
export function VideoGallery({
  videos,
  labels,
}: {
  videos: Video[];
  labels: Labels;
}) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState<number | null>(null);
  const n = videos.length;
  const stop = useCallback(() => setPlaying(null), []);
  if (!n) return null;
  const playable = (v: Video) => Boolean(v.youtube || v.mp4);

  const tile = (v: Video, i: number, size: "sm" | "lg", className: string) => (
    <button
      type="button"
      onClick={() => (playable(v) ? setPlaying(i) : undefined)}
      aria-label={playable(v) ? `${labels.play}: ${v.title}` : v.title}
      className={cx(
        "relative block overflow-hidden bg-silver after:absolute after:inset-0 after:bg-black/20",
        className,
      )}
    >
      {v.thumb}
      {playable(v) && <PlayBadge size={size} />}
    </button>
  );

  const side = (offset: -1 | 1) => {
    const i = wrap(current + offset, n);
    return (
      <div
        key={`${offset}-${videos[i].id}`}
        // Figma: the left neighbour is 381.5 px wide, the right one 408.3 px, both 277.5 px high.
        className={cx(
          "works-side absolute top-[7.0625rem]",
          offset < 0
            ? "right-[calc(50%+22.0625rem)] w-[23.84rem]"
            : "left-[calc(50%+22.0625rem)] w-[25.52rem]",
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setCurrent(i)}
          className="relative block h-[17.34rem] w-full overflow-hidden rounded-[0.625rem] bg-silver"
        >
          {videos[i].thumb}
        </button>
      </div>
    );
  };

  const arrow =
    "flex size-7.5 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700";
  return (
    <>
      {/* Mobile and tablet: a plain list. */}
      <ul className="flex flex-col gap-[1.3125rem] desktop:hidden">
        {videos.map((v, i) => (
          <li key={v.id}>
            {tile(v, i, "sm", "aspect-[288/194.7] w-full rounded-[0.28rem]")}
          </li>
        ))}
      </ul>

      {/* Desktop carousel, full bleed. */}
      <div className="works-carousel relative -mx-15 hidden h-[27rem] overflow-hidden desktop:block">
        {n > 1 && side(-1)}
        <div
          key={videos[current].id}
          className="works-current absolute top-0 left-1/2 w-[40rem] -translate-x-1/2"
        >
          {tile(
            videos[current],
            current,
            "lg",
            "aspect-[640/432.6] w-full rounded-[0.625rem]",
          )}
        </div>
        {n > 1 && side(1)}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[15.9375rem] bg-linear-to-r from-white to-white/0"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-[15.9375rem] bg-linear-to-l from-white to-white/0"
        />
        {n > 1 && (
          <div className="absolute inset-x-15 top-[14.8rem] flex justify-between">
            <button
              type="button"
              aria-label={labels.prev}
              onClick={() => setCurrent((c) => wrap(c - 1, n))}
              className={arrow}
            >
              <CaretLeft aria-hidden weight="bold" className="size-[1.2rem]" />
            </button>
            <button
              type="button"
              aria-label={labels.next}
              onClick={() => setCurrent((c) => wrap(c + 1, n))}
              className={arrow}
            >
              <CaretRight aria-hidden weight="bold" className="size-[1.2rem]" />
            </button>
          </div>
        )}
      </div>

      {playing !== null && (
        <Viewer labels={labels} onClose={stop}>
          <VideoPlayer video={videos[playing]} />
        </Viewer>
      )}
    </>
  );
}
