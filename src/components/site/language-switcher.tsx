import Link from "next/link";
import { localeNames, type Locale } from "@/i18n/config";
import { cx } from "./ui";

/**
 * AZ / EN (Figma 214:929): the current language underlined, the others at half opacity.
 * Header cells are 40×36; the mobile menu's are 44×44 px, beside its close button.
 */
export function LanguageSwitcher({
  lang,
  languages,
  light,
  large,
  className,
}: {
  lang: Locale;
  /** The same page in every language. */
  languages: { lang: Locale; href: string }[];
  /** White text: over the home photo and in the black menu. */
  light?: boolean;
  large?: boolean;
  className?: string;
}) {
  // The menu's cells keep Figma's px on every phone width (44×44, 14/21 px), not the fluid rem.
  const cell = cx(
    "relative flex items-center justify-center font-medium",
    large ? "size-[44px] rounded-[6px] text-[14px] leading-[21px]" : "h-9 w-10 rounded-[0.375rem] text-14 leading-[1.5]",
  );
  const underline = large ? "inset-x-[12.39px] bottom-[3.13px]" : "inset-x-[0.774rem] bottom-[0.196rem]";
  return (
    <nav aria-label="Language" className={cx("flex items-center", className)}>
      {languages.map((l) =>
        l.lang === lang ? (
          <span key={l.lang} aria-current="true" className={cx(cell, light ? "text-white" : "text-neutral-950")}>
            {localeNames[l.lang]}
            <span aria-hidden className={cx("absolute h-px bg-current", underline)} />
          </span>
        ) : (
          <Link
            key={l.lang}
            href={l.href}
            hrefLang={l.lang}
            lang={l.lang}
            className={cx(cell, "opacity-50 transition-opacity hover:opacity-100", light ? "text-white" : "text-neutral-700")}
          >
            {localeNames[l.lang]}
          </Link>
        ),
      )}
    </nav>
  );
}
