import type { Metadata } from "next";
import { PageSections } from "@/sections/render";
import type { Locale } from "@/i18n/config";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/works/videos">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("worksVideos", lang as Locale);
}

export default async function WorksVideosPage({ params }: PageProps<"/[lang]/works/videos">) {
  const { lang } = await params;
  return <PageSections route="worksVideos" lang={lang as Locale} />;
}
