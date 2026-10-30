import { Check, Sparkle } from "@phosphor-icons/react/ssr";
import { listPublished } from "@/collections/queries";
import type { AddonData, PackageData } from "@/collections/registry";
import { ButtonLink, cx } from "@/components/site/ui";
import { href } from "@/i18n/routes";
import { tx } from "../helpers";
import type { PackageListData, SectionProps } from "../types";

/**
 * Paketlər (Figma "Frame 1410104276" + "ADD-ON XİDMƏTLƏR"): three cards side by side, bottom
 * aligned; the highlighted one wears an orange gradient frame with the "Ən çox seçilən" tab.
 * Below, the add-ons in one row (one column on mobile).
 */
export async function PackageListSection({ data, lang }: SectionProps<PackageListData>) {
  const [packages, addons] = await Promise.all([listPublished<PackageData>("packages"), listPublished<AddonData>("addons")]);
  const currency = tx(data.currency, lang) || "AZN";
  const request = href("packageRequest", lang);

  return (
    <section data-section="packageList" className="container-page flex flex-col gap-10 px-4 pt-7.5 desktop:gap-7.5 desktop:px-15 desktop:pt-15">
      <ul className="grid grid-cols-1 gap-7.5 tablet:grid-cols-2 desktop:grid-cols-3">
        {packages.map((p) => {
          const card = (
            <div className="flex h-full flex-col gap-8 rounded-[0.625rem] border border-neutral-200 bg-white p-[1.1875rem] desktop:rounded-2xl">
              <div className="flex flex-col gap-5 desktop:gap-8">
                <div className="flex flex-col gap-5 desktop:gap-8">
                  <div className="flex flex-col gap-2 desktop:gap-3">
                    <h2 className="text-18 leading-[1.5] font-semibold tracking-tight desktop:text-20 desktop:leading-[1.23]">{tx(p.data.title, lang)}</h2>
                    <p className="text-16 leading-[1.5] tracking-tight text-neutral-850">{tx(p.data.audience, lang)}</p>
                  </div>
                  <p className="flex items-end gap-1.5 desktop:gap-2.75">
                    <span className="text-32 leading-[1.05] font-semibold tracking-tight desktop:text-54">{p.data.price}</span>
                    <span className="text-16 leading-[1.5] tracking-tight desktop:text-20">{currency}</span>
                  </p>
                </div>
                <ButtonLink href={`${request}?paket=${p.slugs[lang]}`} className="h-10" aria-label={`${tx(data.cta, lang)}: ${tx(p.data.title, lang)}`}>
                  {tx(data.cta, lang)}
                </ButtonLink>
              </div>
              <ul className="flex flex-col gap-4 desktop:gap-4.5">
                {p.data.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-14 leading-[1.5] desktop:text-16 desktop:tracking-tight">
                    <Check aria-hidden className="size-5 shrink-0 text-primary-600" />
                    {tx(f.text, lang)}
                  </li>
                ))}
              </ul>
            </div>
          );
          return (
            <li key={p.id} className={cx("reveal transition-[translate] duration-300 ease-out hover:-translate-y-1 [&>*]:transition-shadow [&>*]:duration-300 hover:[&>*]:shadow-[0_1.25rem_2.5rem_-1.5rem_rgb(41_39_38/0.3)]", p.data.highlighted ? "-mx-px -mb-px desktop:-mx-0.5 desktop:-mt-[0.8125rem] desktop:-mb-0.5" : "tablet:pt-12 desktop:pt-[2.1875rem]")}>
              {p.data.highlighted ? (
                // Gradient frame outside the card (Figma stroke: 1px mobile, 2px desktop, 48px on top for the tab);
                // the other cards start below the tab (on desktop Figma lets the tab stick out 13px above the row).
                <div className="flex h-full flex-col rounded-[0.6875rem] bg-linear-to-br from-[#fd5f04] to-[#dd2501] p-px pt-0 desktop:rounded-[1.125rem] desktop:p-0.5 desktop:pt-0">
                  <p className="flex h-12 items-center justify-center gap-1.5 text-16 leading-[1.5] font-semibold tracking-tight text-white">
                    <Sparkle aria-hidden weight="duotone" className="size-[1.375rem]" />
                    {tx(data.highlightLabel, lang)}
                  </p>
                  <div className="flex-1 [&>div]:border-0 [&>div]:p-5">{card}</div>
                </div>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>

      {addons.length > 0 && (
        <div className="reveal flex flex-col gap-5 rounded-[0.625rem] border border-neutral-300 bg-white p-[1.1875rem] desktop:gap-6">
          <h2 className="text-18 leading-[1.37] font-semibold tracking-tight desktop:text-center desktop:text-20 desktop:leading-[1.23]">{tx(data.addonsTitle, lang)}</h2>
          <ul className="flex flex-col gap-6 desktop:grid desktop:grid-flow-col desktop:auto-cols-fr desktop:gap-12.5">
            {addons.map((a) => (
              <li key={a.id} className="flex flex-col gap-2.5">
                <span className="text-16 leading-[1.5] tracking-tight desktop:whitespace-nowrap">{tx(a.data.title, lang)}</span>
                <span className="flex items-end gap-1.5 text-primary-600">
                  {a.data.price ? (
                    <>
                      <span className="text-28 leading-[1.05] font-semibold tracking-tight">+{a.data.price}</span>
                      <span className="text-16 leading-[1.5] tracking-tight">{currency}</span>
                    </>
                  ) : (
                    <span className="text-28 leading-[1.05] font-semibold tracking-tight">{tx(a.data.customPriceLabel, lang)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
