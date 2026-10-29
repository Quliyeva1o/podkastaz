import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { invalidateTags } from "@/lib/cache/tags";
import { ingestImage, UploadError } from "@/lib/media/process";
import { mediaUrl, removeObjectFolder } from "@/lib/media/storage";
import { mediaUsage } from "@/lib/media/usage";
import { mediaTag } from "@/sections/pages";

const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });

/** Media library listing for the admin image picker. */
export async function GET() {
  if (!(await getSessionUser())) return unauthorized();
  const rows = await db.select().from(media).orderBy(desc(media.createdAt)).limit(500);
  const usage = await mediaUsage(new Set(rows.map((r) => r.id)));
  return Response.json(
    rows.map((r) => ({
      id: r.id,
      mime: r.mime,
      // Images: a small WebP preview; videos: the smallest web rendition.
      url: mediaUrl(
        (r.mime.startsWith("video/")
          ? r.variants.find((v) => v.format === "mp4")?.key
          : r.variants.find((v) => v.width >= 320 && v.format === "webp")?.key) ?? r.key,
      ),
      width: r.width,
      height: r.height,
      alt: r.alt,
      // For the library search: the file's name and where it is used.
      name: r.fileName ?? sourceName(r.source),
      usage: usage.get(r.id)?.paths ?? [],
      keywords: usage.get(r.id)?.keywords ?? [],
    })),
  );
}

/**
 * Deletes one file and all its renditions. Refused (409) while it is used anywhere on the
 * site, with the places, so a page never ends up with an empty image box.
 */
export async function DELETE(request: Request) {
  if (!(await getSessionUser())) return unauthorized();
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Yanlış id" }, { status: 400 });

  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) return Response.json({ error: "Fayl tapılmadı" }, { status: 404 });

  const usage = (await mediaUsage(new Set([id]))).get(id)?.paths ?? [];
  if (usage.length) return Response.json({ error: "Fayl saytda istifadə olunur", usage }, { status: 409 });

  await db.delete(media).where(eq(media.id, id));
  await removeObjectFolder(row.key);
  await invalidateTags([mediaTag], "route");
  return Response.json({ ok: true });
}

/** Readable name of an imported file ("pack:Hero section Video.mp4" → "Hero section Video.mp4"); Figma image refs have none. */
function sourceName(source: string | null) {
  const match = source && /^(?:pack|figma-svg):(.+)$/.exec(source);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  if (!(await getSessionUser())) return unauthorized();

  const form = await request.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return Response.json({ error: "Fayl seçilməyib" }, { status: 400 });

  try {
    const rows = [];
    for (const file of files) rows.push(await ingestImage(file));
    await invalidateTags([mediaTag], "route");
    return Response.json(rows.map((r) => ({ id: r.id, url: mediaUrl(r.key) })));
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
