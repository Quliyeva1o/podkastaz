"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { media } from "@/db/schema";
import { locales } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { invalidateTags } from "@/lib/cache/tags";
import { mediaTag } from "@/sections/pages";

/** Saves the alt text (all three languages) of one image — used by screen readers and Google Images. */
export async function saveAltAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().parse(formData.get("id"));
  const alt = Object.fromEntries(
    locales.map((l) => [l, String(formData.get(`alt.${l}`) ?? "").trim().slice(0, 300)]),
  ) as Record<(typeof locales)[number], string>;
  await db.update(media).set({ alt }).where(eq(media.id, id));
  await invalidateTags([mediaTag]);
}
