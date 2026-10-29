import type { Metadata } from "next";
import { PageSections } from "@/sections/render";
import type { Locale } from "@/i18n/config";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/works">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("works", lang as Locale);
}

export default async function WorksPage({ params }: PageProps<"/[lang]/works">) {
  const { lang } = await params;
  return <PageSections route="works" lang={lang as Locale} />;
}
