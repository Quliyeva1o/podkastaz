import { mkdir, open, readFile, rm, stat, writeFile, type FileHandle } from "node:fs/promises";
import path from "node:path";

/**
 * Local-disk object storage. On the VPS this directory is a Docker volume and
 * Cloudflare caches `/media/*` at the edge, so files are read from disk rarely.
 */
const root = path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? "uploads");

function resolveKey(key: string) {
  const full = path.resolve(/* turbopackIgnore: true */ root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid media key");
  return full;
}

export async function putObject(key: string, body: Buffer) {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

/**
 * Deletes a stored file together with its renditions: every upload lives in its own
 * "YYYY/MM/<uuid>/" folder (original, AVIF/WebP widths or MP4 renditions).
 */
export async function removeObjectFolder(key: string) {
  const folder = path.posix.dirname(key);
  // Only ever a single upload folder, never a month or the storage root.
  if (!/^\d{4}\/\d{2}\/[0-9a-f-]{36}$/.test(folder)) throw new Error(`Unexpected media folder: ${folder}`);
  const full = path.resolve(/* turbopackIgnore: true */ root, folder);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid media key");
  await rm(full, { recursive: true, force: true });
}

export async function getObject(key: string) {
  return readFile(resolveKey(key));
}

/** Size + a byte-range stream of a stored file (videos are served in ranges). */
export async function statObject(key: string) {
  return (await stat(resolveKey(key))).size;
}
/**
 * A byte range of a stored file as a web stream, read only as fast as the client takes it.
 * (Readable.toWeb over fs streams throws "Controller is already closed" as an uncaught
 * exception whenever the browser cancels a video request — which it does all the time.)
 */
export function streamObject(key: string, start: number, end: number): ReadableStream<Uint8Array> {
  const file = resolveKey(key);
  const chunk = 256 * 1024;
  let handle: FileHandle | undefined;
  let position = start;
  return new ReadableStream<Uint8Array>({
    type: "bytes",
    async pull(controller) {
      handle ??= await open(file, "r");
      const length = Math.min(chunk, end - position + 1);
      if (length <= 0) {
        await handle.close();
        controller.close();
        return;
      }
      const buffer = new Uint8Array(length);
      const { bytesRead } = await handle.read(buffer, 0, length, position);
      position += bytesRead;
      if (bytesRead === 0) {
        await handle.close();
        controller.close();
        return;
      }
      controller.enqueue(buffer.subarray(0, bytesRead));
    },
    async cancel() {
      await handle?.close();
    },
  });
}

export { mediaUrl } from "./url";
