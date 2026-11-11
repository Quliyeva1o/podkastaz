import Link from "next/link";
import { localeNames, type Locale } from "@/i18n/config";
import { href } from "@/i18n/routes";
import type { MediaItem } from "@/lib/content/queries";
import { linkHref, tx } from "@/sections/helpers";
import type { HeaderData, LabelsData, MenuData } from "@/sections/types";
import { Picture } from "../picture";
import { MenuIcon } from "./icons";
import { MenuOverlay } from "./menu-overlay";
import { cx } from "./ui";

export type HeaderTheme = "dark" | "light";

/**
 * Site header (Figma "Header" instance): logo left, menu button right, on every screen size
 * (the menu is an overlay on desktop too). `dark` floats over the home photo with the white
 * logo; `light` sits on the white inner pages with the dark logo.
 */
export function Header({
  data,
  menu,
  labels,
  lang,
  media,
  theme,
  activeTarget,
  languages,
}: {
  data: HeaderData;
  menu: MenuData;
  labels: LabelsData | undefined;
  lang: Locale;
  media: Record<string, MediaItem>;
  theme: HeaderTheme;
  /** Link target of the current page, marked in the menu. */
  activeTarget: string;
  /** The same page in every language (language switcher). */
  languages: { lang: Locale; href: string }[];
}) {
  const dark = theme === "dark";
  const logo = media[(dark ? data.logo : data.logoDark) ?? ""] ?? media[data.logo ?? ""];
  const siteName = "Podkast.az";

  return (
    <header className={cx("site-header z-30", dark ? "absolute inset-x-0 top-0" : "relative")}>
      {/* Over the full-bleed home hero the header runs edge to edge, in line with the hero's text and social buttons. */}
      <div className={cx("flex h-18 items-center justify-between px-4 desktop:h-25 desktop:px-15", dark ? "w-full" : "container-page")}>
        <Link
          href={href("home", lang)}
          aria-label={tx(logo?.alt, lang) || siteName}
          // On the home page the logo comes in from the left with the hero panel.
          style={dark ? ({ "--i": -1 } as React.CSSProperties) : undefined}
          className={cx("block w-[8.6rem] transition-opacity hover:opacity-80 desktop:w-[11.4375rem]", dark && "hero-in")}
        >
          {logo ? (
            // Home: fully white, as Figma's exposure filter makes the logo (the sound wave is orange in the file).
            <Picture media={logo} lang={lang} sizes="(min-width: 1024px) 12vw, 140px" priority alt="" className={cx("h-auto w-full", dark && "brightness-0 invert")} />
          ) : (
            <span className={cx("text-24 font-bold", dark ? "text-white" : "text-neutral-950")}>{siteName}</span>
          )}
        </Link>

        <div className="flex items-center gap-4 desktop:gap-6">
          {/* Language switcher (Figma 214:929): 40×36 cells; the current language underlined, the others at half opacity. */}
          <nav aria-label="Language" className={cx("flex items-center", dark && "hero-in")}>
            {languages.map((l) => {
              const cell = "relative flex h-9 w-10 items-center justify-center rounded-[0.375rem] text-14 leading-[1.5] font-medium";
              return l.lang === lang ? (
                <span key={l.lang} aria-current="true" className={cx(cell, dark ? "text-white" : "text-neutral-950")}>
                  {localeNames[l.lang]}
                  <span aria-hidden className="absolute inset-x-[0.774rem] bottom-[0.196rem] h-px bg-current" />
                </span>
              ) : (
                <Link
                  key={l.lang}
                  href={l.href}
                  hrefLang={l.lang}
                  lang={l.lang}
                  className={cx(cell, "opacity-50 transition-opacity hover:opacity-100", dark ? "text-white" : "text-neutral-700")}
                >
                  {localeNames[l.lang]}
                </Link>
              );
            })}
          </nav>

          <MenuOverlay
            openLabel={tx(labels?.menuOpen, lang) || (lang === "en" ? "Menu" : "Menyu")}
            closeLabel={tx(labels?.menuClose, lang) || (lang === "en" ? "Close" : "Bağla")}
            buttonClassName={dark ? "text-white" : "text-neutral-950"}
            icon={<MenuIcon className="size-10" />}
            current={activeTarget}
            fullWidth={dark}
            nav={menu.nav.map(({ link }) => ({ label: tx(link.label, lang), href: linkHref(link, lang), target: link.target }))}
            booking={{
              title: tx(menu.bookingTitle, lang),
              text: tx(menu.bookingText, lang),
              href: linkHref(menu.bookingLink, lang),
              background: media[menu.bookingBackground ?? ""] && (
                <Picture
                  media={media[menu.bookingBackground ?? ""]}
                  lang={lang}
                  sizes="(min-width: 1024px) 22vw, 100vw"
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ),
            }}
            contact={{ title: tx(menu.contactTitle, lang), text: tx(menu.contactText, lang), href: linkHref(menu.contactLink, lang) }}
            legal={[menu.privacy, menu.terms].map((l) => ({ label: tx(l.label, lang), href: linkHref(l, lang) }))}
          />
        </div>
      </div>
    </header>
  );
}
