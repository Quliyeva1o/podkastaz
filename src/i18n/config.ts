/**
 * Azerbaijani (Figma) + English. Everything is stored per language (`Localized`): adding a
 * language here makes TypeScript point at every place that needs it (routes, OG locale, labels).
 */
export const locales = ["az", "en"] as const;
export type Locale = (typeof locales)[number];

/** AZ is served without a URL prefix (`/`); other languages live under `/en`. */
export const defaultLocale: Locale = "az";

/**
 * A value stored once per language — every admin-editable text uses this shape. Azerbaijani is
 * always there; a missing translation falls back to it (`tx`), so content saved before English
 * existed stays valid.
 */
export type Localized<T = string> = { az: T } & { [L in Locale]?: T };

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** `hreflang` / `<html lang>` values. */
export const htmlLang: Record<Locale, string> = { az: "az", en: "en" };

/** Language names for the switcher, each in its own language. */
export const localeNames: Record<Locale, string> = { az: "AZ", en: "EN" };
