import type { WeekHours } from "@/db/schema";
import type { Localized } from "@/i18n/config";
import { image, imageOrVideo, list, text, type Field, type ImageRef } from "@/sections/fields";

/**
 * Studios and decors are own tables (bookings reference them), but the admin edits them with
 * the same field editor as sections: these descriptors map the columns to editor data and back.
 */
export const studioFields: Field[] = [
  text("title", "Ad (Studiya 1)"),
  text("address", "Ünvan (rezervasiya kartında: “Bakı”, “Əhməd Rəcəbli”)"),
  text("description", "Qısa mətn (Studiyalar səhifəsi)", true),
  imageOrVideo("cover", "Böyük şəkil (Studiyalar səhifəsi)"),
  text("seoTitle", "Dekorlar səhifəsi: SEO title (boşdursa “Studiya 1 — Dekorlar”)"),
  text("seoDescription", "Dekorlar səhifəsi: SEO description", true),
];

export const decorFields: Field[] = [
  text("title", "Ad (Həkimlər üçün dekor)"),
  text("shortName", "Qısa ad — rezervasiya kartında (Həkimlər üçün)"),
  text("description", "Təsvir", true),
  image("cover", "Örtük (Studiyalar səhifəsində dar şəkil, rezervasiyada kiçik şəkil)"),
  list("gallery", "Qalereya (dekor səhifəsi, 8 şəkil)", "Şəkil", [image("image", "Şəkil")]),
];

type L = Localized;
export type StudioEditorData = { title: L; address: L; description: L; cover: ImageRef; seoTitle: L; seoDescription: L };
export type DecorEditorData = { title: L; shortName: L; description: L; cover: ImageRef; gallery: { image: ImageRef }[] };

/** SEO of a studio's decors page, kept in `studios.content`. */
export type StudioContent = { seoTitle?: L; seoDescription?: L };

const empty = { az: "" } as L;

export function studioToEditor(s: { name: L; address: L; description: L; cover: string | null; content: Record<string, unknown> }): StudioEditorData {
  const c = s.content as StudioContent;
  return {
    title: s.name,
    address: s.address,
    description: s.description,
    cover: s.cover,
    seoTitle: c.seoTitle ?? empty,
    seoDescription: c.seoDescription ?? empty,
  };
}

export function editorToStudio(d: StudioEditorData) {
  return {
    name: d.title,
    address: d.address,
    description: d.description,
    cover: d.cover,
    content: { seoTitle: d.seoTitle, seoDescription: d.seoDescription } satisfies StudioContent,
  };
}

export function decorToEditor(d: { name: L; shortName: L; description: L; cover: string | null; gallery: string[] }): DecorEditorData {
  return { title: d.name, shortName: d.shortName, description: d.description, cover: d.cover, gallery: d.gallery.map((image) => ({ image })) };
}

export function editorToDecor(d: DecorEditorData) {
  return {
    name: d.title,
    shortName: d.shortName,
    description: d.description,
    cover: d.cover,
    gallery: d.gallery.map((g) => g.image).filter((id): id is string => Boolean(id)),
  };
}

export const weekdays = ["Bazar ertəsi", "Çərşənbə axşamı", "Çərşənbə", "Cümə axşamı", "Cümə", "Şənbə", "Bazar"];

/** Default opening hours of a new studio (to be confirmed by the client, PLAN.md §17.5). */
export const defaultHours: WeekHours = Array.from({ length: 7 }, () => ({ open: "10:00", close: "22:00" }));

const time = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Reads `hours.<day>.open|close|closed` inputs; returns an error text for a bad row. */
export function parseHours(form: FormData): WeekHours | string {
  const out: WeekHours = [];
  for (let day = 0; day < 7; day++) {
    if (form.get(`hours.${day}.closed`) === "on") {
      out.push(null);
      continue;
    }
    const open = String(form.get(`hours.${day}.open`) ?? "");
    // "24:00" = until midnight.
    const close = String(form.get(`hours.${day}.close`) ?? "").replace(/^00:00$/, "24:00");
    if (!time.test(open) || !(time.test(close) || close === "24:00") || close <= open) {
      return `${weekdays[day]}: iş saatı yanlışdır (məs. 10:00 – 22:00)`;
    }
    out.push({ open, close });
  }
  return out;
}

/** Booking rules form fields (minutes), with limits. */
export const bookingRuleFields = [
  { name: "stepMin", label: "Vaxt addımı (dəq)", min: 5, max: 120 },
  { name: "minDurationMin", label: "Minimum müddət (dəq)", min: 15, max: 1440 },
  { name: "maxDurationMin", label: "Maksimum müddət (dəq)", min: 15, max: 1440 },
  { name: "bufferMin", label: "Rezervasiyalar arası bufer (dəq)", min: 0, max: 240 },
  { name: "horizonDays", label: "Neçə gün qabaqcadan (gün)", min: 1, max: 365 },
  { name: "leadTimeMin", label: "Ən az qabaqcadan (dəq)", min: 0, max: 10080 },
] as const;

export type BookingRules = Record<(typeof bookingRuleFields)[number]["name"], number>;

export function parseRules(form: FormData): BookingRules | string {
  const out = {} as BookingRules;
  for (const f of bookingRuleFields) {
    const n = Number(form.get(`rules.${f.name}`));
    if (!Number.isInteger(n) || n < f.min || n > f.max) return `${f.label}: ${f.min}–${f.max} arası tam ədəd olmalıdır`;
    out[f.name] = n;
  }
  if (out.maxDurationMin < out.minDurationMin) return "Maksimum müddət minimumdan az ola bilməz";
  if (out.minDurationMin % out.stepMin || out.maxDurationMin % out.stepMin) return "Müddətlər vaxt addımına bölünməlidir";
  return out;
}
