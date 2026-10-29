/* eslint-disable @next/next/no-img-element -- variants are pre-generated at upload, so next/image's optimizer would only add work */
import type { Locale } from "@/i18n/config";
import type { MediaItem } from "@/lib/content/queries";
import { mediaUrl } from "@/lib/media/url";

type Props = {
  media: MediaItem | undefined;
  lang: Locale;
  /** Rendered width hint, e.g. "(min-width: 1440px) 433px, 100vw". Required for correct variant choice. */
  sizes: string;
  className?: string;
  /** Above-the-fold images (hero): load immediately with high priority. */
  priority?: boolean;
  /** Overrides the media alt text; "" marks the image as decorative (its text is given elsewhere). */
  alt?: string;
};

/**
 * Responsive image: AVIF → WebP fallback, explicit width/height (no layout shift),
 * blurred placeholder while loading (opaque formats only), lazy by default.
 */
export function Picture({ media, lang, sizes, className, priority, alt: altOverride }: Props) {
  if (!media) return null;
  const alt = altOverride ?? (media.alt[lang] || media.alt.az || "");

  if (media.variants.length === 0) {
    return (
      <img
        src={mediaUrl(media.key)}
        alt={alt}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  const srcSet = (format: "avif" | "webp") =>
    media.variants
      .filter((v) => v.format === format)
      .map((v) => `${mediaUrl(v.key)} ${v.width}w`)
      .join(", ");
  const webp = media.variants.filter((v) => v.format === "webp");
  const fallback = webp[Math.min(2, webp.length - 1)];

  return (
    // display:contents → the <img> sizes against the wrapper, as if <picture> were not there.
    <picture className="contents">
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
      <img
        src={mediaUrl(fallback.key)}
        alt={alt}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        sizes={sizes}
        className={className}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        style={
          // Not behind PNG/GIF/SVG: their transparent areas would show it forever (a "shadow" round logos).
          media.blurDataUrl && !/png|gif|svg/.test(media.mime)
            ? { backgroundImage: `url(${media.blurDataUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      />
    </picture>
  );
}
