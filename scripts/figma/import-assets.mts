// Imports the Figma images/logos used by sections into the media library and fills the empty
// image fields of the seeded sections. Re-runnable: images are deduplicated by source, and
// fields an admin already set are never overwritten.
// Collection items, studios and decors bring their own images (scripts/seed-collections.mts).
// Usage: npm run figma:assets
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pages, pageSections, sectionContents } from "../../src/db/schema";
import type { Localized } from "../../src/i18n/config";
import { importMedia, type Source } from "./local-media.mjs";

type Path = (string | number)[];
type Asset = { page: string; slot: string; path: Path; source: Source; alt?: Localized };

const t = (az: string): Localized => ({ az });
const brand = t("Podkast.az");

/** Section field → Figma image ref (desktop frames) or a file under design/assets. */
const assets: Asset[] = [
  { page: "global", slot: "header", path: ["logo"], source: { file: "logo/logo-white.png" }, alt: brand },
  { page: "global", slot: "header", path: ["logoDark"], source: { file: "logo/logo-header.png" }, alt: brand },
  // Orange gradient behind the "Rezervasiya et" menu card.
  { page: "global", slot: "menu", path: ["bookingBackground"], source: { ref: "72153309ad7fde19b0147f4a24d46c2594fefcd7" } },
  { page: "about", slot: "intro", path: ["image"], source: { ref: "4b523d0a5465a0b88a198b8c1ed00a2947a5bd5e" }, alt: t("Podkast.az studiyasında podcast çəkilişi") },
  // Orange gradient of the 4K / Production cards (same image as the menu card).
  { page: "about", slot: "advantages", path: ["background"], source: { ref: "72153309ad7fde19b0147f4a24d46c2594fefcd7" } },
  {
    page: "home",
    slot: "hero",
    path: ["background"],
    source: { ref: "c180fb7833d1daefa0b896605863a278cd98ec4c" },
    alt: t("Podcast studiyasında mikrofon qarşısında danışan qonaq"),
  },
];

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

// Write ids into the section data, only where the field is still empty.
let filled = 0;
for (const asset of assets) {
  const id = await importMedia(db, asset.source, asset.alt);
  const [row] = await db
    .select({ id: sectionContents.id, data: sectionContents.data })
    .from(pageSections)
    .innerJoin(pages, eq(pages.id, pageSections.pageId))
    .innerJoin(sectionContents, eq(sectionContents.id, pageSections.contentId))
    .where(and(eq(pages.key, asset.page), eq(pageSections.slot, asset.slot)));
  if (!row) throw new Error(`Section ${asset.page}.${asset.slot} not found — run db:seed-content first`);

  const data = structuredClone(row.data) as Record<string, unknown>;
  let parent: Record<string | number, unknown> = data;
  for (const key of asset.path.slice(0, -1)) parent = parent?.[key] as Record<string | number, unknown>;
  const last = asset.path.at(-1)!;
  // Empty = null, or missing because the field was added after the content was seeded.
  if (!parent || parent[last] != null) continue;
  parent[last] = id;
  await db.update(sectionContents).set({ data }).where(eq(sectionContents.id, row.id));
  filled++;
}

console.log(`Assets done: ${filled} fields filled.`);
await client.end();
