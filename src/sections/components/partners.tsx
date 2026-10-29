import { Picture } from "@/components/picture";
import { listPublished } from "@/collections/queries";
import type { PartnerData } from "@/collections/registry";
import { getMediaItems } from "@/lib/content/queries";
import { tx } from "../helpers";
import type { PartnersData, SectionProps } from "../types";

/**
 * Partner logos (Figma "Group 3384"): a row of greyed (50%) logos that fades out at both edges.
 * Figma lets the row run past the screen on mobile, so it is an endless strip (paused for
 * reduced motion, where it simply scrolls).
 */
export async function PartnersSection({ data, lang }: SectionProps<PartnersData>) {
  const items = await listPublished<PartnerData>("partners");
  const media = await getMediaItems(items.map((i) => i.data.cover).filter((id): id is string => Boolean(id)));
  const logos = items.filter((i) => media[i.data.cover ?? ""]);
  if (!logos.length) return null;
  const height = `${(Number(data.logoHeight) || 56) / 16}rem`;

  const row = (copy: number) =>
    logos.map((item) => {
      const logo = (
        <Picture
          media={media[item.data.cover!]}
          lang={lang}
          sizes="210px"
          alt={copy ? "" : tx(item.data.title, lang)}
          className="h-[calc(var(--logo-h)*0.86)] w-auto max-w-[11rem] object-contain desktop:h-(--logo-h) desktop:max-w-[13rem]"
        />
      );
      return (
        <li key={`${copy}-${item.id}`} aria-hidden={copy ? true : undefined} className="flex shrink-0 items-center opacity-50">
          {item.data.url && !copy ? (
            <a href={item.data.url} target="_blank" rel="noopener noreferrer" aria-label={tx(item.data.title, lang)}>
              {logo}
            </a>
          ) : (
            logo
          )}
        </li>
      );
    });

  return (
    <section
      data-section="partners"
      aria-label={tx(data.title, lang) || undefined}
      className="partners-marquee container-page overflow-hidden pt-[5.6875rem] desktop:pt-15"
      style={{ "--logo-h": height } as React.CSSProperties}
    >
      <ul className="partners-track flex w-max items-center gap-[2.375rem] desktop:gap-[5.6rem]">
        {row(0)}
        {row(1)}
      </ul>
    </section>
  );
}
