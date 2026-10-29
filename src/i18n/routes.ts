import { defaultLocale, hasLocale, locales, type Locale, type Localized } from "./config";

/**
 * Static pages from Figma. The key is the internal folder under `app/[lang]/`;
 * the localized path is what appears in the public URL (may have several segments).
 */
export const staticRoutes = {
  home: { az: "" },
  about: { az: "haqqimizda" },
  services: { az: "xidmetler" },
  studios: { az: "studiyalar" },
  packages: { az: "paketler" },
  packageRequest: { az: "paketler/muraciet" },
  works: { az: "islerimiz" },
  worksVideos: { az: "islerimiz/videolar" },
  booking: { az: "rezervasiya" },
  contact: { az: "elaqe" },
  terms: { az: "istifadeci-qaydalari" },
  privacy: { az: "mexfilik-siyaseti" },
} as const satisfies Record<string, Localized>;

/** Internal folder of each route under `app/[lang]/` (nested where the URL is nested). */
const internalPaths: Record<RouteKey, string> = {
  home: "",
  about: "about",
  services: "services",
  studios: "studios",
  packages: "packages",
  packageRequest: "packages/request",
  works: "works",
  worksVideos: "works/videos",
  booking: "booking",
  contact: "contact",
  terms: "terms",
  privacy: "privacy",
};

export type RouteKey = keyof typeof staticRoutes;

/** Public URL for a page (and optional item slug, e.g. a studio) in a language. */
export function href(route: RouteKey, locale: Locale, itemSlug?: string): string {
  const parts = [
    locale === defaultLocale ? "" : locale,
    staticRoutes[route][locale],
    itemSlug ?? "",
  ].filter(Boolean);
  return "/" + parts.join("/");
}

/** Public URLs of one page in every language — used for hreflang. */
export function alternates(route: RouteKey, itemSlugs?: Partial<Localized>): Localized {
  return Object.fromEntries(
    locales.map((l) => [l, href(route, l, itemSlugs?.[l])]),
  ) as Localized;
}

export type ResolvedPath =
  | { kind: "rewrite"; internal: string; route: RouteKey; rest: string[] }
  | { kind: "redirect"; to: string }
  | { kind: "notFound"; locale: Locale };

/** Routes whose URL may carry one more segment: the item slug (studio → its decors page). */
const withItem: RouteKey[] = ["studios"];

/**
 * Maps a public pathname to the internal `/[lang]/<folder>` path.
 * Only the localized path of the matching language is accepted, so every page
 * has exactly one URL per language (no duplicate content for SEO). The longest
 * matching route wins (`paketler/muraciet` before `paketler`).
 */
export function resolvePublicPath(pathname: string): ResolvedPath {
  const segments = pathname.split("/").filter(Boolean);
  let locale: Locale = defaultLocale;

  if (segments[0] && hasLocale(segments[0])) {
    if (segments[0] === defaultLocale) {
      return { kind: "redirect", to: "/" + segments.slice(1).join("/") };
    }
    locale = segments.shift() as Locale;
  }

  if (segments.length === 0) return { kind: "rewrite", internal: `/${locale}`, route: "home", rest: [] };

  const path = segments.join("/");
  const route = (Object.keys(staticRoutes) as RouteKey[])
    .filter((key) => key !== "home")
    .sort((a, b) => staticRoutes[b][locale].length - staticRoutes[a][locale].length)
    .find((key) => {
      const p = staticRoutes[key][locale];
      return path === p || (withItem.includes(key) && path.startsWith(p + "/"));
    });
  if (!route) return { kind: "notFound", locale };

  const rest = path.slice(staticRoutes[route][locale].length).split("/").filter(Boolean);
  if (rest.length > 1) return { kind: "notFound", locale };
  return { kind: "rewrite", internal: ["", locale, internalPaths[route], ...rest].join("/"), route, rest };
}
