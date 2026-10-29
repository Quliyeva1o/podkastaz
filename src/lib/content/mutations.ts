import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pages, pageSections, sectionContents, sectionVersions } from "@/db/schema";
import { isPageKey, type PageKey } from "@/sections/pages";

type SaveInput = {
  placementId: string;
  data: Record<string, unknown>;
  /** Other placements of the same content that should receive this edit too (the checked boxes). */
  applyTo: string[];
  userId: string;
};

/**
 * Saves a section edit.
 * - Checked pages keep sharing the content row and get the new data.
 * - Unchecked pages are detached: they keep the old data in a new, independent copy.
 * Returns the page keys whose cache must be refreshed.
 */
export async function saveSection({ placementId, data, applyTo, userId }: SaveInput): Promise<PageKey[]> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ contentId: pageSections.contentId })
      .from(pageSections)
      .where(eq(pageSections.id, placementId))
      .for("update");
    if (!current) throw new Error("Section not found");

    const [content] = await tx
      .select()
      .from(sectionContents)
      .where(eq(sectionContents.id, current.contentId))
      .for("update");

    const siblings = await tx
      .select({ id: pageSections.id, pageKey: pages.key })
      .from(pageSections)
      .innerJoin(pages, eq(pages.id, pageSections.pageId))
      .where(eq(pageSections.contentId, content.id));

    const keep = new Set([placementId, ...applyTo]);
    const detach = siblings.filter((s) => !keep.has(s.id));

    if (detach.length > 0) {
      const [copy] = await tx
        .insert(sectionContents)
        .values({ type: content.type, data: content.data })
        .returning({ id: sectionContents.id });
      await tx
        .update(pageSections)
        .set({ contentId: copy.id })
        .where(inArray(pageSections.id, detach.map((d) => d.id)));
    }

    await tx.insert(sectionVersions).values({ contentId: content.id, data: content.data, userId });
    await tx.update(sectionContents).set({ data }).where(eq(sectionContents.id, content.id));

    // Detached pages show the same (old) data as before, so only the edited group changes.
    return siblings.filter((s) => keep.has(s.id)).map((s) => s.pageKey).filter(isPageKey);
  });
}

/** Rolls a section back to a saved version (applies to every page sharing it). */
export async function restoreVersion(placementId: string, versionId: string, userId: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ contentId: pageSections.contentId })
      .from(pageSections)
      .where(eq(pageSections.id, placementId));
    if (!row) throw new Error("Section not found");

    const [version] = await tx
      .select()
      .from(sectionVersions)
      .where(and(eq(sectionVersions.id, versionId), eq(sectionVersions.contentId, row.contentId)));
    if (!version) throw new Error("Version not found");

    const [content] = await tx
      .select()
      .from(sectionContents)
      .where(eq(sectionContents.id, row.contentId))
      .for("update");
    await tx.insert(sectionVersions).values({ contentId: content.id, data: content.data, userId });
    await tx.update(sectionContents).set({ data: version.data }).where(eq(sectionContents.id, content.id));

    return pageKeysForContent(tx, content.id);
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function pageKeysForContent(tx: Tx, contentId: string): Promise<PageKey[]> {
  const rows = await tx
    .select({ key: pages.key })
    .from(pageSections)
    .innerJoin(pages, eq(pages.id, pageSections.pageId))
    .where(eq(pageSections.contentId, contentId));
  return rows.map((r) => r.key).filter(isPageKey);
}

export async function setSectionVisible(placementId: string, visible: boolean) {
  const [row] = await db
    .update(pageSections)
    .set({ visible })
    .where(eq(pageSections.id, placementId))
    .returning({ pageId: pageSections.pageId });
  return row ? pageKeyById(row.pageId) : null;
}

/** Moves a section one step up or down on its page. */
export async function moveSection(placementId: string, direction: -1 | 1) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(pageSections).where(eq(pageSections.id, placementId));
    if (!row) return null;
    const all = await tx
      .select()
      .from(pageSections)
      .where(eq(pageSections.pageId, row.pageId))
      .orderBy(pageSections.position);
    const i = all.findIndex((r) => r.id === placementId);
    const j = i + direction;
    if (j < 0 || j >= all.length) return pageKeyById(row.pageId);
    await tx.update(pageSections).set({ position: all[j].position }).where(eq(pageSections.id, all[i].id));
    await tx.update(pageSections).set({ position: all[i].position }).where(eq(pageSections.id, all[j].id));
    return pageKeyById(row.pageId);
  });
}

async function pageKeyById(pageId: string): Promise<PageKey | null> {
  const [p] = await db.select({ key: pages.key }).from(pages).where(eq(pages.id, pageId));
  return p && isPageKey(p.key) ? p.key : null;
}
