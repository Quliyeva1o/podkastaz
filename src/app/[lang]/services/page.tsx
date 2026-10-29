import type { Metadata } from "next";
import { PageSections } from "@/sections/render";
import type { Locale } from "@/i18n/config";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/services">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("services", lang as Locale);
}

export default async function ServicesPage({ params }: PageProps<"/[lang]/services">) {
  const { lang } = await params;
  return <PageSections route="services" lang={lang as Locale} />;
}
