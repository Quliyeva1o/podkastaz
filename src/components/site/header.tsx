import Link from "next/link";
import type { Locale } from "@/i18n/config";
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
}: {
  data: HeaderData;
  menu: MenuData;
  labels: LabelsData | undefined;
  lang: Locale;
  media: Record<string, MediaItem>;
  theme: HeaderTheme;
  /** Link target of the current page, marked in the menu. */
  activeTarget: string;
}) {
  const dark = theme === "dark";
  const logo = media[(dark ? data.logo : data.logoDark) ?? ""] ?? media[data.logo ?? ""];
  const siteName = "Podkast.az";

  return (
    <header className={cx("site-header z-30", dark ? "absolute inset-x-0 top-0" : "relative")}>
      <div className="container-page flex h-18 items-center justify-between px-4 desktop:h-25 desktop:px-15">
        <Link
          href={href("home", lang)}
          aria-label={tx(logo?.alt, lang) || siteName}
          // On the home page the logo comes in from the left with the hero panel.
          style={dark ? ({ "--i": -1 } as React.CSSProperties) : undefined}
          className={cx("block w-[8.6rem] transition-opacity hover:opacity-80 desktop:w-[11.4375rem]", dark && "hero-in")}
        >
          {logo ? (
            <Picture media={logo} lang={lang} sizes="(min-width: 1024px) 12vw, 140px" priority alt="" className="h-auto w-full" />
          ) : (
            <span className={cx("text-24 font-bold", dark ? "text-white" : "text-neutral-950")}>{siteName}</span>
          )}
        </Link>

        <MenuOverlay
          openLabel={tx(labels?.menuOpen, lang) || "Menyu"}
          closeLabel={tx(labels?.menuClose, lang) || "Bağla"}
          buttonClassName={dark ? "text-white" : "text-neutral-950"}
          icon={<MenuIcon className="size-10" />}
          current={activeTarget}
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
    </header>
  );
}
