import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { href } from "@/i18n/routes";
import { getMediaItems, getPageContent } from "@/lib/content/queries";
import { itemMetadata } from "@/lib/seo";
import { place } from "@/lib/page-graph";
import type { StudioContent } from "@/lib/studios/fields";
import { getStudioBySlug, listStudios } from "@/lib/studios/queries";
import { tx } from "@/sections/helpers";
import { SiteFrame, Sections } from "@/sections/render";
import type { PageHeaderData } from "@/sections/types";

export async function generateStaticParams() {
  const items = await listStudios();
  // Cache Components needs at least one entry; "_" simply 404s.
  return items.length ? items.map((s) => ({ slug: s.slugAz })) : [{ slug: "_" }];
}

async function load(lang: Locale, slug: string) {
  if (!locales.includes(lang)) return null;
  return getStudioBySlug(decodeURIComponent(slug));
}

/** The decors template's title ("Dekorlar"), shown after the studio name in the breadcrumb. */
async function decorsTitle(lang: Locale) {
  const header = (await getPageContent("decors")).sections.find((s) => s.type === "pageHeader")?.data as PageHeaderData | undefined;
  return tx(header?.crumb, lang) || tx(header?.title, lang) || "Dekorlar";
}

export async function generateMetadata({ params }: PageProps<"/[lang]/studios/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const found = await load(lang as Locale, slug);
  if (!found) return {};
  const l = lang as Locale;
  const seo = found.studio.content as StudioContent;
  const coverId = found.studio.cover ?? found.decors[0]?.cover;
  const cover = coverId ? (await getMediaItems([coverId]))[coverId] : undefined;
  return itemMetadata("studios", l, {
    cover,
    slugs: { az: found.studio.slugAz },
    title: tx(seo.seoTitle, l) || `${tx(found.studio.name, l)} — ${await decorsTitle(l)}`,
    // Fallback: "Studiya 1 (Bakı) podcast studiyası: Həkimlər üçün, Marketoloqlar üçün … dekorları. Onlayn rezervasiya."
    description:
      tx(seo.seoDescription, l) ||
      tx(found.studio.description, l) ||
      `${tx(found.studio.name, l)}${tx(found.studio.address, l) ? ` (${tx(found.studio.address, l)})` : ""} podcast studiyası: ${found.decors
        .map((d) => tx(d.shortName, l) || tx(d.name, l))
        .join(", ")} dekorları. Dekoru seçin və onlayn rezervasiya edin.`,
  });
}

/** One studio's decors (Figma "Dekorlar"): breadcrumb Ana səhifə > Studiya 1 > Dekorlar. */
export default async function StudioDecorsPage({ params }: PageProps<"/[lang]/studios/[slug]">) {
  const { lang: raw, slug } = await params;
  const lang = raw as Locale;
  const found = await load(lang, slug);
  if (!found) notFound();
  const path = href("studios", lang, found.studio.slugAz);
  const media = await getMediaItems([found.studio.cover, ...found.decors.map((d) => d.cover)].filter((id): id is string => Boolean(id)));

  return (
    <SiteFrame
      route="studios"
      lang={lang}
      graph={[place(found, lang, media)]}
      trail={[
        { name: tx(found.studio.name, lang), path: href("studios", lang) },
        { name: await decorsTitle(lang), path },
      ]}
    >
      <Sections page="decors" lang={lang} studio={found} />
    </SiteFrame>
  );
}
