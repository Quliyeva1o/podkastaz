import type { Icon } from "@phosphor-icons/react";
import { Alarm, CheckCircle, Headphones, MapPinArea, Microphone, Rocket, Star, VideoCamera } from "@phosphor-icons/react/ssr";
import { Picture } from "@/components/picture";
import { cx } from "@/components/site/ui";
import { tx } from "../helpers";
import type { AdvantagesData, SectionProps } from "../types";

const icons: Record<AdvantagesData["items"][number]["icon"], Icon> = {
  VideoCamera,
  Alarm,
  Rocket,
  MapPinArea,
  Microphone,
  Headphones,
  Star,
  CheckCircle,
};

/**
 * "4K Keyfiyyət / Çevik Rezervasiya / …" cards (Figma "Frame 1410104241"), shared by
 * Haqqımızda and Xidmətlər: 4 in a row (308×253, r16), orange ones on the gradient photo, white
 * ones with a grey border; one per row on mobile. Xidmətlər shows the heading above them.
 */
export function AdvantagesSection({ data, lang, media, variant }: SectionProps<AdvantagesData> & { variant?: string }) {
  const bg = media[data.background ?? ""];
  const title = variant === "plain" ? "" : tx(data.title, lang);
  return (
    <section data-section="advantages" className="container-page px-4 pt-[5.625rem] desktop:px-15 desktop:pt-25">
      {title && (
        <h2 className="mb-7.5 text-center text-20 leading-[1.32] font-semibold tracking-tight desktop:mb-10 desktop:text-32 desktop:leading-[1.05]">{title}</h2>
      )}
      <ul className="grid grid-cols-1 gap-6 tablet:grid-cols-2 desktop:grid-cols-4 desktop:gap-[1.8125rem]">
        {data.items.map((item, i) => {
          const Glyph = icons[item.icon] ?? CheckCircle;
          return (
            <li
              key={i}
              className={cx(
                // px 16 (Figma 20): the browser sets Inter a hair wider, and "Kristal təmiz, …" must stay on one line.
                "relative isolate flex min-h-[15.8rem] flex-col items-center gap-7.5 overflow-hidden rounded-2xl px-5 py-7.5 text-center desktop:px-4",
                item.accent ? "bg-primary-600 text-white" : "border border-neutral-300 bg-white",
              )}
            >
              {item.accent && bg && (
                <span aria-hidden className="absolute inset-0 -z-10">
                  <Picture media={bg} lang={lang} sizes="(min-width: 1024px) 22vw, 100vw" alt="" className="size-full object-cover" />
                </span>
              )}
              <Glyph aria-hidden weight="duotone" className={cx("size-25 shrink-0", !item.accent && "text-primary-600")} />
              <div className="flex flex-col gap-2.5">
                <h3 className="text-24 leading-[1.15] font-semibold tracking-tight">{tx(item.title, lang)}</h3>
                <p className={cx("text-16 leading-[1.5] tracking-tight", !item.accent && "text-neutral-850")}>{tx(item.text, lang)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
