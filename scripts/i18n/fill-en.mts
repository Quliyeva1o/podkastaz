// Fills the English side of every admin text (pages' SEO, sections, collections, studios, decors,
// image alt texts) from the dictionary in ./en.mts, matched by the Azerbaijani text. Texts that
// already have English are left alone, so translations edited in the admin survive re-runs.
//
//   npm run i18n:fill-en             write the translations
//   npm run i18n:fill-en -- --dry    only list what would change and what has no translation
//   npm run i18n:fill-en -- --force  also overwrite English texts that are already there
//
// Run it before `deploy.sh` on the server (the build prerenders pages from the database), or
// restart the app afterwards: the cache tags it records make every process drop its pages.
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cacheTags, collectionItems, decors, media, pages, sectionContents, studios } from "../../src/db/schema";
import { collectionTag, isCollectionName } from "../../src/collections/registry";
import { mediaTag, pageKeys, pageTag } from "../../src/sections/pages";
// Same value as studiosTag in src/lib/studios/queries.ts (a server-only module).
const studiosTag = "studios";
import { en } from "./en.mjs";

const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

// Keys are compared without surrounding spaces and with Windows line breaks as plain ones.
const norm = (s: string) => s.replace(/\r\n/g, "\n").trim();
const dictionary = new Map(Object.entries(en).map(([az, text]) => [norm(az), text]));

const missing = new Map<string, string[]>();
let filled = 0;

const isLocalized = (v: unknown): v is { az: string; en?: string } =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v) && typeof (v as { az?: unknown }).az === "string" &&
  Object.keys(v as object).every((k) => k === "az" || k === "en" || k === "ru");

/** Returns the value with English filled in where the dictionary knows the AZ text. */
function translate(value: unknown, where: string): unknown {
  if (isLocalized(value)) {
    const az = norm(value.az);
    if (!az || (value.en && !force)) return value;
    const text = dictionary.get(az);
    if (text === undefined) {
      missing.set(az, [...(missing.get(az) ?? []), where]);
      return value;
    }
    if (value.en === text) return value;
    filled++;
    return { ...value, en: text };
  }
  if (Array.isArray(value)) return value.map((v, i) => translate(v, `${where}[${i}]`));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translate(v, `${where}.${k}`)]));
  }
  return value;
}

const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
const tags = new Set<string>();

for (const row of await db.select().from(pages)) {
  const seo = translate(row.seo, `page ${row.key} SEO`) as typeof row.seo;
  if (changed(seo, row.seo)) {
    tags.add(`page:${row.key}`);
    if (!dry) await db.update(pages).set({ seo }).where(eq(pages.id, row.id));
  }
}

for (const row of await db.select().from(sectionContents)) {
  const data = translate(row.data, `section ${row.type}`) as typeof row.data;
  if (changed(data, row.data)) {
    // A section can be shared by several pages: drop them all.
    for (const key of pageKeys) tags.add(pageTag(key));
    if (!dry) await db.update(sectionContents).set({ data }).where(eq(sectionContents.id, row.id));
  }
}

for (const row of await db.select().from(collectionItems)) {
  const data = translate(row.data, `${row.collection} ${row.slugAz}`) as typeof row.data;
  if (changed(data, row.data)) {
    if (isCollectionName(row.collection)) tags.add(collectionTag(row.collection));
    if (!dry) await db.update(collectionItems).set({ data }).where(eq(collectionItems.id, row.id));
  }
}

for (const row of await db.select().from(studios)) {
  const next = {
    name: translate(row.name, `studio ${row.slugAz} name`) as typeof row.name,
    address: translate(row.address, `studio ${row.slugAz} address`) as typeof row.address,
    description: translate(row.description, `studio ${row.slugAz} text`) as typeof row.description,
    content: translate(row.content, `studio ${row.slugAz} SEO`) as typeof row.content,
  };
  if (changed(next, { name: row.name, address: row.address, description: row.description, content: row.content })) {
    tags.add(studiosTag);
    if (!dry) await db.update(studios).set(next).where(eq(studios.id, row.id));
  }
}

for (const row of await db.select().from(decors)) {
  const next = {
    name: translate(row.name, `decor ${row.slugAz} name`) as typeof row.name,
    shortName: translate(row.shortName, `decor ${row.slugAz} short name`) as typeof row.shortName,
    description: translate(row.description, `decor ${row.slugAz} text`) as typeof row.description,
  };
  if (changed(next, { name: row.name, shortName: row.shortName, description: row.description })) {
    tags.add(studiosTag);
    if (!dry) await db.update(decors).set(next).where(eq(decors.id, row.id));
  }
}

for (const row of await db.select().from(media)) {
  const alt = translate(row.alt, `image ${row.fileName ?? row.id} alt`) as typeof row.alt;
  if (changed(alt, row.alt)) {
    tags.add(mediaTag);
    if (!dry) await db.update(media).set({ alt }).where(eq(media.id, row.id));
  }
}

// Same record as invalidateTags(): every app process drops the cached pages within seconds.
if (!dry && tags.size) {
  const now = Date.now();
  await db
    .insert(cacheTags)
    .values([...tags].map((tag) => ({ tag, expiredAt: now })))
    .onConflictDoUpdate({ target: cacheTags.tag, set: { expiredAt: sql`excluded.expired_at` } });
}

console.log(`${dry ? "Would fill" : "Filled"} ${filled} English texts.`);
if (missing.size) {
  console.log(`\nNo translation for ${missing.size} texts (add them to scripts/i18n/en.mts or type them in the admin):`);
  for (const [az, where] of missing) console.log(`- ${JSON.stringify(az)}  ← ${where[0]}${where.length > 1 ? ` (+${where.length - 1})` : ""}`);
}
await client.end();
