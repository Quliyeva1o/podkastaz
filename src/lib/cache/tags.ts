import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { cacheTags } from "@/db/schema";

/**
 * Invalidates cache tags in this process (Next.js) and records them in the database, so
 * the other app processes and any process started later drop the same cached pages
 * (see ./tag-sync.ts). Use this instead of calling updateTag / revalidateTag directly.
 *
 * `mode: "action"` (server actions) expires at once, so the editor's next read is fresh;
 * `mode: "route"` (route handlers, where updateTag is not allowed) serves stale while refreshing.
 */
export async function invalidateTags(tags: Iterable<string>, mode: "action" | "route" = "action") {
  const list = [...new Set(tags)];
  if (list.length === 0) return;
  for (const tag of list) {
    if (mode === "action") updateTag(tag);
    else revalidateTag(tag, "max");
  }
  const now = Date.now();
  try {
    await db
      .insert(cacheTags)
      .values(list.map((tag) => ({ tag, expiredAt: now })))
      .onConflictDoUpdate({ target: cacheTags.tag, set: { expiredAt: sql`excluded.expired_at` } });
  } catch (error) {
    // The local invalidation already happened; other processes catch up on their next restart.
    console.error("cache tags: could not record invalidation", error);
  }
}
