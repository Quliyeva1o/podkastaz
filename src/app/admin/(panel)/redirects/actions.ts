"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { redirects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { invalidateTags } from "@/lib/cache/tags";
import { cleanRule, redirectsTag } from "@/lib/redirects";
import type { ActionResult } from "../pages/actions";

export async function addRedirectAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireUser();
  const rule = cleanRule(String(formData.get("from") ?? ""), String(formData.get("to") ?? ""));
  if (!rule) return { ok: false, error: "Ünvanlar “/” ilə başlamalıdır (hədəf tam URL də ola bilər)" };
  await db
    .insert(redirects)
    .values({ ...rule, permanent: formData.get("temporary") !== "on" })
    .onConflictDoUpdate({ target: redirects.from, set: { to: rule.to, permanent: formData.get("temporary") !== "on" } });
  await invalidateTags([redirectsTag]);
  return { ok: true, message: "Yadda saxlanıldı" };
}

export async function deleteRedirectAction(formData: FormData) {
  await requireUser();
  await db.delete(redirects).where(eq(redirects.id, z.uuid().parse(formData.get("id"))));
  await invalidateTags([redirectsTag]);
}
