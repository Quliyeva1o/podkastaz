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

/** Adds the closing call to action only while the description still fits a snippet (≤155). */
const withCta = (text: string, cta: string) => (text.length + cta.length + 1 <= 155 ? `${text} ${cta}` : text);

/** Fallback SEO texts of a studio page, e.g. "Studiya 1 — podkast studiyası və dekorlar". */
const seoText: Record<Locale, { title: (name: string) => string; description: (name: string, address: string, decors: string[]) => string }> = {
  az: {
    title: (name) => `${name} — podkast studiyası və dekorlar`,
    description: (name, address, decors) =>
      withCta(`${name}${address ? ` (${address})` : ""}: podkast (podcast) studiyası, dekorlar — ${decors.join(", ")}.`, "Onlayn rezervasiya edin."),
  },
  en: {
    title: (name) => `${name} — podcast studio and sets`,
    description: (name, address, decors) =>
      withCta(`${name}${address ? ` (${address})` : ""}: podcast studio, sets — ${decors.join(", ")}.`, "Book online."),
  },
};

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
    // Own title and description per studio (the short text is the same on every studio, so it is
    // not used here). The admin's SEO fields win when filled.
    title: tx(seo.seoTitle, l) || seoText[l].title(tx(found.studio.name, l)),
    description:
      tx(seo.seoDescription, l) ||
      seoText[l].description(
        tx(found.studio.name, l),
        tx(found.studio.address, l),
        found.decors.map((d) => tx(d.shortName, l) || tx(d.name, l)),
      ),
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
      itemSlug={found.studio.slugAz}
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
