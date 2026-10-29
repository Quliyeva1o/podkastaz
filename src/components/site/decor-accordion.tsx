"use client";

import { useState, type ReactNode } from "react";
import { cx } from "./ui";

export type AccordionItem = { id: string; name: string; description: string; image: ReactNode };

/**
 * A studio's decors on the Studiyalar page (Figma "Frame 2095585300"): the open decor is the
 * wide photo with its name and text on a blurred card, the others are narrow strips beside it
 * (desktop) or below it (mobile). Hover (desktop) or tap opens another decor.
 */
export function DecorAccordion({ items, label }: { items: AccordionItem[]; label: string }) {
  const [open, setOpen] = useState(0);
  return (
    <ul aria-label={label} className="flex flex-col gap-5 desktop:h-[29.05rem] desktop:flex-row desktop:gap-0">
      {items.map((item, i) => {
        const active = i === open;
        return (
          <li
            key={item.id}
            onMouseEnter={() => setOpen(i)}
            className={cx(
              "decor-panel relative overflow-hidden bg-silver",
              active ? "h-[27rem] desktop:h-auto desktop:flex-[760_1_0]" : "h-36 desktop:h-auto desktop:flex-[186.7_1_0]",
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-expanded={active}
              aria-label={item.name}
              className="absolute inset-0 z-10 size-full cursor-pointer disabled:cursor-default"
              disabled={active}
            />
            {item.image}
            <div
              aria-hidden={!active}
              className={cx(
                "absolute inset-x-3 bottom-3 flex flex-col gap-3.5 rounded-[0.375rem] bg-[#222]/24 p-4 text-white backdrop-blur-[4.5rem] transition-opacity duration-300 desktop:right-4.5 desktop:bottom-4.5 desktop:left-4",
                active ? "opacity-100 delay-150" : "pointer-events-none opacity-0",
              )}
            >
              <p className="text-18 leading-[1.15] font-semibold tracking-tight desktop:text-24">{item.name}</p>
              {item.description && <p className="text-14 leading-[1.5] tracking-tight">{item.description}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
