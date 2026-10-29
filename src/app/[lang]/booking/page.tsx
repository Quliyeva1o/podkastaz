import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb } from "@/components/site/breadcrumb";
import { BookingBreadcrumb } from "@/components/site/booking-params";
import type { Locale } from "@/i18n/config";
import { href } from "@/i18n/routes";
import { getPageContent } from "@/lib/content/queries";
import { staticPageMetadata } from "@/lib/seo";
import { navLabel, tx } from "@/sections/helpers";
import { loadGlobal, Sections, SiteFrame } from "@/sections/render";
import type { BookingFormData } from "@/sections/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/booking">): Promise<Metadata> {
  const { lang } = await params;
  return staticPageMetadata("booking", lang as Locale);
}

export default async function BookingPage({ params }: PageProps<"/[lang]/booking">) {
  const lang = (await params).lang as Locale;
  const form = (await getPageContent("booking")).sections.find((s) => s.type === "bookingForm")?.data as BookingFormData | undefined;
  const { menu } = await loadGlobal();
  const studios = { name: tx(form?.breadcrumbStudios, lang) || navLabel(menu, "studios", lang), path: href("studios", lang) };
  return (
    <SiteFrame
      route="booking"
      lang={lang}
      breadcrumb={(crumbs, label) => (
        <Suspense fallback={<Breadcrumb items={crumbs} label={label} />}>
          <BookingBreadcrumb base={crumbs} studios={studios} decors={tx(form?.breadcrumbDecors, lang)} decorsPath={href("studios", lang)} label={label} />
        </Suspense>
      )}
    >
      <Sections page="booking" lang={lang} />
    </SiteFrame>
  );
}
