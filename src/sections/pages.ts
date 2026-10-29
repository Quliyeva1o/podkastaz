import type { RouteKey } from "@/i18n/routes";
import type { SectionType } from "./registry";

/** `decors` = the template shared by every studio's decors page (/studiyalar/<slug>). */
export type PageKey = RouteKey | "global" | "decors";

export type SlotDefinition = {
  slot: string;
  type: SectionType;
  /** Slots with the same `shareKey` start out pointing at one shared content row. */
  shareKey?: string;
};

const header: SlotDefinition = { slot: "header", type: "pageHeader" };
const advantages: SlotDefinition = { slot: "advantages", type: "advantages", shareKey: "advantages" };
const gallery: SlotDefinition = { slot: "gallery", type: "worksGallery", shareKey: "works" };

/**
 * Figma page → section order. Used by the seed and to label pages in the admin.
 * `advantages` is shared by Haqqımızda and Xidmətlər, `gallery` by the two İşlərimiz tabs.
 */
export const pageLayouts: Record<PageKey, { label: string; slots: SlotDefinition[] }> = {
  global: {
    label: "Ümumi (Header / Menyu / Əlaqə)",
    slots: [
      { slot: "header", type: "header" },
      { slot: "menu", type: "menu" },
      { slot: "contacts", type: "contacts" },
      { slot: "labels", type: "labels" },
      { slot: "notifications", type: "notifications" },
      { slot: "bookingEmails", type: "bookingEmails" },
      { slot: "requestEmails", type: "requestEmails" },
      { slot: "business", type: "business" },
    ],
  },
  home: { label: "Ana səhifə", slots: [{ slot: "hero", type: "hero" }] },
  about: {
    label: "Haqqımızda",
    slots: [header, { slot: "intro", type: "aboutIntro" }, { slot: "partners", type: "partners" }, advantages],
  },
  services: { label: "Xidmətlər", slots: [header, { slot: "list", type: "serviceList" }, advantages] },
  studios: { label: "Studiyalar", slots: [header, { slot: "list", type: "studioList" }] },
  decors: { label: "Dekorlar (hər studiya)", slots: [header, { slot: "list", type: "decorList" }] },
  packages: { label: "Paketlər", slots: [header, { slot: "list", type: "packageList" }] },
  packageRequest: { label: "Paket müraciəti", slots: [header, { slot: "form", type: "packageRequestForm" }] },
  works: { label: "İşlərimiz — Şəkillər", slots: [header, gallery] },
  worksVideos: { label: "İşlərimiz — Videolar", slots: [header, gallery] },
  booking: { label: "Rezervasiya", slots: [header, { slot: "form", type: "bookingForm" }] },
  contact: { label: "Əlaqə", slots: [header, { slot: "contact", type: "contactSection" }] },
  terms: { label: "İstifadəçi qaydaları", slots: [header, { slot: "content", type: "legal" }] },
  privacy: { label: "Məxfilik siyasəti", slots: [header, { slot: "content", type: "legal" }] },
};

export const pageKeys = Object.keys(pageLayouts) as PageKey[];
export const isPageKey = (value: string): value is PageKey => value in pageLayouts;

/** Cache tag for everything rendered on one page. */
export const pageTag = (key: PageKey) => `page:${key}`;
export const mediaTag = "media";
