// DEV ONLY: wipes all pages/sections and re-seeds them. Refuses to run against a non-local database.
// Usage: npm run db:reset-content
import { execFileSync } from "node:child_process";
import postgres from "postgres";

const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
  console.error(`Refusing to reset non-local database (${url.hostname}).`);
  process.exit(1);
}

const sql = postgres(url.toString(), { max: 1 });
await sql`truncate section_versions, page_sections, section_contents, pages cascade`;
// Items created by the E2E suite ("E2E …"); seeded and admin-made items are kept.
await sql`delete from collection_items where data->'title'->>'az' like 'E2E %'`;
// Contact-form messages sent by the E2E suite (also frees the per-IP rate limit).
await sql`delete from submissions where data->>'email' like '%@e2e.test'`;
// Bookings and package requests made by the E2E suite (customer e-mails @e2e.test).
await sql`delete from package_requests where email like '%@e2e.test'`;
await sql`delete from bookings where email like '%@e2e.test' or admin_note like 'E2E %'`;
// Studios made by the E2E suite (decors and settings go with them).
await sql`delete from bookings where studio_snapshot->>'name' like 'E2E %'`;
await sql`delete from studios where name->>'az' like 'E2E %' or (name->>'az' = '' and slug_az like 'new-%')`;
await sql.end();

execFileSync(process.execPath, ["--import", "tsx", "scripts/seed-content.mts"], { stdio: "inherit" });
