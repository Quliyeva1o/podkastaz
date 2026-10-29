import { Picture } from "@/components/picture";
import { listPublished } from "@/collections/queries";
import type { PartnerData } from "@/collections/registry";
import { cx } from "@/components/site/ui";
import { getMediaItems } from "@/lib/content/queries";
import { tx } from "../helpers";
import type { PartnersData, SectionProps } from "../types";

/**
 * Partner logos (Figma "Group 3384"): greyed (50%) logos, each at its own height, faded out at
 * both edges. Desktop: one row spread over the content width, as in Figma. Mobile: Figma lets the
 * row run past the screen, so it moves as an endless strip (it simply scrolls for reduced motion).
 */
export async function PartnersSection({ data, lang }: SectionProps<PartnersData>) {
  const items = await listPublished<PartnerData>("partners");
  const media = await getMediaItems(items.map((i) => i.data.cover).filter((id): id is string => Boolean(id)));
  const logos = items.filter((i) => media[i.data.cover ?? ""]);
  if (!logos.length) return null;
  const fallback = Number(data.logoHeight) || 56;

  const row = (copy: number) =>
    logos.map((item) => {
      // Figma heights at 1440; mobile logos are 0.86× (Figma "Mob/Haqqımızda").
      const h = `${(Number(item.data.height) || fallback) / 16}rem`;
      // A fixed box (Figma's crop) when a width is set; the logo sits centred inside it.
      const w = Number(item.data.width) ? `${Number(item.data.width) / 16}rem` : "auto";
      const logo = (
        <Picture
          media={media[item.data.cover!]}
          lang={lang}
          sizes="210px"
          alt={copy ? "" : tx(item.data.title, lang)}
          className={cx(
            "h-[calc(var(--logo-h)*0.86)] w-[calc(var(--logo-w)*0.86)] max-w-none desktop:h-(--logo-h) desktop:w-(--logo-w)",
            // In Figma's box the logo is cropped like Figma crops it (Starbucks, Passage); else whole.
            w === "auto" ? "object-contain" : "object-cover",
          )}
        />
      );
      return (
        <li
          key={`${copy}-${item.id}`}
          aria-hidden={copy ? true : undefined}
          className={cx("flex shrink-0 items-center opacity-50 transition-opacity duration-300 hover:opacity-100", copy > 0 && "desktop:hidden")}
          style={{ "--logo-h": h, "--logo-w": w } as React.CSSProperties}
        >
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
      className="reveal partners-marquee container-page overflow-hidden pt-[5.6875rem] desktop:px-15 desktop:pt-15"
    >
      <ul className="partners-track flex w-max items-center gap-[2.375rem] desktop:w-full desktop:justify-between desktop:gap-0">
        {row(0)}
        {row(1)}
      </ul>
    </section>
  );
}
