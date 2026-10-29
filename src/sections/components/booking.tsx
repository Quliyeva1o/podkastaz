import { Suspense } from "react";
import { Picture } from "@/components/picture";
import { BookingForm, type BookingLabels, type BookingStudio } from "@/components/site/booking-form";
import { BookingFormFromParams } from "@/components/site/booking-params";
import { href } from "@/i18n/routes";
import { getMediaItems } from "@/lib/content/queries";
import { getStudioBySlug, listStudios } from "@/lib/studios/queries";
import { tx } from "../helpers";
import type { BookingFormData, SectionProps } from "../types";

const labelKeys = [
  "detailsTitle", "studioLabel", "decorLabel", "otherTitle", "otherText", "otherRequest", "otherRequestPlaceholder",
  "dateTimeTitle", "dateLabel", "datePlaceholder", "startLabel", "endLabel", "timePlaceholder",
  "closedDay", "noSlots", "chooseStudioFirst", "chooseDateFirst",
  "personalTitle", "firstName", "firstNamePlaceholder", "lastName", "lastNamePlaceholder",
  "phone", "phonePlaceholder", "email", "emailPlaceholder",
  "consentAccuracy", "consentTerms", "submit",
  "successTitle", "successText", "successButton",
  "errorTaken", "errorInvalid", "errorRate", "errorServer",
] as const;

/** Rezervasiya et: the studios with their active decors, handed to the client form. */
export async function BookingSection({ data, lang }: SectionProps<BookingFormData>) {
  const list = (await Promise.all((await listStudios()).map((s) => getStudioBySlug(s.slugAz)))).filter((s) => s !== null);
  const media = await getMediaItems(list.flatMap((s) => s.decors.map((d) => d.cover)).filter((id): id is string => Boolean(id)));
  const studios: BookingStudio[] = list.map(({ studio, decors }) => ({
    slug: studio.slugAz,
    name: tx(studio.name, lang),
    address: tx(studio.address, lang),
    decors: decors.map((d) => ({
      slug: d.slugAz,
      name: tx(d.shortName, lang) || tx(d.name, lang),
      thumb: media[d.cover ?? ""] && (
        <Picture media={media[d.cover!]} lang={lang} sizes="60px" alt="" className="absolute inset-0 size-full object-cover" />
      ),
    })),
  }));
  const labels = Object.fromEntries(labelKeys.map((k) => [k, tx(data[k], lang)])) as BookingLabels;
  const props = {
    studios,
    labels,
    lang,
    links: { home: href("home", lang), privacy: href("privacy", lang), terms: href("terms", lang) },
    turnstileKey: process.env.TURNSTILE_SITE_KEY,
  };

  return (
    <section data-section="booking" className="container-page px-4 pt-10 desktop:px-15 desktop:pt-15">
      <Suspense fallback={<BookingForm {...props} initial={{}} />}>
        <BookingFormFromParams {...props} />
      </Suspense>
    </section>
  );
}
