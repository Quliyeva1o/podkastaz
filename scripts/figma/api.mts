// Minimal read-only Figma REST client. Token: FIGMA_TOKEN (file_content:read) in .env.local.
export const FILE_KEY = "YCsdeoCq9yoNPOKXYnBmWr";

const token = process.env.FIGMA_TOKEN;
if (!token) throw new Error("FIGMA_TOKEN is not set (.env.local)");

export async function figma<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.figma.com/v1${path}`, { headers: { "X-Figma-Token": token! } });
    if (res.status === 429 && attempt < 8) {
      // Figma image renders are heavily rate limited; honour Retry-After when given.
      const wait = Number(res.headers.get("retry-after")) * 1000 || Math.min(60_000, 5_000 * 2 ** attempt);
      if (wait > 120_000) {
        const tier = res.headers.get("x-figma-plan-tier");
        throw new Error(`Figma rate limit: retry after ${Math.round(wait / 3_600_000)}h (plan tier ${tier})`);
      }
      console.warn(`Figma rate limit, waiting ${Math.round(wait / 1000)}s`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`Figma ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json() as Promise<T>;
  }
}

export async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Render nodes to images. Returns nodeId → temporary URL. */
export async function renderNodes(ids: string[], format: "png" | "svg", scale = 1) {
  const out: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const res = await figma<{ images: Record<string, string | null> }>(
      `/images/${FILE_KEY}?ids=${encodeURIComponent(batch.join(","))}&format=${format}&scale=${scale}` +
        (format === "svg" ? "&svg_outline_text=false&svg_include_id=false" : ""),
    );
    for (const [id, url] of Object.entries(res.images)) if (url) out[id] = url;
  }
  return out;
}

type GeomNode = {
  type: string;
  visible?: boolean;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: { type: string; visible?: boolean; color?: { r: number; g: number; b: number; a: number }; opacity?: number }[];
  fillGeometry?: { path: string; windingRule: string }[];
  children?: GeomNode[];
};

/**
 * Looks nodes up through `GET /files/:key?ids=` (the `/nodes` and `/images`
 * endpoints are limited to a few calls per day on the Starter plan; this one is not).
 */
export async function fileNodes<T>(ids: string[], geometry = false): Promise<Record<string, T>> {
  const res = await figma<{ document: { id: string; children?: unknown[] } }>(
    `/files/${FILE_KEY}?ids=${encodeURIComponent(ids.join(","))}${geometry ? "&geometry=paths" : ""}`,
  );
  const wanted = new Set(ids);
  const found: Record<string, T> = {};
  const walk = (n: { id: string; children?: unknown[] }) => {
    if (wanted.has(n.id)) found[n.id] = n as T;
    (n.children as { id: string }[] | undefined)?.forEach(walk);
  };
  walk(res.document);
  return found;
}

/**
 * Builds an SVG from vector geometry.
 * Supports solid fills on unrotated vectors, which covers logos and wordmarks.
 */
export async function vectorSvg(id: string): Promise<string> {
  const root = (await fileNodes<GeomNode>([id], true))[id];
  const box = root.absoluteBoundingBox!;
  const paths: string[] = [];
  const walk = (n: GeomNode) => {
    if (n.visible === false) return;
    const fill = n.fills?.find((f) => f.type === "SOLID" && f.visible !== false);
    if (n.fillGeometry?.length && fill?.color && n.absoluteBoundingBox) {
      const { r, g, b } = fill.color;
      const hex = "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
      const opacity = (fill.color.a ?? 1) * (fill.opacity ?? 1);
      const dx = +(n.absoluteBoundingBox.x - box.x).toFixed(3);
      const dy = +(n.absoluteBoundingBox.y - box.y).toFixed(3);
      for (const geom of n.fillGeometry) {
        const attrs = [
          `transform="translate(${dx} ${dy})"`,
          `d="${geom.path}"`,
          `fill="${hex}"`,
          opacity < 1 ? `fill-opacity="${+opacity.toFixed(3)}"` : "",
          geom.windingRule === "EVENODD" ? `fill-rule="evenodd"` : "",
        ];
        paths.push(`<path ${attrs.filter(Boolean).join(" ")}/>`);
      }
      return;
    }
    n.children?.forEach(walk);
  };
  walk(root);
  const w = +box.width.toFixed(3);
  const h = +box.height.toFixed(3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${paths.join("")}</svg>`;
}

/** Download URLs of every image fill in the file, keyed by image ref (not rate limited). */
export async function imageFillUrls(): Promise<Record<string, string>> {
  return (await figma<{ meta: { images: Record<string, string> } }>(`/files/${FILE_KEY}/images`)).meta.images;
}

/** MIME type from the first bytes of an image file. */
export function sniffImage(b: Buffer): string {
  if (b[0] === 0x89 && b[1] === 0x50) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b.subarray(0, 4).toString() === "RIFF") return "image/webp";
  if (b.subarray(4, 12).toString().includes("ftypavif")) return "image/avif";
  if (b.subarray(0, 3).toString() === "GIF") return "image/gif";
  throw new Error("Unknown image type");
}
