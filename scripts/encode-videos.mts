// Adds web renditions (1280/1920 px MP4) to videos that were stored without them — uploaded
// while ffmpeg was missing. Videos that already have renditions (e.g. the hero video) are left
// alone, and every original stays on disk as it is. Re-runnable.
// Usage: npm run media:encode-videos              (needs ffmpeg: PATH or FFMPEG_PATH/FFPROBE_PATH)
//        npm run media:encode-videos -- <media id>  re-encode that video even if it has renditions
import { and, inArray, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { media } from "../src/db/schema";
import { encodeStoredVideo, expireTag, MEDIA_TAG } from "../src/lib/media/ingest";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

const ids = process.argv.slice(2);
const rows = await db
  .select()
  .from(media)
  .where(
    and(like(media.mime, "video/%"), ids.length ? inArray(media.id, ids) : sql`jsonb_array_length(${media.variants}) = 0`),
  );
console.log(`${rows.length} video(s) to encode`);

let done = 0;
for (const row of rows) {
  const started = Date.now();
  const updated = await encodeStoredVideo(db, row);
  if (!updated) {
    console.error("ffmpeg not found — set FFMPEG_PATH and FFPROBE_PATH (see deploy/cpanel/README.md)");
    break;
  }
  done++;
  console.log(`✓ ${row.key} → ${updated.variants.map((v) => v.width).join(", ")} px (${Math.round((Date.now() - started) / 1000)} s)`);
}
if (done) await expireTag(db, MEDIA_TAG);
await client.end();
