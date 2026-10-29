import { Picture } from "@/components/picture";
import { ButtonLink, cx } from "@/components/site/ui";
import { href } from "@/i18n/routes";
import { getMediaItems } from "@/lib/content/queries";
import type { Decor, Studio } from "@/lib/studios/queries";
import { tx } from "../helpers";
import type { DecorListData, SectionProps } from "../types";

/**
 * One studio's decors (Figma "Dekorlar"): name + text left, "Rezervasiya et" right (to the
 * booking form with studio and decor chosen), then the gallery — 4×2 on desktop (307×278, r10),
 * the first four photos in one column on mobile.
 */
export async function DecorListSection({ data, lang, studio }: SectionProps<DecorListData> & { studio?: { studio: Studio; decors: Decor[] } }) {
  if (!studio) return null;
  const media = await getMediaItems(studio.decors.flatMap((d) => d.gallery));
  const booking = href("booking", lang);
  return (
    <section data-section="decorList" className="container-page flex flex-col gap-[5.625rem] px-4 pt-15 desktop:gap-25 desktop:px-15">
      {studio.decors.map((decor, di) => {
        const name = tx(decor.name, lang);
        const description = tx(decor.description, lang);
        const photos = decor.gallery.filter((id) => media[id]).slice(0, 8);
        const query = new URLSearchParams({ studiya: studio.studio.slugAz, dekor: decor.slugAz });
        return (
          <article key={decor.id} id={decor.slugAz} className="flex flex-col gap-10 desktop:gap-7.5">
            <div className="flex flex-col gap-6 desktop:flex-row desktop:items-end desktop:justify-between desktop:gap-10">
              <div className="flex flex-col gap-3 desktop:max-w-[50.375rem]">
                <h2 className="text-24 leading-[1.15] font-semibold tracking-tight desktop:text-32 desktop:leading-[1.05]">{name}</h2>
                {description && <p className="text-14 leading-[1.5] tracking-tight text-neutral-850 desktop:text-16">{description}</p>}
              </div>
              <ButtonLink href={`${booking}?${query}`} className="h-11 w-full shrink-0 desktop:w-[9.625rem]" aria-label={`${tx(data.cta, lang)}: ${name}`}>
                {tx(data.cta, lang)}
              </ButtonLink>
            </div>
            {photos.length > 0 && (
              <ul className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4 desktop:gap-7.5">
                {photos.map((id, i) => (
                  <li
                    key={`${id}-${i}`}
                    className={cx(
                      "aspect-[288/278] overflow-hidden rounded-[0.375rem] bg-silver desktop:aspect-[307.4/278.2] desktop:rounded-[0.625rem]",
                      i >= 4 && "hidden tablet:block",
                    )}
                  >
                    <Picture
                      media={media[id]}
                      lang={lang}
                      sizes="(min-width: 1024px) 22vw, (min-width: 768px) 50vw, 100vw"
                      priority={di === 0 && i < 4}
                      className="size-full object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </section>
  );
}
