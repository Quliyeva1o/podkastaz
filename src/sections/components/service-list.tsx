import { Picture } from "@/components/picture";
import { listPublished } from "@/collections/queries";
import type { ServiceData } from "@/collections/registry";
import { getMediaItems } from "@/lib/content/queries";
import { tx } from "../helpers";
import type { SectionProps, ServiceListData } from "../types";

/**
 * Service cards (Figma "Frame 2095585341"): 4 per row on desktop (307×287, r24, grey border),
 * illustration 120×104 (mobile 96×83), title 20/600, text 14/400, all centred.
 */
export async function ServiceListSection({ lang }: SectionProps<ServiceListData>) {
  const items = await listPublished<ServiceData>("services");
  const media = await getMediaItems(items.map((i) => i.data.cover).filter((id): id is string => Boolean(id)));
  return (
    <section data-section="serviceList" className="container-page px-4 pt-10 desktop:px-15 desktop:pt-15">
      <ul className="grid grid-cols-1 gap-6 tablet:grid-cols-2 tablet:auto-rows-fr desktop:grid-cols-4 desktop:gap-7.5">
        {items.map((item) => {
          const cover = media[item.data.cover ?? ""];
          return (
            <li key={item.id} className="flex flex-col items-center gap-7.5 rounded-3xl border border-neutral-200 bg-white p-[1.5625rem] text-center desktop:min-h-[17.9375rem]">
              <div className="flex h-[5.1875rem] w-24 items-center justify-center desktop:h-26 desktop:w-30">
                {cover && <Picture media={cover} lang={lang} sizes="120px" alt="" className="size-full object-contain" />}
              </div>
              <div className="flex flex-col gap-2.5">
                <h2 className="text-20 leading-[1.32] font-semibold tracking-tight">{tx(item.data.title, lang)}</h2>
                <p className="text-14 leading-[1.5] tracking-tight text-neutral-850">{tx(item.data.description, lang)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
