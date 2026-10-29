import type { MetadataRoute } from "next";
import { htmlLang, locales, type Localized } from "@/i18n/config";
import { alternates, href, staticRoutes, type RouteKey } from "@/i18n/routes";
import { siteUrl } from "@/lib/seo";
import { listStudios } from "@/lib/studios/queries";

const entries = (urls: Localized, extra: Partial<MetadataRoute.Sitemap[number]>): MetadataRoute.Sitemap => {
  const languages = Object.fromEntries(locales.map((l) => [htmlLang[l], siteUrl + urls[l]]));
  return locales.map((l) => ({ url: siteUrl + urls[l], alternates: { languages }, ...extra }));
};

/** Every page and every studio's decors page in every language, each listing its translations (hreflang). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = (Object.keys(staticRoutes) as RouteKey[]).flatMap((route) =>
    entries(alternates(route), {
      changeFrequency: "monthly",
      priority: route === "home" ? 1 : route === "terms" || route === "privacy" ? 0.3 : 0.8,
    }),
  );

  const studios = (await listStudios()).flatMap((s) =>
    entries(Object.fromEntries(locales.map((l) => [l, href("studios", l, s.slugAz)])) as Localized, {
      lastModified: s.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  return [...pages, ...studios];
}
