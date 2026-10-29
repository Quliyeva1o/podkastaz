import { Suspense } from "react";
import { listPublished } from "@/collections/queries";
import type { AddonData, PackageData } from "@/collections/registry";
import {
  PackageRequestForm,
  PackageRequestFromParams,
  type PackageRequestLabels,
} from "@/components/site/package-request-form";
import { href } from "@/i18n/routes";
import { tx } from "../helpers";
import type { PackageRequestFormData, SectionProps } from "../types";

const labelKeys = [
  "detailsTitle", "addonsTitle", "totalLabel", "currency", "customSuffix",
  "personalTitle", "firstName", "firstNamePlaceholder", "lastName", "lastNamePlaceholder",
  "phone", "phonePlaceholder", "email", "emailPlaceholder",
  "consentAccuracy", "consentTerms", "submit",
  "successTitle", "successText", "successButton",
  "errorInvalid", "errorRate", "errorServer",
] as const;

/** Paketə qoşul: packages and add-ons from the collections, handed to the client form. */
export async function PackageRequestSection({ data, lang }: SectionProps<PackageRequestFormData>) {
  const [packages, addons] = await Promise.all([listPublished<PackageData>("packages"), listPublished<AddonData>("addons")]);
  const props = {
    packages: packages.map((p) => ({ slug: p.slugs[lang], name: tx(p.data.title, lang), price: Number(p.data.price) || 0 })),
    addons: addons.map((a) => ({
      id: a.id,
      name: tx(a.data.title, lang),
      price: /^\d{1,6}$/.test(a.data.price.trim()) ? Number(a.data.price) : null,
      customLabel: tx(a.data.customPriceLabel, lang),
    })),
    labels: Object.fromEntries(labelKeys.map((k) => [k, tx(data[k], lang)])) as PackageRequestLabels,
    lang,
    links: { home: href("home", lang), privacy: href("privacy", lang), terms: href("terms", lang) },
    turnstileKey: process.env.TURNSTILE_SITE_KEY,
  };
  return (
    <section data-section="packageRequest" className="container-page px-4 pt-[1.6875rem] desktop:px-15 desktop:pt-15">
      <Suspense fallback={<PackageRequestForm {...props} />}>
        <PackageRequestFromParams {...props} />
      </Suspense>
    </section>
  );
}
