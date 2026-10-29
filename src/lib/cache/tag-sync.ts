import { gt } from "drizzle-orm";
// Next.js keeps tag invalidation state in this module-level Map; both the page cache and
// the `'use cache'` handler consult it. It is loaded as an external module, so this is the
// same Map instance the server uses (verified against the production build).
import { tagsManifest } from "next/dist/server/lib/incremental-cache/tags-manifest.external";
import { db } from "@/db";
import { cacheTags } from "@/db/schema";

const INTERVAL_MS = 3_000;
let lastSeen = 0;

/** Applies invalidations recorded by any process (./tags.ts) to this process's tag state. */
async function sync() {
  const rows = await db
    .select({ tag: cacheTags.tag, expiredAt: cacheTags.expiredAt })
    .from(cacheTags)
    .where(gt(cacheTags.expiredAt, lastSeen));
  for (const { tag, expiredAt } of rows) {
    const entry = tagsManifest.get(tag) ?? {};
    if ((entry.expired ?? 0) < expiredAt) tagsManifest.set(tag, { ...entry, expired: expiredAt });
    if (expiredAt > lastSeen) lastSeen = expiredAt;
  }
}

/**
 * Started once per server process (instrumentation.ts). The first run replays every past
 * invalidation, so a process that starts after an admin edit never serves the old page:
 * cached entries older than their tag's last invalidation are regenerated on first request.
 */
export function startTagSync() {
  const run = () => sync().catch((error) => console.error("cache tags: sync failed", error));
  void run();
  setInterval(run, INTERVAL_MS).unref();
}
