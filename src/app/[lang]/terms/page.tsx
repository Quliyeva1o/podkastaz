import type { Metadata } from "next";
import { PageSections } from "@/sections/render";
import type { Locale } from "@/i18n/config";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("terms", lang as Locale);
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  return <PageSections route="terms" lang={lang as Locale} />;
}
