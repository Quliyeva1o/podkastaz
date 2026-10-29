import { tx } from "../helpers";
import type { LegalData, SectionProps } from "../types";

/** Terms of use / Privacy policy body (Figma: 16/24 paragraphs, 16px apart, under the title). */
export function LegalSection({ data, lang }: SectionProps<LegalData>) {
  return (
    <section data-section="legal" className="container-page px-4 pt-4 desktop:px-15 desktop:pt-8">
      <div className="flex flex-col gap-4 text-16 leading-[1.5] tracking-tight text-neutral-850">
        {data.blocks.map((block, i) => (
          <div key={i} className="flex flex-col gap-4">
            {tx(block.title, lang) && <h2 className="text-20 leading-[1.5] font-semibold text-neutral-950">{tx(block.title, lang)}</h2>}
            {tx(block.body, lang)
              .split(/\n\s*\n/)
              .map((p, j) => (
                <p key={j}>{p}</p>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
