import type { Metadata } from "next";
import { PageSections } from "@/sections/render";
import type { Locale } from "@/i18n/config";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/packages">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("packages", lang as Locale);
}

export default async function PackagesPage({ params }: PageProps<"/[lang]/packages">) {
  const { lang } = await params;
  return <PageSections route="packages" lang={lang as Locale} />;
}
