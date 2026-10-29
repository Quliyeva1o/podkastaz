// Creates (or resets the password of) the admin from ADMIN_EMAIL / ADMIN_PASSWORD.
// Usage: npm run db:seed-admin
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../src/db/schema";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) in the environment.");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);
const passwordHash = await bcrypt.hash(password, 12);

await db
  .insert(users)
  .values({ email, name: "Admin", passwordHash, role: "admin" })
  .onConflictDoUpdate({ target: users.email, set: { passwordHash, role: "admin" } });

console.log(`Admin ready: ${email}`);
await client.end();
