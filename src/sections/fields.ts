import { z } from "zod";
import { locales, type Localized } from "@/i18n/config";
import { staticRoutes } from "@/i18n/routes";

/**
 * Field descriptors. One description per section drives three things:
 * the zod schema used on save, the empty default value, and the admin form.
 */
export type Field =
  | { kind: "text"; name: string; label: string; multiline?: boolean }
  | { kind: "plain"; name: string; label: string; hint?: string }
  | { kind: "image"; name: string; label: string }
  | { kind: "video"; name: string; label: string }
  /** Image or video from the media library (a cover that may also be a looping clip). */
  | { kind: "media"; name: string; label: string }
  | { kind: "link"; name: string; label: string }
  | { kind: "list"; name: string; label: string; itemLabel: string; fields: Field[] }
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | { kind: "toggle"; name: string; label: string };

/** Media id (uuid) of an uploaded image, or null when not set yet. */
export type ImageRef = string | null;

/** `target` is a page key (`about`), a page key with a query (`booking?studiya=…`) or a full URL. */
export type LinkValue = { label: Localized; target: string };

export const linkTargets = Object.keys(staticRoutes);

const localizedSchema = z.object(
  Object.fromEntries(locales.map((l) => [l, z.string().max(20_000)])) as Record<
    (typeof locales)[number],
    z.ZodString
  >,
);

export function fieldSchema(field: Field): z.ZodType {
  switch (field.kind) {
    case "text":
      return localizedSchema;
    case "plain":
      return z.string().max(2_000);
    case "image":
    case "video":
    case "media":
      return z.uuid().nullable();
    case "link":
      return z.object({ label: localizedSchema, target: z.string().max(2_000) });
    case "list":
      return z.array(objectSchema(field.fields)).max(100);
    case "select":
      return z.enum(field.options.map((o) => o.value) as [string, ...string[]]);
    case "toggle":
      return z.boolean();
  }
}

export function objectSchema(fields: Field[]) {
  return z.object(Object.fromEntries(fields.map((f) => [f.name, fieldSchema(f)])));
}

export const emptyLocalized = (): Localized =>
  Object.fromEntries(locales.map((l) => [l, ""])) as Localized;

export function emptyValue(field: Field): unknown {
  switch (field.kind) {
    case "text":
      return emptyLocalized();
    case "plain":
      return "";
    case "image":
    case "video":
    case "media":
      return null;
    case "link":
      return { label: emptyLocalized(), target: "" };
    case "list":
      return [];
    case "select":
      return field.options[0]?.value ?? "";
    case "toggle":
      return false;
  }
}

export function emptyObject(fields: Field[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => [f.name, emptyValue(f)]));
}

/**
 * Fills fields missing from stored data (e.g. a field added to a section after its content
 * was created) with empty values, so the admin form shows them and saving validates.
 */
export function withDefaults(fields: Field[], data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(data ?? {}) };
  for (const f of fields) {
    if (out[f.name] === undefined) out[f.name] = emptyValue(f);
    else if (f.kind === "list" && Array.isArray(out[f.name])) {
      out[f.name] = (out[f.name] as Record<string, unknown>[]).map((item) => withDefaults(f.fields, item));
    }
  }
  return out;
}

/** Collects every media id (images and videos) referenced anywhere in a section's data. */
export function collectImageIds(fields: Field[], data: Record<string, unknown>, out = new Set<string>()) {
  for (const f of fields) {
    const v = data?.[f.name];
    if ((f.kind === "image" || f.kind === "video" || f.kind === "media") && typeof v === "string") out.add(v);
    if (f.kind === "list" && Array.isArray(v)) {
      for (const item of v) collectImageIds(f.fields, item as Record<string, unknown>, out);
    }
  }
  return out;
}

// Small helpers so section definitions read like the Figma layer list.
export const text = (name: string, label: string, multiline = false): Field => ({
  kind: "text",
  name,
  label,
  multiline,
});
export const plain = (name: string, label: string, hint?: string): Field => ({
  kind: "plain",
  name,
  label,
  hint,
});
export const image = (name: string, label: string): Field => ({ kind: "image", name, label });
export const video = (name: string, label: string): Field => ({ kind: "video", name, label });
export const imageOrVideo = (name: string, label: string): Field => ({ kind: "media", name, label });
export const link = (name: string, label: string): Field => ({ kind: "link", name, label });
export const select = (name: string, label: string, options: { value: string; label: string }[]): Field => ({
  kind: "select",
  name,
  label,
  options,
});
export const toggle = (name: string, label: string): Field => ({ kind: "toggle", name, label });
export const list = (name: string, label: string, itemLabel: string, fields: Field[]): Field => ({
  kind: "list",
  name,
  label,
  itemLabel,
  fields,
});
