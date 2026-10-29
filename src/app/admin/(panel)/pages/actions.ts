"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pages, pageSections, sectionContents } from "@/db/schema";
import { locales } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { invalidateTags } from "@/lib/cache/tags";
import { moveSection, restoreVersion, saveSection, setSectionVisible } from "@/lib/content/mutations";
import { objectSchema } from "@/sections/fields";
import { isPageKey, pageTag, type PageKey } from "@/sections/pages";
import { isSectionType, sections } from "@/sections/registry";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const refresh = (keys: (PageKey | null)[]) =>
  invalidateTags(keys.filter((k): k is PageKey => Boolean(k)).map(pageTag));

export async function saveSectionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const placementId = z.uuid().parse(formData.get("placementId"));
  const applyTo = formData.getAll("applyTo").map((v) => z.uuid().parse(v));

  const [row] = await db
    .select({ type: sectionContents.type })
    .from(pageSections)
    .innerJoin(sectionContents, eq(sectionContents.id, pageSections.contentId))
    .where(eq(pageSections.id, placementId));
  if (!row || !isSectionType(row.type)) return { ok: false, error: "Section tapılmadı" };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("data")));
  } catch {
    return { ok: false, error: "Məlumat oxunmadı" };
  }
  const parsed = objectSchema(sections[row.type].fields).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Yanlış məlumat: " + parsed.error.issues[0]?.message };

  const keys = await saveSection({ placementId, data: parsed.data, applyTo, userId: user.id });
  await refresh(keys);
  return { ok: true, message: "Yadda saxlanıldı" };
}

/** Bound per version (`restoreVersionAction.bind(null, id)`) and posted from inside the editor form. */
export async function restoreVersionAction(versionIdArg: string, formData: FormData) {
  const user = await requireUser();
  const placementId = z.uuid().parse(formData.get("placementId"));
  const versionId = z.uuid().parse(versionIdArg);
  await refresh(await restoreVersion(placementId, versionId, user.id));
}

export async function toggleVisibleAction(formData: FormData) {
  await requireUser();
  const placementId = z.uuid().parse(formData.get("placementId"));
  // Switch rows post "on" when checked and nothing when unchecked.
  const visible = ["on", "true"].includes(String(formData.get("visible")));
  await refresh([await setSectionVisible(placementId, visible)]);
}

export async function moveSectionAction(formData: FormData) {
  await requireUser();
  const placementId = z.uuid().parse(formData.get("placementId"));
  const direction = formData.get("direction") === "up" ? -1 : 1;
  await refresh([await moveSection(placementId, direction)]);
}

const localized = z.object(Object.fromEntries(locales.map((l) => [l, z.string().max(300)])) as Record<
  (typeof locales)[number],
  z.ZodString
>);
const seoSchema = z.object({
  title: localized,
  description: localized,
  ogImageId: z.uuid().optional(),
  noindex: z.boolean().optional(),
});

export async function savePageSeoAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireUser();
  const key = String(formData.get("pageKey"));
  if (!isPageKey(key)) return { ok: false, error: "Səhifə tapılmadı" };

  const field = (name: string) =>
    Object.fromEntries(locales.map((l) => [l, String(formData.get(`${name}.${l}`) ?? "").trim()]));
  const parsed = seoSchema.safeParse({
    title: field("title"),
    description: field("description"),
    ogImageId: formData.get("ogImageId") || undefined,
    noindex: formData.get("noindex") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Yanlış məlumat: " + parsed.error.issues[0]?.message };

  await db.update(pages).set({ seo: parsed.data }).where(eq(pages.key, key));
  await invalidateTags([pageTag(key)]);
  return { ok: true, message: "SEO yadda saxlanıldı" };
}
