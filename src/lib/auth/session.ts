import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const COOKIE = "mq_admin";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(COOKIE);
}

export type SessionUser = { id: string; email: string; name: string; role: "admin" | "editor" };

/** Returns the signed-in admin user, or null. Reads the request cookie, so callers sit behind Suspense. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, hashToken(token)))
    .limit(1);

  if (!row || row.expiresAt < new Date()) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}
