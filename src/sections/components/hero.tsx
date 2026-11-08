import { BackgroundVideo } from "@/components/background-video";
import { Picture } from "@/components/picture";
import { SocialLinks } from "@/components/site/social-links";
import { ButtonLink } from "@/components/site/ui";
import type { Locale } from "@/i18n/config";
import type { MediaItem } from "@/lib/content/queries";
import { linkHref, tx } from "../helpers";
import type { ContactsData, HeroData, SectionProps } from "../types";

/**
 * Home page — one screen (Figma "Home" 1440×900, "Mob/Home Page" 320×574).
 * Desktop: full-screen photo, blurred dark panel on the left with the H1 and two buttons,
 * social buttons bottom right. Mobile: orange gradient, text on top, the photo (the cut-out
 * "Mobil foto" when set, cropped to the speaker) fills the lower part with the social buttons
 * and © over it.
 */
export function HeroSection({ data, lang, media, contacts }: SectionProps<HeroData> & { contacts?: ContactsData }) {
  const bg = media[data.background ?? ""];
  const poster = bg?.mime.startsWith("video/") ? undefined : bg;
  const seo = tx(data.seoHeading, lang);
  return (
    <section
      data-section="hero"
      className="relative flex min-h-dvh flex-col overflow-hidden bg-[linear-gradient(90.2deg,#fc4601_0.13%,#fd5902_99.79%)] text-white desktop:min-h-[max(100dvh,40rem)] desktop:bg-black"
    >
      {/* Mobile: the gradient stays on the screen like the photo, so a scroll or bounce never shows white under it. */}
      <div aria-hidden className="fixed inset-x-0 top-0 h-lvh bg-[linear-gradient(90.2deg,#fc4601_0.13%,#fd5902_99.79%)] desktop:hidden" />
      <Background media={bg} poster={poster} mobile={media[data.mobileImage ?? ""]} lang={lang} />

      {/* Desktop: Figma's panel is 32px padding + the 35px logo (the header draws it) above the centred block. CSS blur = half of Figma's radius (40), here and on every blurred element. */}
      <div className="hero-panel relative flex flex-col gap-5 px-4 pt-22.5 desktop:min-h-[inherit] desktop:w-[44.0625rem] desktop:justify-between desktop:gap-0 desktop:bg-black/14 desktop:px-15 desktop:pt-[4.1875rem] desktop:pb-10 desktop:backdrop-blur-[1.25rem]">
        <div className="flex flex-col gap-5 desktop:my-auto desktop:gap-[3.125rem]">
          <h1 className="hero-in text-32 leading-none font-bold desktop:text-84 desktop:leading-[0.952]">
            {tx(data.title, lang)}
            {seo && <span className="sr-only"> {seo}</span>}
          </h1>
          <p style={{ "--i": 1 } as React.CSSProperties} className="hero-in font-roboto text-16 leading-[1.5] desktop:text-24 desktop:leading-none">{tx(data.subtitle, lang)}</p>
          <div style={{ "--i": 2 } as React.CSSProperties} className="hero-in flex gap-2.5 desktop:gap-5">
            <ButtonLink href={linkHref(data.primary, lang)} variant="white" className="h-10 flex-1 text-14! leading-[1.5]! desktop:h-12 desktop:w-[12.1875rem] desktop:flex-none desktop:text-16!">
              {tx(data.primary.label, lang)}
            </ButtonLink>
            <ButtonLink href={linkHref(data.secondary, lang)} variant="glass" className="h-10 flex-1 text-14! leading-[1.5]! desktop:h-12 desktop:w-[12.1875rem] desktop:flex-none desktop:text-16!">
              {tx(data.secondary.label, lang)}
            </ButtonLink>
          </div>
        </div>
        <p className="hero-fade hidden font-roboto text-16 leading-none desktop:block">{tx(contacts?.copyright, lang)}</p>
      </div>

      <div className="hero-fade relative mt-auto flex flex-col gap-4 px-4 pb-5 desktop:absolute desktop:right-15 desktop:bottom-10 desktop:p-0">
        <SocialLinks socials={contacts?.socials ?? []} />
        <p className="font-roboto text-14 leading-none desktop:hidden">{tx(contacts?.copyright, lang)}</p>
      </div>
    </section>
  );
}

function Background({ media, poster, mobile, lang }: { media?: MediaItem; poster?: MediaItem; mobile?: MediaItem; lang: Locale }) {
  if (!media) return null;
  return (
    // Mobile: the lower 325/574 of the screen, cropped like Figma (x 27–88% of the photo), fixed to
    // the screen's bottom so it stays there while iOS Safari bounces or resizes the page.
    // Under the text by order: the panel and the bottom block after it are positioned too.
    <div aria-hidden className="hero-zoom fixed inset-x-0 bottom-0 h-[56.6dvh] desktop:absolute desktop:inset-0 desktop:h-auto">
      {poster && (
        <Picture media={poster} mobile={mobile} lang={lang} sizes="100vw" priority alt="" className="size-full object-cover object-[70%_center] desktop:object-center" />
      )}
      {media.mime.startsWith("video/") && <BackgroundVideo media={media} className="absolute inset-0 size-full object-cover" />}
    </div>
  );
}
