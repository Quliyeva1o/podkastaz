import "server-only";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { pages, pageSections, sectionContents, sectionVersions, users } from "@/db/schema";
import { isPageKey, pageLayouts, type PageKey } from "@/sections/pages";

/** Admin reads always hit the database directly (never cached). */

export async function listPageSections(key: PageKey) {
  const [page] = await db.select().from(pages).where(eq(pages.key, key)).limit(1);
  if (!page) return null;

  const rows = await db
    .select({
      id: pageSections.id,
      slot: pageSections.slot,
      position: pageSections.position,
      visible: pageSections.visible,
      contentId: pageSections.contentId,
      type: sectionContents.type,
    })
    .from(pageSections)
    .innerJoin(sectionContents, eq(sectionContents.id, pageSections.contentId))
    .where(eq(pageSections.pageId, page.id))
    .orderBy(asc(pageSections.position));

  const shared = await sharedPlacements(rows.map((r) => r.contentId), page.id);
  return {
    page,
    sections: rows.map((r) => ({ ...r, sharedWith: shared.get(r.contentId) ?? [] })),
  };
}

export type SharedPlacement = { placementId: string; pageKey: PageKey; pageLabel: string; slot: string };

/** For each content id: the placements of it on *other* pages. */
async function sharedPlacements(contentIds: string[], excludePageId: string) {
  const map = new Map<string, SharedPlacement[]>();
  if (contentIds.length === 0) return map;

  const rows = await db
    .select({
      placementId: pageSections.id,
      contentId: pageSections.contentId,
      slot: pageSections.slot,
      pageKey: pages.key,
    })
    .from(pageSections)
    .innerJoin(pages, eq(pages.id, pageSections.pageId))
    .where(and(inArray(pageSections.contentId, contentIds), ne(pageSections.pageId, excludePageId)));

  for (const r of rows) {
    if (!isPageKey(r.pageKey)) continue;
    const list = map.get(r.contentId) ?? [];
    list.push({
      placementId: r.placementId,
      pageKey: r.pageKey,
      pageLabel: pageLayouts[r.pageKey].label,
      slot: r.slot,
    });
    map.set(r.contentId, list);
  }
  return map;
}

export async function getSectionForEdit(key: PageKey, slot: string) {
  const [row] = await db
    .select({
      placementId: pageSections.id,
      pageId: pages.id,
      slot: pageSections.slot,
      visible: pageSections.visible,
      contentId: sectionContents.id,
      type: sectionContents.type,
      data: sectionContents.data,
      updatedAt: sectionContents.updatedAt,
    })
    .from(pageSections)
    .innerJoin(pages, eq(pages.id, pageSections.pageId))
    .innerJoin(sectionContents, eq(sectionContents.id, pageSections.contentId))
    .where(and(eq(pages.key, key), eq(pageSections.slot, slot)))
    .limit(1);
  if (!row) return null;

  const shared = await sharedPlacements([row.contentId], row.pageId);
  const versions = await db
    .select({
      id: sectionVersions.id,
      createdAt: sectionVersions.createdAt,
      userEmail: users.email,
    })
    .from(sectionVersions)
    .leftJoin(users, eq(users.id, sectionVersions.userId))
    .where(eq(sectionVersions.contentId, row.contentId))
    .orderBy(desc(sectionVersions.createdAt))
    .limit(20);

  return { ...row, sharedWith: shared.get(row.contentId) ?? [], versions };
}
