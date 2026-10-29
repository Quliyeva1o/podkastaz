"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/auth";

const loginSchema = z.object({
  // Trim before validating: a pasted address with a stray space must still match.
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

// Compared against when the email is unknown, so both paths take the same time.
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("not-a-real-password", 12));

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Email və ya şifrə yanlışdır" };

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? getDummyHash());
  if (!user || !ok) return { error: "Email və ya şifrə yanlışdır" };

  await createSession(user.id);
  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
