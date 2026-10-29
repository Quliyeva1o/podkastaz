// Before going live: lists everything that is still a placeholder — Figma sample texts and
// contacts, drafts, empty descriptions, missing settings. Read-only.
//   npm run check:launch                (on the server: in ~/podkast-src, reads shared/.env via .env.local)
// ✗ = must be fixed before launch (exit code 1), ⚠ = check with the client.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { bookingSettings, collectionItems, decors, pages, pageSections, sectionContents, studios } from "../../src/db/schema";
import { draftTexts } from "../draft-texts.mjs";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);
const errors: string[] = [];
const warnings: string[] = [];
const env = process.env;

// ---------- Settings ----------
const site = env.SITE_URL ?? "";
if (!/^https:\/\//.test(site) || /localhost|127\.0\.0\.1/.test(site)) errors.push(`SITE_URL is "${site}" — the real https:// domain`);
if (env.SITE_NOINDEX === "1") warnings.push("SITE_NOINDEX=1 — right for the test address, remove it for the live site");
for (const key of ["SMTP_HOST", "SMTP_FROM", "IP_HASH_SALT"]) if (!env[key]) errors.push(`${key} is not set`);
if (env.SMTP_HOST && !env.SMTP_PASS && env.SMTP_HOST !== "localhost") errors.push("SMTP_PASS is not set");
if (!env.TURNSTILE_SECRET_KEY) warnings.push("Turnstile is off (forms still have honeypot, time trap and rate limit)");

// ---------- Texts ----------
const text = (v: unknown): string => (typeof v === "string" ? v : v && typeof v === "object" ? Object.values(v).map(text).join(" ") : "");
const placeholders: [RegExp, string][] = [
  [/lorem|ipsum|dolor sit/i, "lorem ipsum"],
  [/netpoint\.az/i, "Figma sample e-mail (info@netpoint.az)"],
  [/565 ?77 ?77/, "Figma sample phone (+99412 565 77 77)"],
  [/Ə\.?\s?Rəcəbli 1\/10/, "Figma sample address"],
  [/Ramin|Quliyev|raminquliyev|Jane|Doe|emailhere/i, "Figma sample names in form placeholders (fine if wanted)"],
  [/hazırlanır|hüquqşünas tərəfindən/i, "legal text is still the draft note"],
];
const sectionRows = await db
  .select({ page: pages.key, slot: pageSections.slot, data: sectionContents.data })
  .from(pageSections)
  .innerJoin(pages, eq(pages.id, pageSections.pageId))
  .innerJoin(sectionContents, eq(sectionContents.id, pageSections.contentId));
for (const r of sectionRows) {
  const t = text(r.data);
  for (const [re, what] of placeholders) {
    if (re.test(t)) (what.includes("fine if") || what.includes("sample address") ? warnings : errors).push(`${r.page}.${r.slot}: ${what}`);
  }
  if (r.page === "about" && r.slot === "intro" && /Podkast\.az Bakıda podcast, video və kontent çəkilişi üçün qurulmuş/.test(t)) {
    warnings.push("about.intro: the seeded draft text — replace with the client's");
  }
  if (r.slot === "contacts") {
    const socials = (r.data as { socials?: { url: string }[] }).socials ?? [];
    const fake = socials.filter((s) => !/^https?:\/\/[^/]+\/.+/.test(s.url) || /wa\.me\/994125657777/.test(s.url));
    if (fake.length) errors.push(`global.contacts: ${fake.length} social links are placeholders (${fake.map((s) => s.url).join(", ")})`);
  }
  if (r.slot === "business") {
    const b = r.data as Record<string, string>;
    for (const k of ["legalName", "postalCode", "latitude", "longitude"]) if (!b[k]) warnings.push(`global.business: ${k} is empty (Google / JSON-LD)`);
  }
}
for (const p of await db.select().from(pages)) {
  if (p.key !== "global" && p.key !== "decors" && (!p.seo.title.az || !p.seo.description.az)) errors.push(`${p.key}: SEO title/description missing`);
  if (p.seo.noindex) warnings.push(`${p.key}: noindex is on`);
}

// ---------- Studios, decors, collections ----------
for (const s of await db.select().from(studios)) {
  if (!s.active) continue;
  if (/^Studiya \d$/.test(s.name.az)) warnings.push(`studio "${s.name.az}": Figma placeholder name`);
  if (/lorem|ipsum/i.test(s.description.az)) errors.push(`studio "${s.name.az}": lorem ipsum in the description`);
  if (!s.description.az.trim()) warnings.push(`studio "${s.name.az}": no description (Studiyalar page)`);
  else if (draftTexts.has(s.description.az)) warnings.push(`studio "${s.name.az}": the seeded draft description`);
  if (s.hours.every((h) => h?.open === "10:00" && h?.close === "22:00")) warnings.push(`studio "${s.name.az}": default opening hours 10:00–22:00 every day`);
}
for (const b of await db.select().from(bookingSettings)) {
  if (b.stepMin === 30 && b.minDurationMin === 60 && b.maxDurationMin === 480 && b.bufferMin === 0) {
    warnings.push("booking rules: default values (30 min step, 1–8 h, no buffer) — confirm with the client");
    break;
  }
}
const emptyDecors = (await db.select().from(decors)).filter((d) => d.active && !d.description.az.trim());
if (emptyDecors.length) warnings.push(`${emptyDecors.length} decors without a description (Figma had lorem)`);
const loremDecors = (await db.select().from(decors)).filter((d) => d.active && /lorem|ipsum/i.test(d.description.az));
if (loremDecors.length) errors.push(`${loremDecors.length} decors with lorem ipsum in the description`);
const draftDecors = (await db.select().from(decors)).filter((d) => d.active && draftTexts.has(d.description.az));
if (draftDecors.length) warnings.push(`${draftDecors.length} decors still have the seeded draft description`);
const items = await db.select().from(collectionItems);
const videos = items.filter((i) => i.collection === "works" && (i.data as { kind: string }).kind === "video");
if (videos.length && videos.every((v) => !(v.data as { youtube: string }).youtube)) {
  warnings.push(`İşlərimiz: none of the ${videos.length} videos has a YouTube link (no play button yet)`);
}
for (const i of items) {
  const t = text(i.data);
  if (/lorem|ipsum/i.test(t)) errors.push(`${i.collection} "${text((i.data as { title: unknown }).title)}": lorem ipsum`);
}

console.log(errors.length ? `\n✗ ${errors.length} to fix before launch:` : "\n✓ nothing blocking");
for (const e of errors) console.log(`  ✗ ${e}`);
if (warnings.length) console.log(`\n⚠ ${warnings.length} to check with the client:`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
await client.end();
process.exit(errors.length ? 1 : 0);
