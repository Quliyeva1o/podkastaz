"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { getPageContent } from "@/lib/content/queries";
import { sendMail, tableEmail } from "@/lib/mail";
import { siteUrl } from "@/lib/seo";
import type { NotificationsData } from "@/sections/types";
import { clientIp, filledTooFast, hashIp, isRateLimited, verifyTurnstile } from "./spam";

const schema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional().default(""),
  email: z.email().max(200),
  phone: z.string().trim().max(50).optional().default(""),
  subject: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(1).max(5000),
  locale: z.string(),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional(),
});

export type ContactState = { ok: true } | { ok: false; error: "invalid" | "rate" | "server" } | null;

/**
 * Stores a contact-form message (admin → "Mesajlar") and emails the recipients
 * set in admin → Ayarlar → "Email bildirişləri". Spam gets a fake success so bots learn nothing.
 */
export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Filled honeypot → silently "succeed".
    return typeof raw.website === "string" && raw.website ? { ok: true } : { ok: false, error: "invalid" };
  }

  const ip = clientIp(await headers());
  if (filledTooFast(raw.startedAt) || !(await verifyTurnstile(raw["cf-turnstile-response"], ip))) {
    return { ok: true };
  }

  const ipHash = hashIp(ip);
  if (await isRateLimited(ipHash, "contact")) return { ok: false, error: "rate" };

  const { locale, firstName, lastName, email, phone, subject: topic, message } = parsed.data;
  const name = `${firstName} ${lastName}`.trim();
  const data = { name, email, phone, subject: topic, message };
  let id: string;
  try {
    [{ id }] = await db
      .insert(submissions)
      .values({ form: "contact", data, locale: hasLocale(locale) ? locale : "az", ipHash })
      .returning({ id: submissions.id });
  } catch {
    return { ok: false, error: "server" };
  }

  // Send the email after the response, so the visitor never waits for SMTP.
  after(async () => {
    try {
      const global = await getPageContent("global");
      const settings = global.sections.find((s) => s.type === "notifications")?.data as NotificationsData | undefined;
      // An empty admin field means "not set" → fall back to NOTIFY_EMAIL (?? would keep "").
      const to = (settings?.recipients?.trim() || process.env.NOTIFY_EMAIL || "")
        .split(/[,;\s]+/)
        .filter((a) => z.email().safeParse(a).success);
      const subject = `${settings?.subject?.az || "Saytdan yeni müraciət"}: ${name}`;
      const mail = tableEmail(
        subject,
        [
          ["Ad", name],
          ["E-poçt", email],
          ["Telefon", phone],
          ["Mövzu", topic],
          ["Mesaj", message],
          ["Dil", locale.toUpperCase()],
        ],
        { label: "Admin paneldə aç", href: `${siteUrl}/admin/submissions/${id}` },
      );
      if (await sendMail({ to, subject, ...mail, replyTo: email })) {
        await db.update(submissions).set({ notifiedAt: new Date() }).where(eq(submissions.id, id));
      }
    } catch (error) {
      console.error("Contact notification email failed", error);
    }
  });

  return { ok: true };
}
