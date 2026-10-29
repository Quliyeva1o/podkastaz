import { NextResponse, type NextRequest } from "next/server";
import type { Locale } from "@/i18n/config";
import { resolvePublicPath } from "@/i18n/routes";
import { loadRedirectRules, studioExists } from "@/lib/proxy-data";
import { matchRedirect, type RedirectRule } from "@/lib/redirects";

// Redirect rules (old URLs), refreshed at most every 60 s.
let rules: { data: RedirectRule[]; at: number } | null = null;

async function redirectRules(): Promise<RedirectRule[]> {
  if (rules && Date.now() - rules.at < 60_000) return rules.data;
  try {
    rules = { data: await loadRedirectRules(), at: Date.now() };
  } catch {
    // Keep serving with the last known rules.
  }
  return rules?.data ?? [];
}

// Unknown or hidden studio slugs answer 404 before any HTML is streamed (a streamed page would
// already have sent 200). Checked on every such request, so hiding a studio takes effect at once.
async function detailExists(resolved: { route: string; rest: string[] }, lang: Locale): Promise<boolean> {
  if (resolved.rest.length === 0) return true;
  if (resolved.route !== "studios") return false;
  try {
    return await studioExists(lang, decodeURIComponent(resolved.rest[0]));
  } catch {
    // Database unreachable: let the page itself decide.
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const rule = matchRedirect(await redirectRules(), request.nextUrl.pathname);
  if (rule) {
    const target = new URL(rule.to, request.nextUrl.origin);
    return NextResponse.redirect(target, rule.permanent ? 301 : 302);
  }

  const resolved = resolvePublicPath(request.nextUrl.pathname);
  const url = request.nextUrl.clone();

  switch (resolved.kind) {
    case "redirect":
      url.pathname = resolved.to;
      return NextResponse.redirect(url, 308);
    case "rewrite":
      if (!(await detailExists(resolved, resolved.internal.split("/")[1] as Locale))) {
        url.pathname = `/${resolved.internal.split("/")[1]}/__not-found`;
        return NextResponse.rewrite(url);
      }
      url.pathname = resolved.internal;
      return NextResponse.rewrite(url);
    case "notFound":
      // Unknown or wrong-language segment: render the localized 404 page.
      url.pathname = `/${resolved.locale}/__not-found`;
      return NextResponse.rewrite(url);
  }
}

export const config = {
  // Site pages only: skip admin, API, Next internals and any file with an extension.
  matcher: ["/((?!admin|api|_next|.*\\..*).*)"],
};
