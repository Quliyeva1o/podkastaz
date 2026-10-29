"use client";

import { CaretLeft, CaretRight, X } from "@phosphor-icons/react/ssr";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./ui";
import type { Labels, Video } from "./works-client";

/** Full-screen viewer shared by photos and videos: Escape / arrows / close button. */
export function Viewer({
  labels,
  onClose,
  onPrev,
  onNext,
  children,
}: {
  labels: Labels;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, onPrev, onNext]);

  const round =
    "flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20";
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="menu-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 desktop:p-15"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full max-w-full items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
      <button
        type="button"
        autoFocus
        aria-label={labels.close}
        onClick={onClose}
        className={cx(round, "absolute top-4 right-4")}
      >
        <X aria-hidden className="size-6" />
      </button>
      {onPrev && (
        <button
          type="button"
          aria-label={labels.prev}
          onClick={(e) => (e.stopPropagation(), onPrev())}
          className={cx(round, "absolute top-1/2 left-4 -translate-y-1/2")}
        >
          <CaretLeft aria-hidden className="size-6" />
        </button>
      )}
      {onNext && (
        <button
          type="button"
          aria-label={labels.next}
          onClick={(e) => (e.stopPropagation(), onNext())}
          className={cx(round, "absolute top-1/2 right-4 -translate-y-1/2")}
        >
          <CaretRight aria-hidden className="size-6" />
        </button>
      )}
    </div>,
    document.body,
  );
}

export function VideoPlayer({ video }: { video: Video }) {
  if (video.youtube) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.youtube}?autoplay=1&rel=0`}
        title={video.title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        className="aspect-video w-[min(90vw,70rem)] rounded-[0.625rem]"
      />
    );
  }
  return (
    <video
      src={video.mp4}
      controls
      autoPlay
      playsInline
      className="max-h-[calc(100dvh-8rem)] max-w-full rounded-[0.625rem]"
    />
  );
}
