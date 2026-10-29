"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function deleteSubmissionAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().parse(formData.get("id"));
  await db.delete(submissions).where(eq(submissions.id, id));
  redirect("/admin/submissions");
}

export async function markUnreadAction(formData: FormData) {
  await requireUser();
  const id = z.uuid().parse(formData.get("id"));
  await db.update(submissions).set({ read: false }).where(eq(submissions.id, id));
  redirect("/admin/submissions");
}
