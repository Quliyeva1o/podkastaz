// Seeds the collections (services, packages, add-ons, works, partners) and the studios with
// their decors from Figma, images included. Idempotent: a collection (or the studios table)
// that already has rows is left alone, so admin edits survive re-runs.
// Figma lorem ipsum (studio and decor descriptions) is not copied: those stay empty until
// the client sends real texts. Usage: npm run db:seed-collections
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { collections, type CollectionName } from "../src/collections/registry";
import { slugify } from "../src/collections/slug";
import { bookingSettings, collectionItems, decors, studios } from "../src/db/schema";
import type { Localized } from "../src/i18n/config";
import { defaultHours } from "../src/lib/studios/fields";
import { objectSchema, withDefaults } from "../src/sections/fields";
import { importMedia } from "./figma/local-media.mjs";

const t = (az: string): Localized => ({ az });
const texts = (...items: string[]) => items.map((text) => ({ text: t(text) }));

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

const fig = (ref: string, alt?: string) => importMedia(db, { ref }, alt ? t(alt) : undefined);

async function seedCollection(name: CollectionName, items: Record<string, unknown>[]) {
  const [{ n }] = await db.select({ n: count() }).from(collectionItems).where(eq(collectionItems.collection, name));
  if (n > 0) return console.log(`${name}: ${n} items exist, skipped`);
  const fields = collections[name].fields;
  const used = new Set<string>();
  for (const [position, item] of items.entries()) {
    const data = objectSchema(fields).parse(withDefaults(fields, item));
    const base = slugify((data as { title: Localized }).title.az) || name;
    // Clean slugs (`?paket=pro`); a number only when two titles give the same slug.
    let slug = base;
    for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
    used.add(slug);
    await db.insert(collectionItems).values({
      collection: name,
      slugAz: slug,
      data,
      published: true,
      position,
    });
  }
  console.log(`${name}: ${items.length} items`);
}

// ---------- Services (Figma "Xidmətlər" + the designer's "Daxildir" lists) ----------
const services: [string, string, string, string[]][] = [
  ["studio-icaresi", "Studio icarəsi", "Studiya saatlıq istifadəyə verilir. Öz komandası ilə gələnlər və ya yalnız məkan axtaranlar üçün idealdır.", ["Professional podcast studio", "4 fərqli dekor seçimi", "Mikrofonlar və işıqlandırma", "Texniki setup"]],
  ["video-podcast", "Video podcast çəkilişi", "Podcast-lar üçün multi-camera video çəkilişi. Brendlər və kontent yaradıcılar üçün peşəkar görüntü.", ["2–3 kamera", "Full HD / 4K", "Işıq və kadr quruluşu"]],
  ["audio-podcast", "Audio Podcast Yazımı", "Təmiz və balanslı səs üçün akustik izolyasiyalı mühit və professional avadanlıq.", ["Professional mikrofonlar", "Səs balansı", "Təmiz audio fayllar"]],
  // Figma repeats the video card's text here; the designer's note has this one.
  ["montaj", "Montaj & Post-Production", "Çəkilişdən sonra podcast-ın tam hazır məhsula çevrilməsi.", ["Audio mastering", "Video montaj", "Rəng korreksiyası", "Intro / outro əlavə etmə"]],
  ["shorts-reels", "Shorts / Reels", "Uzun podcast-lardan qısa və dinamik kontent hazırlanması.", ["TikTok, Reels, YouTube Shorts", "Vertical format", "Subtitle və vizual vurğular"]],
  ["podcast-start", "Podcast Start", "Podcast-ınızı 0-dan professional səviyyəyə qaldırırıq.", ["Konsept və format", "Intro / outro", "İlk çəkiliş", "Yayım üçün hazır paket"]],
  // No description in Figma: one line from the designer's notes.
  ["canli-yayim", "Canlı Yayım", "YouTube, Instagram və Facebook-da canlı yayım: event və podcast yayımı.", ["YouTube / Instagram / Facebook Live", "Event və podcast yayımı", "Multi-camera switching"]],
  ["seyyar-studio", "Səyyar studio", "Tədbirlər, konfranslar və ofis içi podcast çəkilişləri.", ["Tədbirlər", "Konfranslar", "Ofis içi podcast çəkilişləri"]],
];

await seedCollection(
  "services",
  await Promise.all(
    services.map(async ([file, title, description, includes]) => ({
      title: t(title),
      description: t(description),
      cover: await importMedia(db, { file: `services/${file}.png` }, t(`${title} — illüstrasiya`)),
      includes: texts(...includes),
    })),
  ),
);

// ---------- Packages and add-ons (Figma "Paketlər") ----------
await seedCollection("packages", [
  {
    title: t("START"),
    audience: t("Yeni başlayanlar üçün"),
    price: "99",
    features: texts("1 saat studiya istifadəsi", "1 dekor seçimi (4-dən biri)", "2 mikrofon", "1 kamera (Full HD)", "Basic audio montaj", "Faylların təqdim edilməsi"),
  },
  {
    title: t("PRO"),
    audience: t("Kontent yaradanlar və bizneslər üçün"),
    price: "199",
    highlighted: true,
    features: texts("2 saat studiya", "İstənilən dekor (dəyişmək olar)", "4 mikrofon", "2 kamera (Full HD / 4K)", "Audio + video montaj", "2 qısa video (Reels / Shorts)", "Thumbnail (cover şəkil)"),
  },
  {
    title: t("PREMIUM"),
    audience: t("Brendlər və serial podcast-lar üçün"),
    price: "299",
    features: texts("3 saat studiya", "2–3 dekor dəyişimi", "4 mikrofon", "3 kamera (4K)", "Pro audio mastering", "Full video montaj", "4 qısa video (Shorts)", "Thumbnail + intro/outro"),
  },
]);

await seedCollection("addons", [
  { title: t("Əlavə 1 saat studiya"), price: "40" },
  { title: t("Əlavə kamera"), price: "20" },
  { title: t("Əlavə short video"), price: "20" },
  { title: t("Subtitrlər (AZ / EN / RU)"), price: "30" },
  { title: t("Podcast intro/outro"), price: "50" },
  { title: t("Aylıq paket"), price: "", customPriceLabel: t("Fərdi qiymət") },
]);

// ---------- Works (Figma "İşlərimiz") ----------
// Photos in Figma column order (the masonry fills column by column); the Videolar tab is a video
// gallery: cover photos in the carousel order (current, next…, previous last). YouTube links are
// added in the admin (Figma has none).
const photos = [
  "0dca5d648a3379b1c315dcf925875d4e7f39e0a1", "823dd7cf2fa1976e039dd4da5982d3c7d5bbde6d", "26ebf86c58ae8aa510ae051ba2ff409c37a81ffe",
  "42eea70b7b0a63f73d6ee9d9b94327b96ed1f010", "ddf33c7f9d1775c0669feb6f3d29698cfff335a3", "240a26856942fc1d1e422af88eaea9beec9d0dd8",
  "458f2b487dfb4fbaf5bf238d819b0bec75c5f9c5", "b8c953524ef84fa3091f3476c53a9a963ec15003", "5150adf6acd159cad8891f1deaab67c07822a3cf",
  "95258736cc08a37c6e3a9febd9734adbca316a4e", "b96d1496b00677319425dfd14be3d1cc2d229df8", "19ee9be19b3d26e9b96b23136d5501a1e272eacb",
  "790cd39b6422bb19cbb6e5a9c51eedbee1bdf564", "f144dc83a61645b0c0c546a034c01785a44db4a4", "635e2a2c7f58aa340b32b1c447dc6f957aaca35e",
  "408646e06a7a780b259c5598c5a8e5a6ca98e25d", "901958392892c302f706d4912f77338555d5384e", "68291b2f571ea7e30f9f9abdf692f40748a98c8e",
];
const videos = [
  "e95f5791526c5bac3f5f5d99dc38aa6514ce8a17", "8a9be9e63172b1bac9ace3318512b310ee18df7b", "c824cfd555234ab241393e6679cb746fe1a34994",
  "609d79fcd4f3166cd3f6190254143cbd05f9a5e6", "0d1a8cfa53f22d1cd9d0a1fc5ded19d594d0b77e", "a60c5918b806803e130ae4dcde0f38a967abf6c2",
  "c0a9bbdb1885fa70c6b699aef6714ec1df0388a8", "35d6988f437c8ca25cee37e4b17ba46315d65a38",
];
const photoAlt = "Podkast.az studiyasında podcast çəkilişi";
await seedCollection("works", [
  ...(await Promise.all(
    photos.map(async (ref, i) => ({ title: t(`Podcast çəkilişi ${i + 1}`), kind: "photo", cover: await fig(ref, photoAlt) })),
  )),
  ...(await Promise.all(
    videos.map(async (ref, i) => ({ title: t(`Video podcast ${i + 1}`), kind: "video", cover: await fig(ref, "Video podcast çəkilişindən kadr") })),
  )),
]);

// ---------- Partners (Figma "Haqqımızda" logo strip) ----------
const partners: [string, string][] = [
  ["Mado", "74f076837ebd51b2aa49f0bf81ba6215b94bf1bd"],
  ["iSpace", "0b294084cc28ba8c8dc1fd11480dcae651045e68"],
  ["Starbucks", "a2d51a804c94f222b2ca760e0aaad139831eb619"],
  ["Baku Electronics", "f6d08a0e8483613b3a104da2e03205f15adf2cfa"],
  ["Passage 1901", "56223574c43c9244796ef2aa1015512651cb382b"],
  ["Peynirci Baba", "f930c30856f3c677274ee8d41a15d5ee0781b5aa"],
];
await seedCollection(
  "partners",
  await Promise.all(partners.map(async ([name, ref]) => ({ title: t(name), cover: await fig(ref, `${name} loqosu`) }))),
);

// ---------- Studios and decors (Figma "Studiyalar", "Dekorlar", "Rezervasiya et") ----------
// On the Studios page each studio shows its decors: one wide photo + three narrow ones.
const decorNames = ["Həkimlər üçün", "Marketoloqlar üçün", "Dizaynerlər üçün", "Müəllimlər üçün"];
const studioSeed: { name: string; address: string; photos: string[] }[] = [
  { name: "Studiya 1", address: "Bakı", photos: ["3c6674530197256d7130e5ee438e667d292783a9", "35d956ee553211eb81a9894c190e4967ade55f67", "aa07133451eb1e2a6b95d59127a18a1d64b367b0", "133a5b032acd947006a34ada1a25487a612e3c5d"] },
  { name: "Studiya 2", address: "Əhməd Rəcəbli", photos: ["f2015fbe639d7c940086def9e9975ef7b943f5d3", "d4a3573b20b79fae66d93c845b43b8b85c547e6c", "10a1dfd6f37c82234edda6b689bb53617c144b31", "fa0f34b817337434f1d08a79332303c9ada02e09"] },
  { name: "Studiya 3", address: "Bakı", photos: ["9baa381bc3c76bd7c7e4123cff84744e86580723", "72eadd42fd8b250c5b973775e079c2e11f01146e", "10a1dfd6f37c82234edda6b689bb53617c144b31", "28f34645f2b4014dbe94b246d1ec22f989a0361d"] },
];
// Decors page gallery order (Figma "Dekorlar", 4×2): indexes into the studio's four photos.
const galleryOrder = [
  [0, 1, 2, 3, 2, 3, 0, 1],
  [0, 2, 3, 1, 3, 0, 2, 1],
  [0, 1, 3, 2, 2, 3, 1, 0],
  [0, 1, 3, 2, 2, 3, 1, 0],
];

const [{ n: studioCount }] = await db.select({ n: count() }).from(studios);
if (studioCount > 0) {
  console.log(`studios: ${studioCount} exist, skipped`);
} else {
  for (const [position, s] of studioSeed.entries()) {
    const ids = await Promise.all(s.photos.map((ref) => fig(ref, `${s.name} — podcast studiyası dekoru`)));
    const [studio] = await db
      .insert(studios)
      .values({
        slugAz: slugify(s.name),
        name: t(s.name),
        address: t(s.address),
        description: t(""),
        cover: ids[0],
        hours: defaultHours,
        position,
      })
      .returning({ id: studios.id });
    await db.insert(bookingSettings).values({ studioId: studio.id });
    for (const [i, short] of decorNames.entries()) {
      await db.insert(decors).values({
        studioId: studio.id,
        slugAz: slugify(`${short} dekor`),
        name: t(`${short} dekor`),
        shortName: t(short),
        description: t(""),
        cover: ids[i],
        gallery: galleryOrder[i].map((k) => ids[k]),
        position: i,
      });
    }
  }
  console.log(`studios: ${studioSeed.length} with ${decorNames.length} decors each`);
}

await client.end();
