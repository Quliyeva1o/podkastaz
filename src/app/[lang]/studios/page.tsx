import type { Metadata } from "next";
import { PageSections } from "@/sections/render";
import type { Locale } from "@/i18n/config";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/studios">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("studios", lang as Locale);
}

export default async function StudiosPage({ params }: PageProps<"/[lang]/studios">) {
  const { lang } = await params;
  return <PageSections route="studios" lang={lang as Locale} />;
}
