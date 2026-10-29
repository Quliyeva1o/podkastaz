import { Picture } from "@/components/picture";
import { tx } from "../helpers";
import type { AboutIntroData, SectionProps } from "../types";

/**
 * Haqqımızda intro (Figma "Frame 2095585326"): photo left (644×440, r10), orange heading and
 * text right, vertically centred. Mobile: photo (288×240) above the text.
 */
export function AboutIntroSection({ data, lang, media }: SectionProps<AboutIntroData>) {
  const photo = media[data.image ?? ""];
  return (
    <section data-section="aboutIntro" className="container-page px-4 pt-10 desktop:px-15 desktop:pt-15">
      <div className="flex flex-col gap-6 desktop:flex-row desktop:items-center desktop:gap-10">
        <div className="aspect-[288/240] overflow-hidden rounded-[0.625rem] bg-silver desktop:aspect-[644/440] desktop:w-[48.8%] desktop:shrink-0">
          {photo && (
            <Picture media={photo} lang={lang} sizes="(min-width: 1024px) 45vw, 100vw" priority className="size-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-5 desktop:gap-6">
          <h2 className="text-24 leading-[1.15] font-semibold tracking-tight text-primary-600 desktop:text-32 desktop:leading-[1.05]">
            {tx(data.title, lang)}
          </h2>
          <div className="flex flex-col gap-4 text-16 leading-[1.5] tracking-tight text-neutral-850">
            {tx(data.body, lang)
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
