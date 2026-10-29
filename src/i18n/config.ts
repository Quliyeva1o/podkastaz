/**
 * Figma is Azerbaijani only, so the site starts with one language. Everything is still
 * stored per language (`Localized`): adding "en"/"ru" here makes TypeScript point at every
 * place that needs a translation (routes, slugs, OG locale) — nothing else changes.
 */
export const locales = ["az"] as const;
export type Locale = (typeof locales)[number];

/** AZ is served without a URL prefix (`/`); other languages would live under `/en`, `/ru`. */
export const defaultLocale: Locale = "az";

/** A value stored once per language — every admin-editable text uses this shape. */
export type Localized<T = string> = Record<Locale, T>;

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** `hreflang` / `<html lang>` values. */
export const htmlLang: Record<Locale, string> = { az: "az" };
