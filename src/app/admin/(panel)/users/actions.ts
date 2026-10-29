"use server";

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { requireUser, type SessionUser } from "@/lib/auth";
import type { ActionResult } from "../pages/actions";

const password = z.string().min(12, "Şifrə ən azı 12 simvol olmalıdır").max(200);
const role = z.enum(["admin", "editor"]);

/** Only admins manage users; an editor edits content. */
async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Yalnız admin istifadəçiləri idarə edə bilər");
  return user;
}

const adminCount = async () => (await db.select({ n: count() }).from(users).where(eq(users.role, "admin")))[0].n;

export async function addUserAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ name: z.string().trim().min(1, "Ad boş ola bilməz").max(100), email: z.email("Email düzgün deyil"), role, password })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const email = parsed.data.email.trim().toLowerCase();
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (taken) return { ok: false, error: "Bu email ilə istifadəçi artıq var" };
  await db.insert(users).values({ name: parsed.data.name, email, role: parsed.data.role, passwordHash: await bcrypt.hash(parsed.data.password, 12) });
  refresh();
  return { ok: true, message: "İstifadəçi əlavə olundu" };
}

export async function updateUserAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), name: z.string().trim().min(1, "Ad boş ola bilməz").max(100), role, password: z.union([z.literal(""), password]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, name, password: newPassword } = parsed.data;
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { ok: false, error: "İstifadəçi tapılmadı" };
  // The panel always keeps one admin (and you cannot lock yourself out).
  if (target.role === "admin" && parsed.data.role !== "admin" && (id === me.id || (await adminCount()) <= 1))
    return { ok: false, error: id === me.id ? "Öz admin rolunuzu dəyişə bilməzsiniz" : "Ən azı bir admin qalmalıdır" };
  await db
    .update(users)
    .set({ name, role: parsed.data.role, ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 12) } : {}), updatedAt: new Date() })
    .where(eq(users.id, id));
  // A new password signs the user out everywhere (yourself too: sign in again with it).
  if (newPassword) {
    await db.delete(sessions).where(eq(sessions.userId, id));
    if (id === me.id) redirect("/admin/login");
  }
  refresh();
  return { ok: true, message: newPassword ? "Yadda saxlanıldı, şifrə dəyişdi" : "Yadda saxlanıldı" };
}

export async function deleteUserAction(formData: FormData) {
  const me = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  if (id === me.id) throw new Error("Özünüzü silə bilməzsiniz");
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (target?.role === "admin" && (await adminCount()) <= 1) throw new Error("Ən azı bir admin qalmalıdır");
  await db.delete(users).where(eq(users.id, id));
  refresh();
}
