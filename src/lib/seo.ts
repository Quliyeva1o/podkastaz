import type { Metadata } from "next";
import { defaultLocale, htmlLang, locales, type Locale } from "@/i18n/config";
import { alternates, href, type RouteKey } from "@/i18n/routes";
import { getMediaItems, getPageContent, type MediaItem } from "@/lib/content/queries";
import { collectImageIds } from "@/sections/fields";
import { isSectionType, sections } from "@/sections/registry";
import { mediaUrl } from "@/lib/media/url";

/**
 * Metadata for a static page from its admin-edited SEO fields. Share image: the one chosen in
 * the SEO tab, else the first image of the page's sections (hero photo, about photo), else og.png.
 */
export async function staticPageMetadata(route: RouteKey, lang: Locale): Promise<Metadata> {
  const { seo, sections: list } = await getPageContent(route);
  const firstImage = list.flatMap((s) => (isSectionType(s.type) ? [...collectImageIds(sections[s.type].fields, s.data)] : []))[0];
  const id = seo?.ogImageId ?? firstImage;
  const cover = id ? (await getMediaItems([id]))[id] : undefined;
  return pageMetadata({
    route,
    lang,
    title: seo?.title[lang] || siteName,
    description: seo?.description[lang] || undefined,
    noindex: seo?.noindex,
    ogImage: coverUrl(cover),
  });
}

/** Metadata for an item page (a studio's decors page) (own slug per language, cover as OG image). */
export function itemMetadata(
  route: RouteKey,
  lang: Locale,
  item: { slugs: Record<Locale, string>; title: string; description?: string; cover?: MediaItem },
): Metadata {
  return pageMetadata({
    route,
    lang,
    // Brand suffix like the static pages ("Studiya 1 — dekorlar | Podkast.az").
    title: item.title.includes(siteName) ? item.title : `${item.title} | ${siteName}`,
    description: item.description && snippet(item.description),
    itemSlugs: item.slugs,
    ogImage: coverUrl(item.cover),
  });
}

/** Plain text cut at a word boundary to fit a meta description (≤155 characters). */
export function snippet(text: string, max = 155) {
  const plain = text.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, plain.lastIndexOf(" ", max - 1)).replace(/[\s,.;:—-]+$/, "") + "…";
}

/** Share-size (≥1200px WebP) URL of a cover image, for Open Graph and JSON-LD. */
export function coverUrl(cover: MediaItem | undefined) {
  // A video cover has no share image: pages then fall back to the branded og.png.
  if (!cover?.mime.startsWith("image/")) return undefined;
  const v = cover.variants.find((x) => x.format === "webp" && x.width >= 1200) ?? cover.variants.at(-1);
  return v ? mediaUrl(v.key) : undefined;
}

export const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Test/staging copy of the site (e.g. test.podkast.az): keep it out of search engines. */
export const siteNoindex = process.env.SITE_NOINDEX === "1";
export const siteName = "Podkast.az";

const ogLocale: Record<Locale, string> = { az: "az_AZ" };

type PageSeoInput = {
  route: RouteKey;
  lang: Locale;
  title: string;
  description?: string;
  itemSlugs?: Partial<Record<Locale, string>>;
  ogImage?: string;
  noindex?: boolean;
};

/**
 * Canonical URL, hreflang alternates (+ x-default) and Open Graph for one page.
 * Title/description come from the admin panel (page SEO tab) from Phase 2 on.
 */
export function pageMetadata(input: PageSeoInput): Metadata {
  const { route, lang, title, description, itemSlugs, ogImage, noindex } = input;
  const urls = alternates(route, itemSlugs);
  const canonical = href(route, lang, itemSlugs?.[lang]);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [htmlLang[l], urls[l]])),
        "x-default": urls[defaultLocale],
      },
    },
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      url: canonical,
      locale: ogLocale[lang],
      alternateLocale: locales.filter((l) => l !== lang).map((l) => ogLocale[l]),
      // Branded fallback (public/og.png, 1200×630) for pages without their own cover.
      images: [ogImage ? { url: ogImage } : { url: "/og.png", width: 1200, height: 630, alt: siteName }],
    },
    twitter: { card: "summary_large_image", title, description },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}
