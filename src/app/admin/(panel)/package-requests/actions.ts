"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { packageRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "../pages/actions";

/** Status (Yeni / Əlaqə saxlanıldı / Razılaşdı / İmtina) and admin note of a package request. */
export async function updatePackageRequestAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireUser();
  const id = z.uuid().parse(form.get("id"));
  const status = z.enum(["new", "contacted", "agreed", "declined"]).safeParse(form.get("status"));
  if (!status.success) return { ok: false, error: "Status yanlışdır" };
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  await db.update(packageRequests).set({ status: status.data, adminNote: note, read: true }).where(eq(packageRequests.id, id));
  return { ok: true, message: "Yadda saxlanıldı" };
}
