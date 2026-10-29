import "server-only";
import { db } from "@/db";
import { ingestBuffer } from "./ingest";

export { ACCEPTED, UploadError } from "./ingest";

/** Stores an image uploaded through the admin panel. */
export async function ingestImage(file: File) {
  return ingestBuffer(db, { buffer: Buffer.from(await file.arrayBuffer()), mime: file.type, fileName: file.name, encodeLater: true });
}
