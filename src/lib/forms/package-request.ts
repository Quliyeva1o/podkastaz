"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { packageRequests } from "@/db/schema";
import { listPublished } from "@/collections/queries";
import type { AddonData, PackageData } from "@/collections/registry";
import { getPageContent } from "@/lib/content/queries";
import { sendMail, tableEmail } from "@/lib/mail";
import { siteUrl } from "@/lib/seo";
import type { NotificationsData, RequestEmailsData } from "@/sections/types";
import { clientIp, filledTooFast, hashIp, verifyTurnstile } from "./spam";

const schema = z.object({
  package: z.string().regex(/^[a-z0-9-]{1,80}$/),
  addons: z.array(z.uuid()).max(50),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(5).max(50),
  email: z.email().max(200),
  accuracy: z.literal("on"),
  terms: z.literal("on"),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional(),
});

export type PackageRequestState = { ok: true } | { ok: false; error: "invalid" | "rate" | "server" } | null;

const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 5;

/** AZN price of an add-on, or null for "Fərdi qiymət". */
const priceOf = (v: string) => (/^\d{1,6}$/.test(v.trim()) ? Number(v) : null);

/**
 * Paket müraciəti: the package and add-ons are looked up again and the total is computed here
 * (the browser's sum is only a preview); names and prices are stored as a snapshot, so later
 * price changes never rewrite old requests. Spam protection as on the other forms.
 */
export async function submitPackageRequest(_prev: PackageRequestState, formData: FormData): Promise<PackageRequestState> {
  const raw: Record<string, unknown> = { ...Object.fromEntries(formData), addons: formData.getAll("addons") };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return typeof raw.website === "string" && raw.website ? { ok: true } : { ok: false, error: "invalid" };
  }
  const ip = clientIp(await headers());
  if (filledTooFast(raw.startedAt) || !(await verifyTurnstile(raw["cf-turnstile-response"], ip))) return { ok: true };

  const ipHash = hashIp(ip);
  const [{ n }] = await db
    .select({ n: count() })
    .from(packageRequests)
    .where(and(eq(packageRequests.ipHash, ipHash), gt(packageRequests.createdAt, new Date(Date.now() - RATE_WINDOW_MS))));
  if (n >= RATE_MAX) return { ok: false, error: "rate" };

  const d = parsed.data;
  const [packages, addons] = await Promise.all([listPublished<PackageData>("packages"), listPublished<AddonData>("addons")]);
  const pkg = packages.find((p) => p.slugs.az === d.package);
  const chosen = addons.filter((a) => d.addons.includes(a.id));
  if (!pkg || chosen.length !== new Set(d.addons).size) return { ok: false, error: "invalid" };

  const packageSnapshot = { id: pkg.id, name: pkg.data.title.az, price: Number(pkg.data.price) || 0 };
  const addonsSnapshot = chosen.map((a) => ({ id: a.id, name: a.data.title.az, price: priceOf(a.data.price) }));
  const total = packageSnapshot.price + addonsSnapshot.reduce((sum, a) => sum + (a.price ?? 0), 0);

  let row: typeof packageRequests.$inferSelect;
  try {
    [row] = await db
      .insert(packageRequests)
      .values({
        packageSnapshot,
        addonsSnapshot,
        total,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        email: d.email,
        ipHash,
      })
      .returning();
  } catch (error) {
    console.error("Package request insert failed", error);
    return { ok: false, error: "server" };
  }

  after(async () => {
    try {
      await notify(row);
    } catch (error) {
      console.error("Package request emails failed", error);
    }
  });
  return { ok: true };
}

/** Admin notification + "we received your request" to the customer. */
async function notify(r: typeof packageRequests.$inferSelect) {
  const global = await getPageContent("global");
  const find = <T,>(type: string) => global.sections.find((s) => s.type === type)?.data as T | undefined;
  const settings = find<NotificationsData>("notifications");
  const templates = find<RequestEmailsData>("requestEmails");
  const name = `${r.firstName} ${r.lastName}`.trim();
  const custom = r.addonsSnapshot.some((a) => a.price === null);
  const totalText = `${r.total} AZN${custom ? " + fərdi qiymət" : ""}`;
  const rows: [string, string][] = [
    ["Paket", `${r.packageSnapshot.name} — ${r.packageSnapshot.price} AZN`],
    ["Add-on-lar", r.addonsSnapshot.map((a) => `${a.name} — ${a.price === null ? "fərdi qiymət" : `+${a.price} AZN`}`).join("\n")],
    ["Ümumi", totalText],
    ["Ad, soyad", name],
    ["Telefon", r.phone],
    ["E-poçt", r.email],
  ];
  const fill = (t: string) =>
    t.replace(/\{(ad|paket|məbləğ)\}/g, (_, k: string) => ({ ad: r.firstName, paket: r.packageSnapshot.name, məbləğ: totalText })[k]!);

  const to = (settings?.recipients?.trim() || process.env.NOTIFY_EMAIL || "")
    .split(/[,;\s]+/)
    .filter((a) => z.email().safeParse(a).success);
  const subject = `${fill(templates?.adminSubject?.az || "Yeni paket müraciəti")}: ${r.packageSnapshot.name}, ${name}`;
  const mail = tableEmail(subject, rows, { label: "Admin paneldə aç", href: `${siteUrl}/admin/package-requests/${r.id}` });
  if (await sendMail({ to, subject, ...mail, replyTo: r.email })) {
    await db.update(packageRequests).set({ notifiedAt: new Date() }).where(eq(packageRequests.id, r.id));
  }

  const customerSubject = fill(templates?.customerSubject?.az || "Müraciətiniz qəbul olundu");
  const body = fill(templates?.customerBody?.az || "").split(/\n\s*\n/).filter(Boolean);
  await sendMail({ to: [r.email], subject: customerSubject, ...tableEmail(customerSubject, rows.slice(0, 3), undefined, body) });
}
