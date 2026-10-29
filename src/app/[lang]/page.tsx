import type { Metadata } from "next";
import { PageSections } from "@/sections/render";
import type { Locale } from "@/i18n/config";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("home", lang as Locale);
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  return <PageSections route="home" lang={lang as Locale} />;
}
