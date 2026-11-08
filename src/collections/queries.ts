import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { collectionItems } from "@/db/schema";
import { collectionTag, type CollectionName } from "./registry";

export type Item<T> = {
  id: string;
  /** One slug for every language (only used in `?paket=`, never as a page URL). */
  slug: string;
  data: T;
  publishedAt: string;
};

const toItem = <T,>(r: typeof collectionItems.$inferSelect): Item<T> => ({
  id: r.id,
  slug: r.slugAz,
  data: r.data as T,
  publishedAt: r.publishedAt.toISOString(),
});

/** Published items in admin order. Cached until the collection is edited (`updateTag(collectionTag(name))`). */
export async function listPublished<T>(name: CollectionName): Promise<Item<T>[]> {
  "use cache";
  cacheLife("max");
  cacheTag(collectionTag(name));

  const rows = await db
    .select()
    .from(collectionItems)
    .where(and(eq(collectionItems.collection, name), eq(collectionItems.published, true)))
    .orderBy(asc(collectionItems.position), asc(collectionItems.createdAt));
  return rows.map((r) => toItem<T>(r));
}
