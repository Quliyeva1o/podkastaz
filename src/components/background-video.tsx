"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/content/queries";
import { mediaUrl } from "@/lib/media/url";

/**
 * Muted looping background video laid over its poster image (rendered by the parent).
 * The poster stays the LCP element: the video is chosen by the rendered width, only loads when
 * it scrolls into view, pauses off-screen, and is skipped for reduced motion / data saver.
 */
export function BackgroundVideo({ media, className = "" }: { media: MediaItem; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saveData) return;

    const mp4 = media.variants.filter((v) => v.format === "mp4").sort((a, b) => a.width - b.width);
    // Sized by the box it fills (the About card is far narrower than the window).
    const needed = (video.getBoundingClientRect().width || window.innerWidth) * Math.min(window.devicePixelRatio || 1, 2);
    const pick = mp4.find((v) => v.width >= needed) ?? mp4.at(-1);
    const url = mediaUrl(pick?.key ?? media.key);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSrc(url);
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [media]);

  useEffect(() => {
    // The src is set after mount; start playback once it is attached.
    if (src) ref.current?.play().catch(() => {});
  }, [src]);

  return (
    <video
      ref={ref}
      src={src ?? undefined}
      muted
      loop
      playsInline
      autoPlay
      preload="none"
      aria-hidden
      tabIndex={-1}
      onPlaying={() => setPlaying(true)}
      className={`transition-opacity duration-700 ${playing ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}
