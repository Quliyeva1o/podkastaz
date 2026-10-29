import type { Localized } from "@/i18n/config";
import type { RouteKey } from "@/i18n/routes";
import { image, imageOrVideo, list, plain, select, text, toggle, type Field, type ImageRef } from "@/sections/fields";

/**
 * Collections: lists the admin adds to, removes from and reorders. Every item has a `title`
 * (list column, slug source) and may have a `cover` (list thumbnail). Studios and decors are
 * separate tables (bookings reference them), see src/db/schema.ts.
 */
export type CollectionDefinition = {
  name: string;
  label: string;
  itemLabel: string;
  /** Pages that show the items (their cache is refreshed on every edit). */
  routes: RouteKey[];
  fields: Field[];
  /** Extra check on save; returns an error text. */
  validate?: (data: Record<string, unknown>) => string | null;
};

const price = (required: boolean) => (data: Record<string, unknown>) => {
  const v = String(data.price ?? "").trim();
  if (!v) return required ? "Qiymət boş ola bilməz" : null;
  return /^\d{1,6}$/.test(v) ? null : "Qiymət tam ədəd olmalıdır (AZN, məs. 99)";
};

export const collections = {
  services: {
    name: "services",
    label: "Xidmətlər",
    itemLabel: "Xidmət",
    routes: ["services", "contact"],
    fields: [
      text("title", "Ad"),
      text("description", "Qısa təsvir", true),
      image("cover", "İllüstrasiya"),
      list("includes", "Daxildir", "Bənd", [text("text", "Mətn")]),
    ],
  },
  packages: {
    name: "packages",
    label: "Paketlər",
    itemLabel: "Paket",
    routes: ["packages", "packageRequest"],
    validate: price(true),
    fields: [
      text("title", "Ad (START, PRO…)"),
      text("audience", "Kimin üçün"),
      plain("price", "Qiymət (AZN)", "99"),
      toggle("highlighted", "“Ən çox seçilən” lenti"),
      list("features", "Daxil olanlar", "Bənd", [text("text", "Mətn")]),
    ],
  },
  addons: {
    name: "addons",
    label: "Add-on xidmətlər",
    itemLabel: "Add-on",
    routes: ["packages", "packageRequest"],
    validate: price(false),
    fields: [
      text("title", "Ad"),
      plain("price", "Qiymət (AZN) — boşdursa “fərdi qiymət”", "40"),
      text("customPriceLabel", "Fərdi qiymət mətni (qiymət boşdursa)"),
    ],
  },
  works: {
    name: "works",
    label: "İşlərimiz",
    itemLabel: "İş",
    routes: ["works", "worksVideos"],
    fields: [
      text("title", "Başlıq (şəklin alt mətni boşdursa bu istifadə olunur)"),
      select("kind", "Harada göstərilsin", [
        { value: "photo", label: "Şəkillər tab-ı" },
        { value: "video", label: "Videolar tab-ı" },
      ]),
      imageOrVideo("cover", "Şəkil (videolar üçün örtük) və ya mp4 video"),
      plain("youtube", "YouTube linki (Videolar tab-ı: play düyməsi bunu açır)"),
    ],
  },
  partners: {
    name: "partners",
    label: "Tərəfdaşlar",
    itemLabel: "Tərəfdaş",
    routes: ["about"],
    fields: [text("title", "Şirkət adı"), image("cover", "Loqo"), plain("url", "Sayt (istəyə bağlı)")],
  },
} as const satisfies Record<string, CollectionDefinition>;

export type CollectionName = keyof typeof collections;
export const isCollectionName = (v: string): v is CollectionName => v in collections;

/** Cache tag for every read of a collection. */
export const collectionTag = (name: CollectionName) => `collection:${name}`;

type L = Localized;
export type ServiceData = { title: L; description: L; cover: ImageRef; includes: { text: L }[] };
export type PackageData = { title: L; audience: L; price: string; highlighted: boolean; features: { text: L }[] };
export type AddonData = { title: L; price: string; customPriceLabel: L };
export type WorkData = { title: L; kind: "photo" | "video"; cover: ImageRef; youtube: string };
export type PartnerData = { title: L; cover: ImageRef; url: string };
