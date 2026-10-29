import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { redirects, studios } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import type { RedirectRule } from "@/lib/redirects";

/**
 * Data the proxy needs on site requests, read straight from the database.
 * Never over HTTP from our own origin: on shared hosting that request goes out through the
 * web server and back into the app, takes another of the account's few process slots, and
 * under load the app ends up waiting on itself (marketinq.az lesson).
 */

export async function loadRedirectRules(): Promise<RedirectRule[]> {
  return db.select({ from: redirects.from, to: redirects.to, permanent: redirects.permanent }).from(redirects);
}

/** Whether an active studio has this slug (one indexed lookup, only on /studiyalar/<slug>). */
export async function studioExists(_lang: Locale, slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: studios.id })
    .from(studios)
    .where(and(eq(studios.slugAz, slug), eq(studios.active, true)))
    .limit(1);
  return Boolean(row);
}
