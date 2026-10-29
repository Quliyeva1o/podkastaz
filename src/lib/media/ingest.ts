// Shared by the admin upload route and the Figma import script (no `server-only`
// so the script can import it; node:fs/sharp keep it out of client bundles anyway).
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import sharp from "sharp";
import { cacheTags, media, type MediaVariant } from "../../db/schema";
import type { Localized } from "../../i18n/config";
import { getObject, putObject } from "./storage";

/** Widths generated for every raster image; `<picture>` + `sizes` lets the browser pick one. */
const WIDTHS = [320, 640, 960, 1280, 1920, 2560];
export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml", "image/gif"];
export const ACCEPTED_VIDEOS = ["video/mp4", "video/webm", "video/quicktime"];
export const ACCEPTED = [...ACCEPTED_IMAGES, ...ACCEPTED_VIDEOS];

/** Video renditions: background loops need no sound; `+faststart` lets playback begin before the download ends. */
const VIDEO_WIDTHS = [1280, 1920];
const run = promisify(execFile);
/** Binaries from PATH, or full paths (shared hosting: a static ffmpeg build in ~/bin). */
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";
/**
 * Quality first: the site has only a few videos, so they are compressed lightly (CRF 22 looks
 * like the original). The bitrate ceiling only reins in extreme footage: ~4 Mbit/s at 1280, ~7 at 1920.
 */
const CRF = "22";
/** Bitrate ceiling (kbit/s) by the frame's long side, so a portrait 1080×1920 clip counts as full HD. */
const limitFor = (longSide: number) => (longSide > 1280 ? 7000 : 4000);
/** Never above what the source itself uses at that size, so a rendition is never heavier than the original. */
const cap = (w: number, sourceKbps: number | undefined, sourceWidth: number, sourceLongSide: number) => {
  const scale = w / sourceWidth;
  const limit = limitFor(sourceLongSide * scale);
  const kbps = sourceKbps ? Math.min(limit, Math.round(sourceKbps * scale ** 2)) : limit;
  return ["-maxrate", `${kbps}k`, "-bufsize", `${kbps * 2}k`];
};
type Source = { kbps: number | undefined; width: number; longSide: number };
const encode = (input: string, out: string, width: number, scale: boolean, source: Source) =>
  run(
    FFMPEG,
    // -threads 2: shared hosting counts every thread against its process limit (x264 would start ~32).
    ["-v", "error", "-y", "-i", input, "-an", ...(scale ? ["-vf", `scale=${width}:-2`] : []), "-threads", "2", "-c:v", "libx264", "-preset", "slow", "-crf", CRF, ...cap(width, source.kbps, source.width, source.longSide), "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
    { maxBuffer: 1024 * 1024 * 64 },
  );
/** Same pictures, no re-encode: drops the audio and moves the index to the front so playback starts at once. */
const remux = (input: string, out: string) =>
  run(FFMPEG, ["-v", "error", "-y", "-i", input, "-an", "-c:v", "copy", "-movflags", "+faststart", out], { maxBuffer: 1024 * 1024 * 64 });

export class UploadError extends Error {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PostgresJsDatabase<any>;

type Input = {
  buffer: Buffer;
  mime: string;
  alt?: Localized;
  /** Stable origin id (e.g. Figma image ref) — re-importing the same source returns the existing row. */
  source?: string;
  /** Original file name of an admin upload, kept for searching the library. */
  fileName?: string;
  /** Videos: store the original now and encode the renditions in the background (admin uploads). */
  encodeLater?: boolean;
};

const emptyAlt = (): Localized => ({ az: "" });

/**
 * Stores an image: the original, AVIF + WebP variants at each width up to the
 * original width, and a ~20px blurred placeholder inlined as a data URL.
 */
export async function ingestBuffer(db: Db, { buffer, mime, alt, source, fileName, encodeLater }: Input) {
  if (!ACCEPTED.includes(mime)) throw new UploadError("Bu fayl tipi dəstəklənmir");
  if (ACCEPTED_VIDEOS.includes(mime)) return ingestVideo(db, { buffer, mime, alt, source, fileName, encodeLater });
  if (buffer.length > MAX_BYTES) throw new UploadError("Fayl 20 MB-dan böyükdür");

  if (source) {
    const [existing] = await db.select().from(media).where(eq(media.source, source)).limit(1);
    if (existing) return existing;
  }

  const id = randomUUID();
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}`;

  if (mime === "image/svg+xml") {
    const svg = buffer.toString("utf8");
    if (/<script|\son\w+\s*=|javascript:/i.test(svg)) throw new UploadError("SVG faylında skript var");
    const key = `${dir}/original.svg`;
    await putObject(key, buffer);
    const meta = await sharp(buffer).metadata().catch(() => null);
    const [row] = await db
      .insert(media)
      .values({ id, key, mime, width: meta?.width, height: meta?.height, alt: alt ?? emptyAlt(), source, fileName })
      .returning();
    return row;
  }

  const image = sharp(buffer, { animated: false }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height) throw new UploadError("Şəkil oxunmadı");

  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const originalKey = `${dir}/original.${ext}`;
  await putObject(originalKey, buffer);

  const widths = WIDTHS.filter((w) => w < meta.width!).concat(meta.width);
  const variants: MediaVariant[] = [];
  await Promise.all(
    widths.flatMap((width) =>
      (["avif", "webp"] as const).map(async (format) => {
        const resized = image.clone().resize({ width, withoutEnlargement: true });
        const out =
          format === "avif"
            ? await resized.avif({ quality: 55, effort: 4 }).toBuffer()
            : await resized.webp({ quality: 75 }).toBuffer();
        const key = `${dir}/${width}.${format}`;
        await putObject(key, out);
        variants.push({ width, format, key });
      }),
    ),
  );
  variants.sort((a, b) => a.width - b.width || a.format.localeCompare(b.format));

  const blur = await image.clone().resize(20).webp({ quality: 40 }).toBuffer();

  const [row] = await db
    .insert(media)
    .values({
      id,
      key: originalKey,
      mime,
      width: meta.width,
      height: meta.height,
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
      alt: alt ?? emptyAlt(),
      variants,
      source,
      fileName,
    })
    .returning();
  return row;
}

/**
 * Stores a video. With ffmpeg on PATH (local machine, Docker image) it is re-encoded to
 * H.264 MP4 at 1280 and 1920 px wide (never upscaled), without audio, and a blurred first
 * frame becomes the placeholder. Without ffmpeg the upload is stored as is.
 */
async function ingestVideo(db: Db, { buffer, mime, alt, source, fileName, encodeLater }: Input) {
  if (buffer.length > MAX_VIDEO_BYTES) throw new UploadError("Video 200 MB-dan böyükdür");
  if (source) {
    const [existing] = await db.select().from(media).where(eq(media.source, source)).limit(1);
    if (existing) return existing;
  }

  const id = randomUUID();
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}`;
  const ext = mime === "video/webm" ? "webm" : mime === "video/quicktime" ? "mov" : "mp4";
  const originalKey = `${dir}/original.${ext}`;
  await putObject(originalKey, buffer);

  if (encodeLater) {
    // Encoding takes minutes on a small server; the upload request must not wait for it.
    // Until the renditions exist the original is served; then the site switches over by itself.
    const [row] = await db
      .insert(media)
      .values({ id, key: originalKey, mime, alt: alt ?? emptyAlt(), variants: [], source, fileName })
      .returning();
    void encodeStoredVideo(db, row)
      .then((updated) => updated && expireTag(db, MEDIA_TAG))
      .catch((error) => console.error("video encoding failed", row.key, error));
    return row;
  }

  const { width, height, variants, blurDataUrl } = await encodeRenditions(buffer, ext, dir);

  const [row] = await db
    .insert(media)
    .values({ id, key: originalKey, mime, width, height, blurDataUrl, alt: alt ?? emptyAlt(), variants, source, fileName })
    .returning();
  return row;
}

/**
 * H.264 MP4 renditions (1280 and 1920 px wide, never upscaled, no audio) plus a blurred first
 * frame, stored next to the original in `dir`. Without ffmpeg it returns no renditions and the
 * original is served as is.
 */
async function encodeRenditions(buffer: Buffer, ext: string, dir: string) {
  const work = await mkdtemp(path.join(tmpdir(), "media-"));
  let width: number | undefined;
  let height: number | undefined;
  const variants: MediaVariant[] = [];
  let blurDataUrl: string | undefined;
  try {
    const input = path.join(work, `in.${ext}`);
    await writeFile(input, buffer);
    const probe = await run(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,bit_rate", "-of", "default=nw=1", input]);
    const info = Object.fromEntries(probe.stdout.trim().split(/\r?\n/).map((line) => line.split("=") as [string, string]));
    width = Number(info.width) || undefined;
    height = Number(info.height) || undefined;
    const sourceKbps = Number(info.bit_rate) ? Math.round(Number(info.bit_rate) / 1000) : undefined;
    const source: Source = { kbps: sourceKbps, width: width ?? 1280, longSide: Math.max(width ?? 0, height ?? 0) || 1280 };
    // Already web H.264 at a sensible bitrate: keep the original pictures (no quality loss, no growth).
    // A heavy file (e.g. a 13 Mbit/s phone clip) is always re-encoded.
    const reusable =
      info.codec_name === "h264" && (ext === "mp4" || ext === "mov") && sourceKbps !== undefined && sourceKbps <= limitFor(source.longSide);

    for (const w of VIDEO_WIDTHS.filter((w) => w <= (width ?? 0))) {
      const out = path.join(work, `${w}.mp4`);
      if (reusable && w === width) await remux(input, out);
      else await encode(input, out, w, true, source);
      const key = `${dir}/${w}.mp4`;
      await putObject(key, await readFile(out));
      variants.push({ width: w, format: "mp4", key });
    }
    if (variants.length === 0) {
      // Already small: one web-friendly copy at its own width.
      const out = path.join(work, "web.mp4");
      if (reusable) await remux(input, out);
      else await encode(input, out, width ?? 1280, false, source);
      const key = `${dir}/${width}.mp4`;
      await putObject(key, await readFile(out));
      variants.push({ width: width ?? 0, format: "mp4", key });
    }

    const frame = path.join(work, "frame.png");
    await run(FFMPEG, ["-v", "error", "-y", "-i", input, "-frames:v", "1", "-vf", "scale=40:-2", "-threads", "2", frame]);
    const blur = await sharp(await readFile(frame)).resize(20).webp({ quality: 40 }).toBuffer();
    blurDataUrl = `data:image/webp;base64,${blur.toString("base64")}`;
  } catch (error) {
    // ffmpeg missing (ENOENT) → keep the original only; any other failure is a real error.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
  return { width, height, variants, blurDataUrl };
}

/** Cache tag of media rows (same value as sections/pages.ts → mediaTag). */
export const MEDIA_TAG = "media";

/** Marks a cache tag expired for every app process (they poll cache_tags, see lib/cache/tag-sync.ts). */
export async function expireTag(db: Db, tag: string) {
  const now = Date.now();
  await db
    .insert(cacheTags)
    .values({ tag, expiredAt: now })
    .onConflictDoUpdate({ target: cacheTags.tag, set: { expiredAt: now } });
}

/**
 * Adds renditions to a video stored without them (uploaded where ffmpeg was missing).
 * The original file stays as it is. Returns the updated row, or null if ffmpeg is still missing.
 */
export async function encodeStoredVideo(db: Db, row: typeof media.$inferSelect) {
  const ext = path.extname(row.key).slice(1) || "mp4";
  const result = await encodeRenditions(await getObject(row.key), ext, path.posix.dirname(row.key));
  if (result.variants.length === 0) return null;
  const [updated] = await db
    .update(media)
    .set({ variants: result.variants, width: result.width ?? row.width, height: result.height ?? row.height, blurDataUrl: result.blurDataUrl ?? row.blurDataUrl })
    .where(eq(media.id, row.id))
    .returning();
  return updated;
}
