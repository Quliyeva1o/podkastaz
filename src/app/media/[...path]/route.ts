import path from "node:path";
import { getObject, statObject, streamObject } from "@/lib/media/storage";

const TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

const baseHeaders = (type: string) => ({
  "Content-Type": type,
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
});

/** Serves uploaded media. Keys contain a unique id, so responses are immutable and cached for a year. */
export async function GET(request: Request, { params }: RouteContext<"/media/[...path]">) {
  const key = (await params).path.join("/");
  const type = TYPES[path.extname(key).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  try {
    if (type.startsWith("video/")) return await serveVideo(request, key, type);
    const body = await getObject(key);
    return new Response(new Uint8Array(body), {
      headers: {
        ...baseHeaders(type),
        ...(type === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

/** Videos stream with HTTP Range support (Safari will not play a video without it). */
async function serveVideo(request: Request, key: string, type: string) {
  const size = await statObject(key);
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (!range) {
    const stream = streamObject(key, 0, size - 1);
    return new Response(stream, { headers: { ...baseHeaders(type), "Content-Length": String(size), "Accept-Ranges": "bytes" } });
  }
  let start = range[1] ? Number(range[1]) : size - Number(range[2]);
  let end = range[1] && range[2] ? Number(range[2]) : size - 1;
  start = Math.max(0, start);
  end = Math.min(end, size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  const stream = streamObject(key, start, end);
  return new Response(stream, {
    status: 206,
    headers: {
      ...baseHeaders(type),
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
    },
  });
}
