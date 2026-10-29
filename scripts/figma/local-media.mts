// Media library import of Figma images, shared by the seed scripts.
// Image fills are read from design/assets/figma/<imageRef>.<ext> (downloaded once, see
// design/figma-cache/download-fills.mts); a missing file is fetched from the Figma API
// (image-fills endpoint, not rate limited). Other files come from design/assets/.
import { readdir, readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { media } from "../../src/db/schema";
import type { Localized } from "../../src/i18n/config";
import { ingestBuffer } from "../../src/lib/media/ingest";
import { download, imageFillUrls, sniffImage } from "./api.mjs";

export type Source = { ref: string } | { file: string };

const ASSET_DIR = "design/assets";

const localFills = new Map(
  (await readdir(`${ASSET_DIR}/figma`).catch(() => [] as string[])).map((f) => [f.split(".")[0], `${ASSET_DIR}/figma/${f}`]),
);
let remote: Record<string, string> | null = null;

async function load(source: Source): Promise<Buffer> {
  if ("file" in source) return readFile(`${ASSET_DIR}/${source.file}`);
  const local = localFills.get(source.ref);
  if (local) return readFile(local);
  remote ??= await imageFillUrls();
  const url = remote[source.ref];
  if (!url) throw new Error(`No download URL for figma:${source.ref}`);
  return download(url);
}

const cache = new Map<string, string>();

/** Media id for a Figma image or asset file; imported once (deduplicated by source). */
export async function importMedia(db: PostgresJsDatabase, source: Source, alt?: Localized): Promise<string> {
  const key = "ref" in source ? `figma:${source.ref}` : `asset:${source.file}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const buffer = await load(source);
  const row = await ingestBuffer(db, { buffer, mime: sniffImage(buffer), alt, source: key });
  // Already imported earlier without alt text: add it (an alt typed in admin is kept).
  if (alt && !Object.values(row.alt ?? {}).some(Boolean)) await db.update(media).set({ alt }).where(eq(media.id, row.id));
  cache.set(key, row.id);
  console.log(`${row.id}  ${key}  ${row.width}x${row.height}`);
  return row.id;
}
