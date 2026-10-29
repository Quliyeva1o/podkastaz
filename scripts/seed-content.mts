// Creates every page and section from src/sections/pages.ts with the initial content.
// Idempotent: existing pages and placements are left untouched, so admin edits survive re-runs.
// Usage: npm run db:seed-content
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pages, pageSections, sectionContents } from "../src/db/schema";
import { objectSchema, withDefaults } from "../src/sections/fields";
import { pageKeys, pageLayouts } from "../src/sections/pages";
import { sections } from "../src/sections/registry";
import { pageSeo, sectionData } from "./seed-data.mjs";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

const sharedContent = new Map<string, string>();
let created = 0;

for (const key of pageKeys) {
  let [page] = await db.select().from(pages).where(eq(pages.key, key));
  page ??= (await db.insert(pages).values({ key, seo: pageSeo[key] }).returning())[0];

  for (const [position, slot] of pageLayouts[key].slots.entries()) {
    const [existing] = await db
      .select()
      .from(pageSections)
      .where(and(eq(pageSections.pageId, page.id), eq(pageSections.slot, slot.slot)));
    if (existing) {
      if (slot.shareKey) sharedContent.set(slot.shareKey, existing.contentId);
      continue;
    }

    let contentId = slot.shareKey ? sharedContent.get(slot.shareKey) : undefined;
    if (!contentId) {
      const seed = sectionData[slot.shareKey ?? `${key}.${slot.slot}`];
      if (!seed || seed.type !== slot.type) throw new Error(`No seed data for ${key}.${slot.slot}`);
      const fields = sections[slot.type].fields;
      const data = objectSchema(fields).parse(withDefaults(fields, seed.data));
      [{ id: contentId }] = await db
        .insert(sectionContents)
        .values({ type: slot.type, data })
        .returning({ id: sectionContents.id });
      if (slot.shareKey) sharedContent.set(slot.shareKey, contentId);
    }

    await db.insert(pageSections).values({ pageId: page.id, contentId, slot: slot.slot, position });
    created++;
  }
}

console.log(`Seed done: ${created} section placements created.`);
await client.end();
