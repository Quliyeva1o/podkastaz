import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { collectionItems, decors, pages, pageSections, sectionContents, studios } from "@/db/schema";
import { collections } from "@/collections/registry";
import { pageLayouts, type PageKey } from "@/sections/pages";
import { isSectionType, sections } from "@/sections/registry";

/**
 * Where each media file is used, as readable paths for the admin library search:
 *   "Ümumi › Header", "Tərəfdaşlar › Starbucks",
 *   "Paketlər › PRO", "Dekorlar › Studiya 1 › Həkimlər üçün dekor".
 * Built by walking every section's, collection item's, studio's and decor's data for media ids.
 */
export async function mediaUsage(ids: Set<string>): Promise<Map<string, { paths: string[]; keywords: string[] }>> {
  const usage = new Map<string, { paths: Set<string>; keywords: Set<string> }>();
  const add = (id: string, path: string[], keywords: string[]) => {
    if (!usage.has(id)) usage.set(id, { paths: new Set(), keywords: new Set() });
    const entry = usage.get(id)!;
    entry.paths.add(path.join(" › "));
    for (const k of keywords) entry.keywords.add(k);
  };

  const placed = await db
    .select({ page: pages.key, type: sectionContents.type, data: sectionContents.data })
    .from(pageSections)
    .innerJoin(pages, eq(pageSections.pageId, pages.id))
    .innerJoin(sectionContents, eq(pageSections.contentId, sectionContents.id));
  for (const row of placed) {
    const page = pageLayouts[row.page as PageKey]?.label ?? row.page;
    const section = isSectionType(row.type) ? sections[row.type].label : row.type;
    walk(row.data, [page, section], [], ids, add);
  }

  // Share images set in a page's SEO tab.
  for (const row of await db.select({ key: pages.key, seo: pages.seo }).from(pages)) {
    const page = pageLayouts[row.key as PageKey]?.label ?? row.key;
    walk(row.seo, [page, "SEO paylaşım şəkli"], [], ids, add);
  }

  const items = await db
    .select({ collection: collectionItems.collection, data: collectionItems.data })
    .from(collectionItems);
  for (const row of items) {
    const label = collections[row.collection as keyof typeof collections]?.label ?? row.collection;
    walk(row.data, [label, ...names(row.data).shown], names(row.data).other, ids, add);
  }

  // Studios (cover) and decors (cover + gallery): own tables, not section data.
  const studioRows = await db.select({ id: studios.id, name: studios.name, cover: studios.cover }).from(studios);
  const studioName = new Map(studioRows.map((s) => [s.id, s.name.az]));
  for (const s of studioRows) walk({ cover: s.cover }, ["Studiyalar", s.name.az], [], ids, add);
  const decorRows = await db
    .select({ studioId: decors.studioId, name: decors.name, cover: decors.cover, gallery: decors.gallery })
    .from(decors);
  for (const d of decorRows) {
    walk({ cover: d.cover, gallery: d.gallery }, ["Dekorlar", studioName.get(d.studioId) ?? "", d.name.az], [], ids, add);
  }

  return new Map([...usage].map(([id, u]) => [id, { paths: [...u.paths], keywords: [...u.keywords] }]));
}

/** Keys whose text names the thing an image belongs to (a member, a partner, a post...). */
const NAME_KEYS = ["name", "title", "label", "author"];

/** A name in Azerbaijani for the visible path, plus its English/Russian versions as search keywords. */
function text(value: unknown): { shown: string; other: string[] } | null {
  if (typeof value === "string") return value.trim() ? { shown: value.trim(), other: [] } : null;
  if (value && typeof value === "object" && "az" in value) {
    const l = value as Record<string, unknown>;
    const pick = (k: string) => (typeof l[k] === "string" ? (l[k] as string).trim() : "");
    const shown = pick("az") || pick("en") || pick("ru");
    return shown ? { shown, other: [pick("en"), pick("ru")].filter((t) => t && t !== shown) } : null;
  }
  return null;
}

function names(obj: unknown): { shown: string[]; other: string[] } {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { shown: [], other: [] };
  const o = obj as Record<string, unknown>;
  const found = NAME_KEYS.map((k) => text(o[k])).filter((t) => t !== null).slice(0, 2);
  return { shown: found.map((t) => t.shown), other: found.flatMap((t) => t.other) };
}

function walk(
  node: unknown,
  path: string[],
  keywords: string[],
  ids: Set<string>,
  add: (id: string, path: string[], keywords: string[]) => void,
) {
  if (typeof node === "string") {
    if (ids.has(node)) add(node, path, keywords);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const n = names(child);
      walk(child, [...path, ...n.shown], [...keywords, ...n.other], ids, add);
    }
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) walk(value, path, keywords, ids, add);
  }
}
