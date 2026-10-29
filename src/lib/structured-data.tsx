import type { Locale } from "@/i18n/config";
import { siteName, siteUrl } from "@/lib/seo";
import { tx } from "@/sections/helpers";
import type { BusinessData, ContactsData } from "@/sections/types";

/**
 * schema.org JSON-LD. Google uses it for the knowledge panel, local results
 * (address, phones, hours) and breadcrumbs. Every fact comes from admin content
 * ("Əlaqə məlumatları" + "Şirkət məlumatları"), so it always matches the page.
 */

type Json = Record<string, unknown>;

export function JsonLd({ graph }: { graph: Json[] }) {
  // "<" escaped so admin text can never close the script tag.
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export const orgId = `${siteUrl}/#organization`;
const websiteId = `${siteUrl}/#website`;
const inLanguage: Record<Locale, string> = { az: "az-AZ" };
const weekdays = { Mo: "Monday", Tu: "Tuesday", We: "Wednesday", Th: "Thursday", Fr: "Friday", Sa: "Saturday", Su: "Sunday" };

/** "Mo-Fr 10:00-20:00" → OpeningHoursSpecification. */
function openingHours(value: string) {
  const m = /^(\w{2})(?:-(\w{2}))?\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(value.trim());
  if (!m) return undefined;
  const keys = Object.keys(weekdays) as (keyof typeof weekdays)[];
  const from = keys.indexOf(m[1] as keyof typeof weekdays);
  const to = m[2] ? keys.indexOf(m[2] as keyof typeof weekdays) : from;
  if (from < 0 || to < from) return undefined;
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: keys.slice(from, to + 1).map((k) => weekdays[k]),
    opens: m[3].padStart(5, "0"),
    closes: m[4].padStart(5, "0"),
  };
}

/** Organization (a local business: the studios in Baku) + WebSite: on every page. */
export function siteGraph(lang: Locale, contacts?: ContactsData, business?: BusinessData): Json[] {
  const phones = business?.phones.map((p) => p.value.trim()).filter(Boolean) ?? [];
  const lat = Number(business?.latitude);
  const lng = Number(business?.longitude);
  const organization: Json = {
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": orgId,
    name: siteName,
    legalName: business?.legalName || undefined,
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
    image: `${siteUrl}/icon.png`,
    email: contacts?.email || undefined,
    telephone: phones[0] || contacts?.phone || undefined,
    address: business && {
      "@type": "PostalAddress",
      streetAddress: tx(business.street, lang) || undefined,
      addressLocality: business.city || undefined,
      postalCode: business.postalCode || undefined,
      addressCountry: "AZ",
    },
    geo: lat && lng ? { "@type": "GeoCoordinates", latitude: lat, longitude: lng } : undefined,
    openingHoursSpecification: business?.openingHours ? openingHours(business.openingHours) : undefined,
    priceRange: business?.priceRange || undefined,
    areaServed: business?.areaServed.split(",").map((s) => s.trim()).filter(Boolean),
    contactPoint: phones.map((telephone) => ({
      "@type": "ContactPoint",
      telephone,
      contactType: "customer service",
      availableLanguage: ["az"],
    })),
    // Only real profile links (Figma placeholders like "https://facebook.com" are skipped).
    sameAs: contacts?.socials.map((s) => s.url).filter((u) => /^https?:\/\/[^/]+\/.+/.test(u)),
  };
  const website: Json = {
    "@type": "WebSite",
    "@id": websiteId,
    url: siteUrl,
    name: siteName,
    inLanguage: inLanguage[lang],
    publisher: { "@id": orgId },
  };
  return [organization, website];
}

/** Breadcrumb trail (Home → … → current page); paths are site-relative. */
export function breadcrumbGraph(items: { name: string; path: string }[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: siteUrl + item.path })),
  };
}

