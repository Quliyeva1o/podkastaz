import { defaultLocale, type Locale, type Localized } from "@/i18n/config";
import { href, staticRoutes, type RouteKey } from "@/i18n/routes";
import type { LinkValue } from "./fields";

/** Text in the requested language, falling back to Azerbaijani when a translation is empty. */
export const tx = (value: Localized | undefined, lang: Locale) =>
  value?.[lang] || value?.[defaultLocale] || "";

const isRoute = (v: string): v is RouteKey => v in staticRoutes;

/**
 * Turns an admin link target into a URL:
 * page key → localized page URL (a `?query` is kept: `booking?studiya=studiya-1`),
 * "studios/<slug>" → a studio's decors page, anything else (full URL, tel:, mailto:) is used as-is.
 */
export function resolveTarget(target: string, lang: Locale): string {
  if (!target) return href("home", lang);
  const [path, query] = target.split("?");
  const suffix = query ? `?${query}` : "";
  if (isRoute(path)) return href(path, lang) + suffix;
  const [route, ...rest] = path.split("/");
  if (isRoute(route) && rest.length) return href(route, lang, rest.join("/")) + suffix;
  return target;
}

export const linkHref = (link: LinkValue | undefined, lang: Locale) => resolveTarget(link?.target ?? "", lang);

export const isExternal = (url: string) => /^https?:\/\//.test(url);

/** Label of a main-menu link (e.g. "Paketlər") — reused for breadcrumbs. */
export const navLabel = (menu: { nav: { link: LinkValue }[] } | undefined, target: string, lang: Locale) =>
  tx(menu?.nav.find((n) => n.link.target === target)?.link.label, lang);
