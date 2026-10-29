import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";

/**
 * Layered spam protection for public forms:
 * 1. honeypot field (checked by the form schema),
 * 2. time trap — real people need more than a few seconds to fill the form,
 * 3. Cloudflare Turnstile (only when TURNSTILE_SECRET_KEY is set),
 * 4. per-IP rate limit on stored submissions (20 per 10 minutes).
 */

const MIN_FILL_MS = 3_000;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 20;

/**
 * Visitor IP from the reverse proxy chain.
 * - VPS (Cloudflare → Caddy → app): Cloudflare's header, else the first forwarded address.
 * - cPanel / LiteSpeed (`CLIENT_IP_FROM=last-forwarded`): the web server appends the real
 *   address to X-Forwarded-For, so only the last entry is trusted — anything before it, and
 *   a `cf-connecting-ip` header, could be sent by the visitor to dodge the rate limit.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (process.env.CLIENT_IP_FROM === "last-forwarded") return forwarded.at(-1) ?? headers.get("x-real-ip") ?? "unknown";
  return headers.get("cf-connecting-ip") ?? forwarded[0] ?? headers.get("x-real-ip") ?? "unknown";
}

/** Salted hash so the raw IP is never written to the database. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? process.env.DATABASE_URL ?? "podkast";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** `startedAt` is set by the browser when the form becomes interactive. */
export function filledTooFast(startedAt: unknown): boolean {
  const t = Number(startedAt);
  return !Number.isFinite(t) || Date.now() - t < MIN_FILL_MS;
}

export async function isRateLimited(ipHash: string, form: string): Promise<boolean> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(submissions)
    .where(
      and(
        eq(submissions.ipHash, ipHash),
        eq(submissions.form, form),
        gt(submissions.createdAt, new Date(Date.now() - RATE_WINDOW_MS)),
      ),
    );
  return n >= RATE_MAX;
}

export const turnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

/** Server-side Turnstile check. Passes when Turnstile is not configured (local development). */
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5_000),
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
