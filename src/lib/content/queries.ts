import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { media, pages, pageSections, sectionContents, type MediaVariant, type PageSeo } from "@/db/schema";
import { mediaTag, pageTag, type PageKey } from "@/sections/pages";
import type { Localized } from "@/i18n/config";

export type RenderedSection = {
  slot: string;
  type: string;
  data: Record<string, unknown>;
};

export type PageContent = {
  seo: PageSeo | null;
  sections: RenderedSection[];
};

/**
 * Everything one page renders, in every language. Cached until an admin save
 * calls `updateTag(pageTag(key))`, so visitors never wait on the database.
 */
export async function getPageContent(key: PageKey): Promise<PageContent> {
  "use cache";
  cacheLife("max");
  cacheTag(pageTag(key));

  const [page] = await db.select().from(pages).where(eq(pages.key, key)).limit(1);
  if (!page) return { seo: null, sections: [] };

  const rows = await db
    .select({
      slot: pageSections.slot,
      visible: pageSections.visible,
      type: sectionContents.type,
      data: sectionContents.data,
    })
    .from(pageSections)
    .innerJoin(sectionContents, eq(sectionContents.id, pageSections.contentId))
    .where(eq(pageSections.pageId, page.id))
    .orderBy(asc(pageSections.position));

  return {
    seo: page.seo,
    sections: rows.filter((r) => r.visible).map(({ slot, type, data }) => ({ slot, type, data })),
  };
}

export type MediaItem = {
  id: string;
  key: string;
  mime: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  alt: Localized;
  variants: MediaVariant[];
};

/** Image metadata (size, blur placeholder, AVIF/WebP variants) for the given ids. */
export async function getMediaItems(ids: string[]): Promise<Record<string, MediaItem>> {
  "use cache";
  cacheLife("max");
  cacheTag(mediaTag);

  if (ids.length === 0) return {};
  const rows = await db.select().from(media).where(inArray(media.id, [...new Set(ids)].sort()));
  return Object.fromEntries(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        key: r.key,
        mime: r.mime,
        width: r.width,
        height: r.height,
        blurDataUrl: r.blurDataUrl,
        alt: r.alt,
        variants: r.variants,
      },
    ]),
  );
}
