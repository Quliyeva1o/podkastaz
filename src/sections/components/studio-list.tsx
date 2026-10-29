import { Picture } from "@/components/picture";
import { DecorAccordion } from "@/components/site/decor-accordion";
import { ButtonLink } from "@/components/site/ui";
import { href } from "@/i18n/routes";
import { getMediaItems } from "@/lib/content/queries";
import { getStudioBySlug, listStudios } from "@/lib/studios/queries";
import { tx } from "../helpers";
import type { SectionProps, StudioListData } from "../types";

/**
 * Studiyalar page (Figma "Frame 2095585301" per studio): name + text left, "Dekorlara bax"
 * right, then the studio's decors as an accordion (wide photo + narrow strips).
 */
export async function StudioListSection({ data, lang }: SectionProps<StudioListData>) {
  const studios = await Promise.all((await listStudios()).map((s) => getStudioBySlug(s.slugAz)));
  const list = studios.filter((s) => s !== null);
  const media = await getMediaItems(
    list.flatMap((s) => [s.studio.cover, ...s.decors.map((d) => d.cover)]).filter((id): id is string => Boolean(id)),
  );
  return (
    <section data-section="studioList" className="container-page flex flex-col gap-[5.625rem] px-4 pt-15 desktop:gap-25 desktop:px-15">
      {list.map(({ studio, decors }, si) => {
        const name = tx(studio.name, lang);
        const description = tx(studio.description, lang);
        const items = decors.length
          ? decors.map((d) => ({ id: d.id, name: tx(d.name, lang), description: tx(d.description, lang), image: d.cover }))
          : [{ id: studio.id, name, description: "", image: studio.cover }];
        return (
          <article key={studio.id} id={studio.slugAz} className="reveal flex flex-col gap-10 desktop:gap-7.5">
            <div className="flex flex-col gap-6 desktop:flex-row desktop:items-center desktop:justify-between desktop:gap-10">
              <div className="flex flex-col gap-3 desktop:max-w-[40.375rem]">
                <h2 className="text-24 leading-[1.15] font-semibold tracking-tight desktop:text-32 desktop:leading-[1.05]">{name}</h2>
                {description && (
                  <p className="text-14 leading-[1.5] tracking-tight text-neutral-850 desktop:text-16">{description}</p>
                )}
              </div>
              <ButtonLink
                href={href("studios", lang, studio.slugAz)}
                variant="outline"
                className="h-11 w-full shrink-0 desktop:w-[9.625rem]"
                aria-label={`${tx(data.cta, lang)}: ${name}`}
              >
                {tx(data.cta, lang)}
              </ButtonLink>
            </div>
            <DecorAccordion
              label={name}
              items={items.map((it) => ({
                ...it,
                image: media[it.image ?? ""] && (
                  <Picture
                    media={media[it.image!]}
                    lang={lang}
                    sizes="(min-width: 1024px) 53vw, 100vw"
                    priority={si === 0}
                    // The panel button already carries the decor name.
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                ),
              }))}
            />
          </article>
        );
      })}
    </section>
  );
}
