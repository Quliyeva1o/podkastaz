import type { ContactsData } from "@/sections/types";
import { SocialIcon } from "./icons";
import { cx } from "./ui";

const names = { facebook: "Facebook", linkedin: "LinkedIn", instagram: "Instagram", youtube: "YouTube", whatsapp: "WhatsApp", x: "X" };

/** Round glass social buttons (Figma "Frame 128": 40px, white 24% + background blur). */
export function SocialLinks({
  socials,
  className,
  itemClassName,
  iconClassName,
}: {
  socials: ContactsData["socials"];
  className?: string;
  itemClassName?: string;
  iconClassName?: string;
}) {
  const items = socials.filter((s) => s.url);
  if (!items.length) return null;
  return (
    <ul className={cx("flex gap-2.5 desktop:gap-3", className)}>
      {items.map((s) => (
        <li key={s.network + s.url}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={names[s.network]}
            className={cx(
              "flex size-[2.39rem] items-center justify-center rounded-full backdrop-blur-[2.7rem] transition-[background-color,border-color,color,translate] duration-200 hover:-translate-y-0.5 desktop:size-10",
              itemClassName ?? "bg-white/16 text-white hover:bg-white/30 desktop:bg-white/24",
            )}
          >
            <SocialIcon network={s.network} className={cx("size-[1.3rem] desktop:size-[1.3625rem]", iconClassName)} />
          </a>
        </li>
      ))}
    </ul>
  );
}
