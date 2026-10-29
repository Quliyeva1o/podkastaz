"use server";

import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { bookings, bookingSettings, decors, studios } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { invalidateTags } from "@/lib/cache/tags";
import { isValidSlug, slugify } from "@/collections/slug";
import {
  decorFields,
  defaultHours,
  editorToDecor,
  editorToStudio,
  parseHours,
  parseRules,
  studioFields,
  type DecorEditorData,
  type StudioEditorData,
} from "@/lib/studios/fields";
import { studiosTag } from "@/lib/studios/queries";
import { objectSchema } from "@/sections/fields";
import { pageTag } from "@/sections/pages";
import type { ActionResult } from "../pages/actions";

/** Studios and decors show on the Studios page, every decors page and the booking form. */
const refresh = () => invalidateTags([studiosTag, pageTag("studios"), pageTag("decors"), pageTag("booking")]);

const empty = { az: "" };

function parseData<T>(fields: typeof studioFields, form: FormData): T | string {
  try {
    const parsed = objectSchema(fields).safeParse(JSON.parse(String(form.get("data"))));
    return parsed.success ? (parsed.data as T) : "Yanlış məlumat: " + parsed.error.issues[0]?.message;
  } catch {
    return "Məlumat oxunmadı";
  }
}

// ---------- Studios ----------

export async function createStudioAction() {
  await requireUser();
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${studios.position}), -1)` }).from(studios);
  const row = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(studios)
      .values({
        slugAz: `new-${Date.now().toString(36)}`,
        name: empty,
        address: empty,
        description: empty,
        hours: defaultHours,
        position: Number(max) + 1,
        active: false,
      })
      .returning({ id: studios.id });
    await tx.insert(bookingSettings).values({ studioId: s.id });
    return s;
  });
  redirect(`/admin/studios/${row.id}`);
}

export async function saveStudioAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  const data = parseData<StudioEditorData>(studioFields, form);
  if (typeof data === "string") return { ok: false, error: data };
  if (!data.title.az.trim()) return { ok: false, error: "Studiyanın adı boş ola bilməz" };

  const slug = slugify(String(form.get("slug") ?? "").trim() || data.title.az);
  if (!isValidSlug(slug)) return { ok: false, error: "Slug yanlışdır" };
  const [clash] = await db.select({ id: studios.id }).from(studios).where(and(eq(studios.slugAz, slug), ne(studios.id, id))).limit(1);
  if (clash) return { ok: false, error: `Slug artıq istifadə olunur: ${slug}` };

  const hours = parseHours(form);
  if (typeof hours === "string") return { ok: false, error: hours };
  const rules = parseRules(form);
  if (typeof rules === "string") return { ok: false, error: rules };

  await db.transaction(async (tx) => {
    await tx
      .update(studios)
      .set({ ...editorToStudio(data), slugAz: slug, hours, active: form.get("active") === "on" })
      .where(eq(studios.id, id));
    await tx
      .insert(bookingSettings)
      .values({ studioId: id, ...rules })
      .onConflictDoUpdate({ target: bookingSettings.studioId, set: rules });
  });
  await refresh();
  return { ok: true, message: "Yadda saxlanıldı" };
}

export async function deleteStudioAction(form: FormData) {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  // Bookings keep their studio (history, the overlap constraint): such a studio is hidden instead.
  const [{ n }] = await db.select({ n: count() }).from(bookings).where(eq(bookings.studioId, id));
  if (n > 0) {
    await db.update(studios).set({ active: false }).where(eq(studios.id, id));
    await refresh();
    redirect(`/admin/studios/${id}?notice=has-bookings`);
  }
  await db.delete(studios).where(eq(studios.id, id));
  await refresh();
  redirect("/admin/studios");
}

export async function toggleStudioAction(form: FormData) {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  await db.update(studios).set({ active: form.get("active") === "on" }).where(eq(studios.id, id));
  await refresh();
}

/** Swaps two neighbours in an ordered list after normalising positions to the list order. */
async function move<T extends { id: string }>(
  rows: T[],
  id: string,
  dir: number,
  save: (id: string, position: number) => Promise<unknown>,
) {
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const order = rows.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [pos, rowId] of order.entries()) await save(rowId, pos);
}

export async function moveStudioAction(form: FormData) {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  const dir = form.get("direction") === "up" ? -1 : 1;
  await db.transaction(async (tx) => {
    const rows = await tx.select({ id: studios.id }).from(studios).orderBy(asc(studios.position), asc(studios.createdAt));
    await move(rows, id, dir, (rowId, position) => tx.update(studios).set({ position }).where(eq(studios.id, rowId)));
  });
  await refresh();
}

// ---------- Decors ----------

export async function createDecorAction(form: FormData) {
  await requireUser();
  const studioId = z.uuid().parse(form.get("studioId"));
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${decors.position}), -1)` })
    .from(decors)
    .where(eq(decors.studioId, studioId));
  const [row] = await db
    .insert(decors)
    .values({
      studioId,
      slugAz: `new-${Date.now().toString(36)}`,
      name: empty,
      shortName: empty,
      description: empty,
      position: Number(max) + 1,
      active: false,
    })
    .returning({ id: decors.id });
  redirect(`/admin/studios/${studioId}/decors/${row.id}`);
}

export async function saveDecorAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  const studioId = z.uuid().parse(form.get("studioId"));
  const data = parseData<DecorEditorData>(decorFields, form);
  if (typeof data === "string") return { ok: false, error: data };
  if (!data.title.az.trim()) return { ok: false, error: "Dekorun adı boş ola bilməz" };

  const slug = slugify(String(form.get("slug") ?? "").trim() || data.title.az);
  if (!isValidSlug(slug)) return { ok: false, error: "Slug yanlışdır" };
  const [clash] = await db
    .select({ id: decors.id })
    .from(decors)
    .where(and(eq(decors.studioId, studioId), eq(decors.slugAz, slug), ne(decors.id, id)))
    .limit(1);
  if (clash) return { ok: false, error: `Bu studiyada slug artıq istifadə olunur: ${slug}` };

  const values = editorToDecor(data);
  if (!values.shortName.az.trim()) values.shortName = { az: values.name.az.replace(/\s+dekor(u)?$/i, "") };
  await db
    .update(decors)
    .set({ ...values, slugAz: slug, active: form.get("active") === "on" })
    .where(and(eq(decors.id, id), eq(decors.studioId, studioId)));
  await refresh();
  return { ok: true, message: "Yadda saxlanıldı" };
}

export async function deleteDecorAction(form: FormData) {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  const studioId = z.uuid().parse(form.get("studioId"));
  // Bookings of this decor keep its name (decor_snapshot); the link becomes null.
  await db.delete(decors).where(and(eq(decors.id, id), eq(decors.studioId, studioId)));
  await refresh();
  redirect(`/admin/studios/${studioId}`);
}

export async function toggleDecorAction(form: FormData) {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  await db.update(decors).set({ active: form.get("active") === "on" }).where(eq(decors.id, id));
  await refresh();
}

export async function moveDecorAction(form: FormData) {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  const studioId = z.uuid().parse(form.get("studioId"));
  const dir = form.get("direction") === "up" ? -1 : 1;
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: decors.id })
      .from(decors)
      .where(eq(decors.studioId, studioId))
      .orderBy(asc(decors.position), asc(decors.createdAt));
    await move(rows, id, dir, (rowId, position) => tx.update(decors).set({ position }).where(eq(decors.id, rowId)));
  });
  await refresh();
}
