import "server-only";
import { listPublished } from "@/collections/queries";
import type { AddonData, PackageData, ServiceData, WorkData } from "@/collections/registry";
import type { Locale } from "@/i18n/config";
import { href, type RouteKey } from "@/i18n/routes";
import { getMediaItems, type MediaItem } from "@/lib/content/queries";
import { coverUrl, siteName, siteUrl } from "@/lib/seo";
import { orgId } from "@/lib/structured-data";
import { getStudioBySlug, listStudios, type Decor, type Studio } from "@/lib/studios/queries";
import { youtubeId } from "@/lib/media/youtube";
import { tx } from "@/sections/helpers";

/**
 * schema.org nodes describing what a page is about, next to the organization, website and
 * breadcrumb graph every page has: services, the package offers (AZN), the studios as places,
 * the photo gallery and the videos. Built from the same collections the page shows.
 */

type Json = Record<string, unknown>;

const abs = (path?: string) => (path ? siteUrl + path : undefined);
const image = (m?: MediaItem) => abs(coverUrl(m));
const ids = (list: (string | null | undefined)[]) => list.filter((id): id is string => Boolean(id));

export async function pageGraph(route: RouteKey, lang: Locale): Promise<Json[]> {
  const url = siteUrl + href(route, lang);
  switch (route) {
    case "services": {
      const items = await listPublished<ServiceData>("services");
      const media = await getMediaItems(ids(items.map((i) => i.data.cover)));
      return [
        {
          "@type": "ItemList",
          "@id": `${url}#services`,
          name: "Xidmətlər",
          itemListElement: items.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Service",
              name: tx(s.data.title, lang),
              description: tx(s.data.description, lang) || undefined,
              serviceType: tx(s.data.title, lang),
              image: image(media[s.data.cover ?? ""]),
              provider: { "@id": orgId },
              areaServed: { "@type": "City", name: "Bakı" },
            },
          })),
        },
      ];
    }
    case "packages":
    case "packageRequest": {
      const [packages, addons] = await Promise.all([listPublished<PackageData>("packages"), listPublished<AddonData>("addons")]);
      const offer = (name: string, price: string, description?: string) => ({
        "@type": "Offer",
        name,
        description,
        ...(/^\d+$/.test(price.trim()) ? { price: Number(price), priceCurrency: "AZN" } : {}),
        url: siteUrl + href("packageRequest", lang),
        seller: { "@id": orgId },
        availability: "https://schema.org/InStock",
      });
      return [
        {
          "@type": "OfferCatalog",
          "@id": `${siteUrl}${href("packages", lang)}#offers`,
          name: `${siteName} — podcast paketləri`,
          itemListElement: [
            ...packages.map((p) =>
              offer(
                tx(p.data.title, lang),
                p.data.price,
                [tx(p.data.audience, lang), ...p.data.features.map((f) => tx(f.text, lang))].filter(Boolean).join(", "),
              ),
            ),
            ...addons.map((a) => offer(tx(a.data.title, lang), a.data.price)),
          ],
        },
      ];
    }
    case "studios": {
      const list = (await Promise.all((await listStudios()).map((s) => getStudioBySlug(s.slugAz)))).filter((s) => s !== null);
      const media = await getMediaItems(ids(list.flatMap((s) => [s.studio.cover, s.decors[0]?.cover])));
      return [
        {
          "@type": "ItemList",
          "@id": `${url}#studios`,
          name: "Studiyalar",
          itemListElement: list.map((s, i) => ({ "@type": "ListItem", position: i + 1, item: place(s, lang, media) })),
        },
      ];
    }
    case "works":
    case "worksVideos": {
      const videos = route === "worksVideos";
      const items = (await listPublished<WorkData>("works")).filter((w) => w.data.kind === (videos ? "video" : "photo"));
      const media = await getMediaItems(ids(items.map((w) => w.data.cover)));
      if (!videos) {
        return [
          {
            "@type": "ImageGallery",
            "@id": `${url}#gallery`,
            url,
            name: "İşlərimiz — şəkillər",
            image: items
              .filter((w) => media[w.data.cover ?? ""]?.mime.startsWith("image/"))
              .map((w) => {
                const m = media[w.data.cover!];
                return { "@type": "ImageObject", contentUrl: image(m), caption: tx(m.alt, lang) || tx(w.data.title, lang) };
              }),
          },
        ];
      }
      // A VideoObject needs a real video: only items with a YouTube link qualify.
      const withVideo = items.filter((w) => youtubeId(w.data.youtube));
      if (!withVideo.length) return [];
      return [
        {
          "@type": "ItemList",
          "@id": `${url}#videos`,
          itemListElement: withVideo.map((w, i) => {
            const id = youtubeId(w.data.youtube)!;
            return {
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "VideoObject",
                name: tx(w.data.title, lang),
                description: tx(w.data.title, lang),
                thumbnailUrl: image(media[w.data.cover ?? ""]) ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                uploadDate: w.publishedAt,
                embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
                contentUrl: `https://www.youtube.com/watch?v=${id}`,
                publisher: { "@id": orgId },
              },
            };
          }),
        },
      ];
    }
    case "contact":
      return [{ "@type": "ContactPage", "@id": `${url}#page`, url, name: "Əlaqə", about: { "@id": orgId } }];
    case "about":
      return [{ "@type": "AboutPage", "@id": `${url}#page`, url, name: "Haqqımızda", about: { "@id": orgId } }];
    default:
      return [];
  }
}

/** A studio as a place (its decors page is its URL; photos are the decors' covers). */
export function place(s: { studio: Studio; decors: Decor[] }, lang: Locale, media: Record<string, MediaItem>): Json {
  const url = siteUrl + href("studios", lang, s.studio.slugAz);
  return {
    "@type": "Place",
    "@id": `${url}#place`,
    name: `${siteName} — ${tx(s.studio.name, lang)}`,
    url,
    description: tx(s.studio.description, lang) || undefined,
    address: { "@type": "PostalAddress", streetAddress: tx(s.studio.address, lang) || undefined, addressLocality: "Bakı", addressCountry: "AZ" },
    photo: ids([s.studio.cover, ...s.decors.map((d) => d.cover)])
      .map((id) => image(media[id]))
      .filter(Boolean)
      .map((contentUrl) => ({ "@type": "ImageObject", contentUrl })),
  };
}
