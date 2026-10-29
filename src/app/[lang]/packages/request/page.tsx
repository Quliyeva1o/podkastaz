import type { Metadata } from "next";
import { PageSections } from "@/sections/render";
import type { Locale } from "@/i18n/config";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/packages/request">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("packageRequest", lang as Locale);
}

export default async function PackageRequestPage({ params }: PageProps<"/[lang]/packages/request">) {
  const { lang } = await params;
  return <PageSections route="packageRequest" lang={lang as Locale} />;
}
