"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { collectionItems } from "@/db/schema";
import { locales } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { invalidateTags } from "@/lib/cache/tags";
import { collections, collectionTag, isCollectionName, type CollectionDefinition, type CollectionName } from "@/collections/registry";
import { slugColumn } from "@/collections/queries";
import { isValidSlug, slugify } from "@/collections/slug";
import { emptyObject, objectSchema } from "@/sections/fields";
import { pageTag } from "@/sections/pages";
import type { ActionResult } from "../pages/actions";

/** Everything that shows collection items: the pages listed in the collection definition. */
function refresh(name: CollectionName) {
  return invalidateTags([collectionTag(name), ...collections[name].routes.map((r) => pageTag(r))]);
}

export async function createItemAction(formData: FormData) {
  await requireUser();
  const name = String(formData.get("collection"));
  if (!isCollectionName(name)) throw new Error("Unknown collection");

  const base = `new-${Date.now().toString(36)}`;
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${collectionItems.position}), -1)` })
    .from(collectionItems)
    .where(eq(collectionItems.collection, name));
  const [row] = await db
    .insert(collectionItems)
    .values({
      collection: name,
      slugAz: base,
      data: emptyObject(collections[name].fields),
      position: Number(max) + 1,
    })
    .returning({ id: collectionItems.id });
  redirect(`/admin/collections/${name}/${row.id}`);
}


export async function saveItemAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireUser();
  const name = String(formData.get("collection"));
  if (!isCollectionName(name)) return { ok: false, error: "Kolleksiya tapılmadı" };
  const id = z.uuid().parse(formData.get("id"));

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("data")));
  } catch {
    return { ok: false, error: "Məlumat oxunmadı" };
  }
  const parsed = objectSchema(collections[name].fields).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Yanlış məlumat: " + parsed.error.issues[0]?.message };
  const data = parsed.data as { title: Record<string, string> };
  const def: CollectionDefinition = collections[name];
  const invalid = def.validate?.(parsed.data);
  if (invalid) return { ok: false, error: invalid };

  // Empty slug → generated from that language's title (or the AZ title).
  const slugs = Object.fromEntries(
    locales.map((l) => {
      const given = String(formData.get(`slug.${l}`) ?? "").trim();
      return [l, given ? slugify(given) : slugify(data.title[l] || data.title.az || "")];
    }),
  ) as Record<(typeof locales)[number], string>;
  for (const l of locales) {
    if (!isValidSlug(slugs[l])) return { ok: false, error: `${l.toUpperCase()} slug yanlışdır` };
    const [clash] = await db
      .select({ id: collectionItems.id })
      .from(collectionItems)
      .where(and(eq(collectionItems.collection, name), eq(slugColumn[l], slugs[l]), ne(collectionItems.id, id)))
      .limit(1);
    if (clash) return { ok: false, error: `${l.toUpperCase()} slug artıq istifadə olunur: ${slugs[l]}` };
  }

  const publishedAtRaw = String(formData.get("publishedAt") ?? "");
  await db
    .update(collectionItems)
    .set({
      data: parsed.data,
      slugAz: slugs.az,
      published: formData.get("published") === "on",
      ...(publishedAtRaw ? { publishedAt: new Date(publishedAtRaw) } : {}),
    })
    .where(and(eq(collectionItems.id, id), eq(collectionItems.collection, name)));

  await refresh(name);
  return { ok: true, message: "Yadda saxlanıldı" };
}

export async function deleteItemAction(formData: FormData) {
  await requireUser();
  const name = String(formData.get("collection"));
  if (!isCollectionName(name)) return;
  const id = z.uuid().parse(formData.get("id"));
  await db.delete(collectionItems).where(and(eq(collectionItems.id, id), eq(collectionItems.collection, name)));
  await refresh(name);
  redirect(`/admin/collections/${name}`);
}

/** Moves an item one step up/down in the collection order. */
export async function moveItemAction(formData: FormData) {
  await requireUser();
  const name = String(formData.get("collection"));
  if (!isCollectionName(name)) return;
  const id = z.uuid().parse(formData.get("id"));
  const dir = formData.get("direction") === "up" ? -1 : 1;

  await db.transaction(async (tx) => {
    const all = await tx
      .select({ id: collectionItems.id, position: collectionItems.position })
      .from(collectionItems)
      .where(eq(collectionItems.collection, name))
      .orderBy(asc(collectionItems.position));
    const i = all.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return;
    // Normalise positions to the list order, then swap the two neighbours.
    const order = all.map((r) => r.id);
    [order[i], order[j]] = [order[j], order[i]];
    for (const [pos, itemId] of order.entries()) {
      await tx.update(collectionItems).set({ position: pos }).where(eq(collectionItems.id, itemId));
    }
  });
  await refresh(name);
}

/** Status switch in the list: publish / unpublish one item. */
export async function togglePublishedAction(formData: FormData) {
  await requireUser();
  const name = String(formData.get("collection"));
  if (!isCollectionName(name)) return;
  const id = z.uuid().parse(formData.get("id"));
  await db
    .update(collectionItems)
    .set({ published: formData.get("published") === "on" })
    .where(and(eq(collectionItems.id, id), eq(collectionItems.collection, name)));
  await refresh(name);
}
