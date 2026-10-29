import type { Metadata } from "next";
import { PageSections } from "@/sections/render";
import type { Locale } from "@/i18n/config";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("privacy", lang as Locale);
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  return <PageSections route="privacy" lang={lang as Locale} />;
}
