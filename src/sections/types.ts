import type { Locale, Localized } from "@/i18n/config";
import type { MediaItem } from "@/lib/content/queries";
import type { ImageRef, LinkValue } from "./fields";

/** Props every section component receives. */
export type SectionProps<T> = {
  data: T;
  lang: Locale;
  media: Record<string, MediaItem>;
};

type L = Localized;
type Img = ImageRef;

export const socialNetworks = ["facebook", "linkedin", "instagram", "youtube", "whatsapp", "x"] as const;
export type SocialNetwork = (typeof socialNetworks)[number];

export type HeaderData = { logo: Img; logoDark: Img; homeLabel: L };
export type MenuData = {
  nav: { link: LinkValue }[];
  bookingTitle: L;
  bookingText: L;
  bookingLink: LinkValue;
  bookingBackground: Img;
  contactTitle: L;
  contactText: L;
  contactLink: LinkValue;
  privacy: LinkValue;
  terms: LinkValue;
};
export type ContactsData = {
  address: L;
  phone: string;
  email: string;
  socialTitle: L;
  socials: { network: SocialNetwork; url: string }[];
  copyright: L;
};
export type LabelsData = Record<"menuOpen" | "menuClose" | "breadcrumb" | "notFoundTitle" | "notFoundText" | "backHome", L>;
export type NotificationsData = { recipients: string; subject: L };
export type BusinessData = {
  legalName: string;
  phones: { value: string }[];
  street: L;
  city: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  priceRange: string;
  areaServed: string;
};

export type Align = "center" | "left";
export type PageHeaderData = {
  title: L;
  subtitle: L;
  cta: LinkValue;
  alignDesktop: Align;
  alignMobile: Align;
  crumb: L;
  headingSuffix: L;
};
export type HeroData = {
  background: Img;
  seoHeading: L;
  title: L;
  subtitle: L;
  primary: LinkValue;
  secondary: LinkValue;
};
export type LegalData = { blocks: { title: L; body: L }[] };
export type AboutIntroData = { image: Img; title: L; body: L };
export type PartnersData = { title: L; logoHeight: string };
export const advantageIcons = ["VideoCamera", "Alarm", "Rocket", "MapPinArea", "Microphone", "Headphones", "Star", "CheckCircle"] as const;
export type AdvantagesData = {
  title: L;
  background: Img;
  items: { icon: (typeof advantageIcons)[number]; title: L; text: L; accent: boolean }[];
};
export type ServiceListData = Record<string, never>;
export type StudioListData = { cta: L };
export type DecorListData = { cta: L };
export type PackageListData = { cta: L; highlightLabel: L; currency: L; addonsTitle: L };
export type WorksGalleryData = { photosLabel: L; videosLabel: L; playLabel: L; prevLabel: L; nextLabel: L; closeLabel: L };
export type ContactSectionData = {
  title: L;
  addressLabel: L;
  phoneLabel: L;
  emailLabel: L;
  firstName: L;
  firstNamePlaceholder: L;
  lastName: L;
  lastNamePlaceholder: L;
  phone: L;
  phonePlaceholder: L;
  email: L;
  emailPlaceholder: L;
  subject: L;
  subjectPlaceholder: L;
  message: L;
  messagePlaceholder: L;
  submit: L;
  success: L;
  error: L;
  rateLimit: L;
};
/** Customer emails per booking status; {ad} {studiya} {dekor} {tarix} {saat} are replaced. */
export type BookingEmailsData = Record<
  | "adminSubject"
  | "newSubject" | "newBody"
  | "confirmedSubject" | "confirmedBody"
  | "rejectedSubject" | "rejectedBody"
  | "cancelledSubject" | "cancelledBody",
  L
>;
export type BookingFormData = Record<
  | "detailsTitle" | "studioLabel" | "decorLabel" | "otherTitle" | "otherText" | "otherRequest" | "otherRequestPlaceholder"
  | "dateTimeTitle" | "dateLabel" | "datePlaceholder" | "startLabel" | "endLabel" | "timePlaceholder"
  | "calendarToday" | "calendarTaken" | "calendarSelected" | "months" | "weekdays" | "prevMonth" | "nextMonth" | "hourLabel" | "minuteLabel" | "confirmTime"
  | "closedDay" | "noSlots" | "chooseStudioFirst" | "chooseDateFirst"
  | "personalTitle" | "firstName" | "firstNamePlaceholder" | "lastName" | "lastNamePlaceholder"
  | "phone" | "phonePlaceholder" | "email" | "emailPlaceholder"
  | "consentAccuracy" | "consentTerms" | "submit"
  | "successTitle" | "successText" | "successButton"
  | "errorTaken" | "errorInvalid" | "errorRate" | "errorServer",
  L
> & { breadcrumbStudios: L; breadcrumbDecors: L };
/** Package request emails; {ad} {paket} {məbləğ} are replaced. */
export type RequestEmailsData = Record<"adminSubject" | "customerSubject" | "customerBody", L>;
export type PackageRequestFormData = Record<
  | "detailsTitle" | "addonsTitle" | "totalLabel" | "currency" | "customSuffix"
  | "personalTitle" | "firstName" | "firstNamePlaceholder" | "lastName" | "lastNamePlaceholder"
  | "phone" | "phonePlaceholder" | "email" | "emailPlaceholder"
  | "consentAccuracy" | "consentTerms" | "submit"
  | "successTitle" | "successText" | "successButton"
  | "errorInvalid" | "errorRate" | "errorServer",
  L
>;
