import { ButtonLink, cx } from "@/components/site/ui";
import { linkHref, tx } from "../helpers";
import type { Align, PageHeaderData, SectionProps } from "../types";

const mobile: Record<Align, string> = { center: "items-center text-center", left: "items-start text-left" };
const desktop: Record<Align, string> = {
  center: "desktop:items-center desktop:text-center",
  left: "desktop:items-start desktop:text-left",
};

/**
 * Inner-page title block (Figma "Frame 1410104272"): H1 (48/600, mobile 28/600), subtitle
 * (20/400, mobile 16/400) and an optional button (Xidmətlər: "Müraciət et"). Figma aligns it
 * differently per page and screen, so both alignments are admin settings.
 */
export function PageHeaderSection({ data, lang }: SectionProps<PageHeaderData>) {
  const subtitle = tx(data.subtitle, lang);
  const suffix = tx(data.headingSuffix, lang);
  const cta = tx(data.cta?.label, lang);
  return (
    <section data-section="pageHeader" className="container-page px-4 pt-8 desktop:px-15 desktop:pt-7.5">
      <div className={cx("flex flex-col gap-4 desktop:gap-5.25", mobile[data.alignMobile] ?? mobile.center, desktop[data.alignDesktop] ?? desktop.center)}>
        <h1 className="text-28 leading-[1.05] font-semibold tracking-tight desktop:text-48">
          {tx(data.title, lang)}
          {/* Figma shows a short title; the hidden rest gives search engines a descriptive H1. */}
          {suffix && <span className="sr-only"> {suffix}</span>}
        </h1>
        {subtitle && <p className="text-16 leading-[1.5] tracking-tight text-neutral-850 desktop:text-20">{subtitle}</p>}
        {cta && (
          <ButtonLink href={linkHref(data.cta, lang)} className="h-10 w-full desktop:h-12.5 desktop:w-[12.25rem]">
            {cta}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}
