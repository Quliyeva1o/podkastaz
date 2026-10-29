import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { decors, studios } from "@/db/schema";

/** Cache tag for every read of studios and decors (site pages, booking form). */
export const studiosTag = "studios";

export type Studio = typeof studios.$inferSelect;
export type Decor = typeof decors.$inferSelect;

/** Active studios in admin order. Cached until a studio or decor is edited. */
export async function listStudios(): Promise<Studio[]> {
  "use cache";
  cacheLife("max");
  cacheTag(studiosTag);
  return db.select().from(studios).where(eq(studios.active, true)).orderBy(asc(studios.position));
}

export async function getStudioBySlug(slug: string): Promise<{ studio: Studio; decors: Decor[] } | null> {
  "use cache";
  cacheLife("max");
  cacheTag(studiosTag);
  const [studio] = await db
    .select()
    .from(studios)
    .where(and(eq(studios.slugAz, slug), eq(studios.active, true)))
    .limit(1);
  if (!studio) return null;
  const list = await db
    .select()
    .from(decors)
    .where(and(eq(decors.studioId, studio.id), eq(decors.active, true)))
    .orderBy(asc(decors.position));
  return { studio, decors: list };
}
